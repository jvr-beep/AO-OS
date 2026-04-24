import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { FolioPaymentStatus, PaymentTransactionType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AddFolioLineItemDto } from "../dto/add-folio-line-item.dto";
import { CreateFolioDto } from "../dto/create-folio.dto";
import { RecordPaymentDto } from "../dto/record-payment.dto";

const SUCCESS_PAYMENT_STATUSES = new Set(["succeeded", "captured", "paid", "settled", "success"]);
const REFUND_TYPES = new Set<PaymentTransactionType>(["refund", "void"]);

@Injectable()
export class FoliosService {
  constructor(private readonly prisma: PrismaService) {}

  async createFolio(dto: CreateFolioDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id: dto.visit_id } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    const existing = await this.prisma.folio.findUnique({ where: { visitId: dto.visit_id } });
    if (existing) {
      throw new ConflictException("Folio already exists for this visit");
    }

    const created = await this.prisma.folio.create({
      data: {
        visitId: dto.visit_id,
        paymentStatus: "unpaid",
        subtotalCents: 0,
        taxesCents: 0,
        feesCents: 0,
        wristbandChargeCents: 0,
        addOnTotalCents: 0,
        discountsCents: 0,
        totalDueCents: 0,
        amountPaidCents: 0,
        balanceDueCents: 0
      },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        paymentTransactions: { orderBy: { createdAt: "asc" } }
      }
    });

    return this.toResponse(created);
  }

  async getFolio(folioId: string) {
    const folio = await this.prisma.folio.findUnique({
      where: { id: folioId },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        paymentTransactions: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!folio) {
      throw new NotFoundException("Folio not found");
    }

    return this.toResponse(folio);
  }

  async getFolioByVisit(visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    const folio = await this.prisma.folio.findUnique({
      where: { visitId },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        paymentTransactions: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!folio) {
      throw new NotFoundException("Folio not found for visit");
    }

    return this.toResponse(folio);
  }

  async addLineItem(folioId: string, dto: AddFolioLineItemDto) {
    if (!dto.description?.trim()) {
      throw new BadRequestException("description is required");
    }

    if (dto.unit_amount_cents < 0) {
      throw new BadRequestException("unit_amount_cents must be >= 0");
    }

    const folio = await this.prisma.folio.findUnique({ where: { id: folioId } });
    if (!folio) {
      throw new NotFoundException("Folio not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.folioLineItem.create({
        data: {
          folioId,
          lineType: dto.line_type,
          referenceCode: dto.reference_code ?? null,
          description: dto.description,
          quantity: dto.quantity,
          unitAmountCents: dto.unit_amount_cents,
          totalAmountCents: dto.quantity * dto.unit_amount_cents,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue
        }
      });

      await this.recalculateFolioAndSyncVisitPaymentStatus(tx, folioId);
    });

    return this.getFolio(folioId);
  }

  async recordPayment(folioId: string, dto: RecordPaymentDto) {
    const folio = await this.prisma.folio.findUnique({ where: { id: folioId } });
    if (!folio) {
      throw new NotFoundException("Folio not found");
    }

    const normalizedStatus = dto.status.trim().toLowerCase();

    await this.prisma.$transaction(async (tx) => {
      if (dto.idempotency_key) {
        const existing = await tx.paymentTransaction.findUnique({
          where: { idempotencyKey: dto.idempotency_key }
        });

        if (existing) {
          if (existing.folioId !== folioId) {
            throw new ConflictException("idempotency_key already used for a different folio");
          }
          return;
        }
      }

      await tx.paymentTransaction.create({
        data: {
          folioId,
          visitId: folio.visitId,
          paymentProvider: dto.payment_provider,
          providerPaymentIntentId: dto.provider_payment_intent_id ?? null,
          transactionType: dto.transaction_type,
          amountCents: dto.amount_cents,
          status: normalizedStatus,
          cardBrand: dto.card_brand ?? null,
          cardLast4: dto.card_last4 ?? null,
          idempotencyKey: dto.idempotency_key ?? null,
          providerResponse:
            dto.provider_response === undefined
              ? undefined
              : ((dto.provider_response as Prisma.InputJsonValue) ?? Prisma.JsonNull)
        }
      });

      await this.recalculateFolioAndSyncVisitPaymentStatus(tx, folioId);
    });

    return this.getFolio(folioId);
  }

  async applyWristbandCharge(
    tx: Prisma.TransactionClient,
    visitId: string,
    deltaAmountCents: number
  ): Promise<void> {
    const folio = await tx.folio.findUnique({ where: { visitId } });
    if (!folio) return;

    await tx.folio.update({
      where: { id: folio.id },
      data: { wristbandChargeCents: Math.max(0, folio.wristbandChargeCents + deltaAmountCents) }
    });

    await this.recalculateFolioAndSyncVisitPaymentStatus(tx, folio.id);
  }

  private async recalculateFolioAndSyncVisitPaymentStatus(
    tx: Prisma.TransactionClient,
    folioId: string
  ): Promise<void> {
    const folio = await tx.folio.findUnique({
      where: { id: folioId },
      include: {
        lineItems: true,
        paymentTransactions: true
      }
    });

    if (!folio) {
      throw new NotFoundException("Folio not found");
    }

    const subtotalCents = folio.lineItems.reduce((sum, item) => sum + item.totalAmountCents, 0);
    const addOnTotalCents = folio.lineItems
      .filter((item) => item.lineType.toLowerCase() === "add_on")
      .reduce((sum, item) => sum + item.totalAmountCents, 0);

    let paymentNetCents = 0;
    for (const transaction of folio.paymentTransactions) {
      const isSuccessful = SUCCESS_PAYMENT_STATUSES.has(transaction.status.toLowerCase());
      if (!isSuccessful) {
        continue;
      }

      if (REFUND_TYPES.has(transaction.transactionType)) {
        paymentNetCents -= transaction.amountCents;
      } else {
        paymentNetCents += transaction.amountCents;
      }
    }

    const totalDueCents =
      subtotalCents +
      folio.taxesCents +
      folio.feesCents +
      folio.wristbandChargeCents +
      folio.addOnTotalCents -
      folio.discountsCents;

    const amountPaidCents = Math.max(0, paymentNetCents);
    const balanceDueCents = Math.max(0, totalDueCents - amountPaidCents);

    const paymentStatus: FolioPaymentStatus = this.computePaymentStatus(totalDueCents, amountPaidCents);

    await tx.folio.update({
      where: { id: folioId },
      data: {
        subtotalCents,
        addOnTotalCents,
        totalDueCents,
        amountPaidCents,
        balanceDueCents,
        paymentStatus,
        version: { increment: 1 }
      }
    });

    await tx.visit.update({
      where: { id: folio.visitId },
      data: {
        paymentStatus
      }
    });
  }

  private computePaymentStatus(totalDueCents: number, amountPaidCents: number): FolioPaymentStatus {
    if (amountPaidCents <= 0) {
      return "unpaid";
    }

    if (totalDueCents > 0 && amountPaidCents < totalDueCents) {
      return "partially_paid";
    }

    return "paid";
  }

  private toResponse(folio: {
    id: string;
    visitId: string;
    subtotalCents: number;
    taxesCents: number;
    feesCents: number;
    wristbandChargeCents: number;
    addOnTotalCents: number;
    discountsCents: number;
    totalDueCents: number;
    amountPaidCents: number;
    balanceDueCents: number;
    paymentStatus: FolioPaymentStatus;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    lineItems: Array<{
      id: string;
      lineType: string;
      referenceCode: string | null;
      description: string;
      quantity: number;
      unitAmountCents: number;
      totalAmountCents: number;
      metadata: unknown;
      createdAt: Date;
    }>;
    paymentTransactions: Array<{
      id: string;
      paymentProvider: string;
      providerPaymentIntentId: string | null;
      transactionType: PaymentTransactionType;
      amountCents: number;
      status: string;
      cardBrand: string | null;
      cardLast4: string | null;
      idempotencyKey: string | null;
      providerResponse: unknown;
      createdAt: Date;
    }>;
  }) {
    return {
      id: folio.id,
      visit_id: folio.visitId,
      subtotal_cents: folio.subtotalCents,
      taxes_cents: folio.taxesCents,
      fees_cents: folio.feesCents,
      wristband_charge_cents: folio.wristbandChargeCents,
      add_on_total_cents: folio.addOnTotalCents,
      discounts_cents: folio.discountsCents,
      total_due_cents: folio.totalDueCents,
      amount_paid_cents: folio.amountPaidCents,
      balance_due_cents: folio.balanceDueCents,
      payment_status: folio.paymentStatus,
      version: folio.version,
      created_at: folio.createdAt.toISOString(),
      updated_at: folio.updatedAt.toISOString(),
      line_items: folio.lineItems.map((item) => ({
        id: item.id,
        line_type: item.lineType,
        reference_code: item.referenceCode,
        description: item.description,
        quantity: item.quantity,
        unit_amount_cents: item.unitAmountCents,
        total_amount_cents: item.totalAmountCents,
        metadata: item.metadata,
        created_at: item.createdAt.toISOString()
      })),
      payment_transactions: folio.paymentTransactions.map((transaction) => ({
        id: transaction.id,
        payment_provider: transaction.paymentProvider,
        provider_payment_intent_id: transaction.providerPaymentIntentId,
        transaction_type: transaction.transactionType,
        amount_cents: transaction.amountCents,
        status: transaction.status,
        card_brand: transaction.cardBrand,
        card_last4: transaction.cardLast4,
        idempotency_key: transaction.idempotencyKey,
        provider_response: transaction.providerResponse,
        created_at: transaction.createdAt.toISOString()
      }))
    };
  }
}
