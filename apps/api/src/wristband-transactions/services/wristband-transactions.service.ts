import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  MemberStatus,
  WristbandStatus,
  WristbandTransactionStatus,
  WristbandTransactionType
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWristbandTransactionDto } from "../dto/create-wristband-transaction.dto";
import { ListWristbandTransactionsQueryDto } from "../dto/list-wristband-transactions.query.dto";
import { WristbandTransactionResponseDto } from "../dto/wristband-transaction.response.dto";

@Injectable()
export class WristbandTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWristbandTransactionDto): Promise<WristbandTransactionResponseDto> {
    this.ensureValidAmount(input.transactionType, input.amount);

    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.wristbandId } });
    if (!wristband) {
      throw new NotFoundException("WRISTBAND_NOT_FOUND");
    }

    if (!this.isWristbandAccessEligible(wristband.status)) {
      throw new ConflictException("WRISTBAND_NOT_ACTIVE");
    }

    const activeAssignment = await this.prisma.wristbandAssignment.findFirst({
      where: {
        wristbandId: input.wristbandId,
        active: true
      },
      include: {
        member: true
      }
    });

    if (!activeAssignment) {
      throw new ConflictException("NO_ACTIVE_WRISTBAND_ASSIGNMENT");
    }

    if (activeAssignment.member.status !== MemberStatus.active) {
      throw new ConflictException("MEMBER_NOT_ACTIVE");
    }

    const created = await this.prisma.wristbandTransaction.create({
      data: {
        memberId: activeAssignment.memberId,
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

  async list(query: ListWristbandTransactionsQueryDto): Promise<WristbandTransactionResponseDto[]> {
    const where = this.buildListWhere(query);
    const take = this.parseLimit(query.limit);

    const rows = await this.prisma.wristbandTransaction.findMany({
      where,
      take,
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toResponse(row));
  }

  async listForMember(
    memberId: string,
    query: ListWristbandTransactionsQueryDto
  ): Promise<WristbandTransactionResponseDto[]> {
    const where = this.buildListWhere(query);
    const take = this.parseLimit(query.limit);

    const rows = await this.prisma.wristbandTransaction.findMany({
      where: {
        ...where,
        memberId
      },
      take,
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

  private buildListWhere(query: ListWristbandTransactionsQueryDto): {
    memberId?: string;
    wristbandId?: string;
    transactionType?: WristbandTransactionType;
    merchantType?: string;
    status?: WristbandTransactionStatus;
    occurredAt?: { gte?: Date; lte?: Date };
  } {
    const startDate = this.parseDate(query.startDate, "INVALID_START_DATE");
    const endDate = this.parseDate(query.endDate, "INVALID_END_DATE");

    const where: {
      memberId?: string;
      wristbandId?: string;
      transactionType?: WristbandTransactionType;
      merchantType?: string;
      status?: WristbandTransactionStatus;
      occurredAt?: { gte?: Date; lte?: Date };
    } = {};

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.wristbandId) {
      where.wristbandId = query.wristbandId;
    }

    if (query.transactionType) {
      where.transactionType = this.parseTransactionTypeFilter(query.transactionType);
    }

    if (query.merchantType) {
      where.merchantType = query.merchantType;
    }

    if (query.status) {
      where.status = this.parseStatusFilter(query.status);
    }

    if (startDate || endDate) {
      where.occurredAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      };
    }

    return where;
  }

  private parseDate(input: string | undefined, errorCode: "INVALID_START_DATE" | "INVALID_END_DATE"): Date | undefined {
    if (!input) {
      return undefined;
    }

    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(errorCode);
    }

    return parsed;
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

  private parseTransactionTypeFilter(input: string): WristbandTransactionType {
    if (input === "purchase" || input === "adjustment" || input === "refund") {
      return input;
    }

    throw new BadRequestException("INVALID_TRANSACTION_TYPE");
  }

  private parseStatusFilter(input: string): WristbandTransactionStatus {
    if (input === "pending" || input === "completed" || input === "failed") {
      return input;
    }

    throw new BadRequestException("INVALID_TRANSACTION_STATUS");
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

  private ensureValidAmount(
    transactionType: CreateWristbandTransactionDto["transactionType"],
    amount: number
  ): void {
    if (!Number.isFinite(amount)) {
      throw new BadRequestException("INVALID_TRANSACTION_AMOUNT");
    }

    if (transactionType === "purchase" && amount <= 0) {
      throw new BadRequestException("INVALID_TRANSACTION_AMOUNT");
    }
  }

  private isWristbandAccessEligible(status: WristbandStatus): boolean {
    return status === WristbandStatus.assigned || status === WristbandStatus.active;
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
