import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  MemberAccountEntryStatus,
  MemberAccountEntryType,
  MemberAccountSourceType,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMemberPaymentDto } from "../dto/create-member-payment.dto";
import { ListMemberAccountEntriesQueryDto } from "../dto/list-member-account-entries.query.dto";
import { MemberAccountEntryResponseDto } from "../dto/member-account-entry.response.dto";
import { MemberAccountSummaryResponseDto } from "../dto/member-account-summary.response.dto";

@Injectable()
export class MemberAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(
    memberId: string,
    input: CreateMemberPaymentDto
  ): Promise<MemberAccountEntryResponseDto> {
    await this.ensureMemberExists(memberId);

    this.ensureValidAmount(input.amount);

    const created = await this.prisma.memberAccountEntry.create({
      data: {
        memberId,
        entryType: "payment",
        amount: input.amount,
        currency: input.currency,
        description: input.description ?? null,
        status: "posted",
        sourceType: "manual_payment",
        sourceReference: input.sourceReference ?? null,
        occurredAt: this.parseDate(input.occurredAt, "INVALID_OCCURRED_AT")
      }
    });

    return this.toEntryResponse(created);
  }

  async getAccount(memberId: string): Promise<MemberAccountSummaryResponseDto> {
    await this.ensureMemberExists(memberId);

    const rows = await this.prisma.memberAccountEntry.findMany({
      where: {
        memberId,
        status: "posted"
      },
      orderBy: { occurredAt: "desc" }
    });

    let chargeTotal = new Prisma.Decimal(0);
    let creditTotal = new Prisma.Decimal(0);
    let paymentTotal = new Prisma.Decimal(0);
    let refundTotal = new Prisma.Decimal(0);

    for (const row of rows) {
      if (row.entryType === "charge") {
        chargeTotal = chargeTotal.plus(row.amount);
      }

      if (row.entryType === "credit") {
        creditTotal = creditTotal.plus(row.amount);
      }

      if (row.entryType === "payment") {
        paymentTotal = paymentTotal.plus(row.amount);
      }

      if (row.entryType === "refund") {
        refundTotal = refundTotal.plus(row.amount);
      }
    }

    const balance = chargeTotal.minus(creditTotal).minus(paymentTotal).minus(refundTotal);

    return {
      memberId,
      currency: rows[0]?.currency ?? "USD",
      balance: balance.toFixed(2),
      postedChargeTotal: chargeTotal.toFixed(2),
      postedCreditTotal: creditTotal.toFixed(2),
      postedPaymentTotal: paymentTotal.toFixed(2),
      postedRefundTotal: refundTotal.toFixed(2)
    };
  }

  async listEntries(
    memberId: string,
    query: ListMemberAccountEntriesQueryDto
  ): Promise<MemberAccountEntryResponseDto[]> {
    await this.ensureMemberExists(memberId);

    const where = this.buildListWhere(memberId, query);
    const take = this.parseLimit(query.limit);

    const rows = await this.prisma.memberAccountEntry.findMany({
      where,
      take,
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toEntryResponse(row));
  }

  private async ensureMemberExists(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }
  }

  private ensureValidAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("INVALID_PAYMENT_AMOUNT");
    }
  }

  private buildListWhere(
    memberId: string,
    query: ListMemberAccountEntriesQueryDto
  ): {
    memberId: string;
    entryType?: MemberAccountEntryType;
    status?: MemberAccountEntryStatus;
    sourceType?: MemberAccountSourceType;
    occurredAt?: { gte?: Date; lte?: Date };
  } {
    const startDate = this.parseOptionalDate(query.startDate, "INVALID_START_DATE");
    const endDate = this.parseOptionalDate(query.endDate, "INVALID_END_DATE");

    const where: {
      memberId: string;
      entryType?: MemberAccountEntryType;
      status?: MemberAccountEntryStatus;
      sourceType?: MemberAccountSourceType;
      occurredAt?: { gte?: Date; lte?: Date };
    } = {
      memberId
    };

    if (query.entryType) {
      where.entryType = this.parseEntryType(query.entryType);
    }

    if (query.status) {
      where.status = this.parseEntryStatus(query.status);
    }

    if (query.sourceType) {
      where.sourceType = this.parseSourceType(query.sourceType);
    }

    if (startDate || endDate) {
      where.occurredAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      };
    }

    return where;
  }

  private parseDate(value: string, errorCode: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(errorCode);
    }

    return parsed;
  }

  private parseOptionalDate(value: string | undefined, errorCode: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    return this.parseDate(value, errorCode);
  }

  private parseLimit(input: string | undefined): number | undefined {
    if (!input) {
      return undefined;
    }

    const parsed = Number.parseInt(input, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException("INVALID_LIMIT");
    }

    return Math.min(parsed, 200);
  }

  private parseEntryType(input: string): MemberAccountEntryType {
    if (input === "charge" || input === "credit" || input === "refund" || input === "payment") {
      return input;
    }

    throw new BadRequestException("INVALID_ENTRY_TYPE");
  }

  private parseEntryStatus(input: string): MemberAccountEntryStatus {
    if (input === "posted" || input === "voided") {
      return input;
    }

    throw new BadRequestException("INVALID_ENTRY_STATUS");
  }

  private parseSourceType(input: string): MemberAccountSourceType {
    if (
      input === "wristband_transaction" ||
      input === "manual_adjustment" ||
      input === "manual_payment" ||
      input === "refund" ||
      input === "membership" ||
      input === "locker_fee"
    ) {
      return input;
    }

    throw new BadRequestException("INVALID_SOURCE_TYPE");
  }

  private toEntryResponse(row: {
    id: string;
    memberId: string;
    entryType: MemberAccountEntryType;
    amount: { toString: () => string };
    currency: string;
    description: string | null;
    status: MemberAccountEntryStatus;
    sourceType: MemberAccountSourceType;
    sourceReference: string | null;
    occurredAt: Date;
    createdAt: Date;
  }): MemberAccountEntryResponseDto {
    return {
      id: row.id,
      memberId: row.memberId,
      entryType: row.entryType,
      amount: row.amount.toString(),
      currency: row.currency,
      description: row.description ?? undefined,
      status: row.status,
      sourceType: row.sourceType,
      sourceReference: row.sourceReference ?? undefined,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: row.createdAt.toISOString()
    };
  }
}