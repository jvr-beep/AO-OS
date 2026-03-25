import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  WristbandTransactionStatus,
  WristbandTransactionType
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWristbandTransactionDto } from "../dto/create-wristband-transaction.dto";
import { WristbandTransactionResponseDto } from "../dto/wristband-transaction.response.dto";

@Injectable()
export class WristbandTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWristbandTransactionDto): Promise<WristbandTransactionResponseDto> {
    this.ensureValidAmount(input.amount);

    const member = await this.prisma.member.findUnique({ where: { id: input.memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }

    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.wristbandId } });
    if (!wristband) {
      throw new NotFoundException("WRISTBAND_NOT_FOUND");
    }

    const created = await this.prisma.wristbandTransaction.create({
      data: {
        memberId: input.memberId,
        wristbandId: input.wristbandId,
        transactionType: this.toTransactionType(input.transactionType),
        merchantType: input.merchantType,
        amount: input.amount,
        currency: input.currency,
        description: input.description ?? null,
        sourceReference: input.sourceReference ?? null,
        status: this.toTransactionStatus(input.status),
        occurredAt: new Date(input.occurredAt)
      }
    });

    return this.toResponse(created);
  }

  async list(): Promise<WristbandTransactionResponseDto[]> {
    const rows = await this.prisma.wristbandTransaction.findMany({
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toResponse(row));
  }

  async listForMember(memberId: string): Promise<WristbandTransactionResponseDto[]> {
    const rows = await this.prisma.wristbandTransaction.findMany({
      where: { memberId },
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toResponse(row));
  }

  private toTransactionType(input: CreateWristbandTransactionDto["transactionType"]): WristbandTransactionType {
    if (input === "purchase" || input === "adjustment" || input === "refund") {
      return input;
    }

    throw new BadRequestException("INVALID_TRANSACTION_TYPE");
  }

  private toTransactionStatus(input: CreateWristbandTransactionDto["status"]): WristbandTransactionStatus {
    if (!input) {
      return "completed";
    }

    if (input === "pending" || input === "completed" || input === "failed") {
      return input;
    }

    throw new BadRequestException("INVALID_TRANSACTION_STATUS");
  }

  private ensureValidAmount(amount: number): void {
    if (!Number.isFinite(amount)) {
      throw new BadRequestException("INVALID_AMOUNT");
    }
  }

  private toResponse(row: {
    id: string;
    memberId: string;
    wristbandId: string;
    transactionType: WristbandTransactionType;
    merchantType: string;
    amount: { toString: () => string };
    currency: string;
    description: string | null;
    sourceReference: string | null;
    status: WristbandTransactionStatus;
    occurredAt: Date;
    createdAt: Date;
  }): WristbandTransactionResponseDto {
    return {
      id: row.id,
      memberId: row.memberId,
      wristbandId: row.wristbandId,
      transactionType: row.transactionType,
      merchantType: row.merchantType,
      amount: row.amount.toString(),
      currency: row.currency,
      description: row.description ?? undefined,
      sourceReference: row.sourceReference ?? undefined,
      status: row.status,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: row.createdAt.toISOString()
    };
  }
}
