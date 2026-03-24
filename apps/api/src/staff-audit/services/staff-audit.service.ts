import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { StaffAuditEventResponseDto } from "../dto/staff-audit-event.response.dto";

export type StaffAuditActor = {
  id: string;
  email: string;
  role: string;
};

export type StaffAuditWriteInput = {
  eventType: string;
  actor: StaffAuditActor;
  targetStaffUserId?: string;
  targetEmailSnapshot?: string;
  outcome: "success" | "blocked" | "failed";
  reasonCode?: string;
  metadataJson?: Record<string, unknown>;
};

type StaffAuditQuery = {
  actorStaffUserId?: string;
  targetStaffUserId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

@Injectable()
export class StaffAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: StaffAuditWriteInput): Promise<void> {
    await (this.prisma as any).$executeRawUnsafe(
      `INSERT INTO "StaffAuditEvent" (
        "id",
        "eventType",
        "actorStaffUserId",
        "actorEmailSnapshot",
        "actorRoleSnapshot",
        "targetStaffUserId",
        "targetEmailSnapshot",
        "outcome",
        "reasonCode",
        "metadataJson"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      randomUUID(),
      input.eventType,
      input.actor.id,
      input.actor.email,
      input.actor.role,
      input.targetStaffUserId ?? null,
      input.targetEmailSnapshot ?? null,
      input.outcome,
      input.reasonCode ?? null,
      JSON.stringify(input.metadataJson ?? null)
    );
  }

  async list(query: StaffAuditQuery): Promise<StaffAuditEventResponseDto[]> {
    const filters: string[] = [];
    const values: unknown[] = [];

    if (query.actorStaffUserId) {
      values.push(query.actorStaffUserId);
      filters.push(`"actorStaffUserId" = $${values.length}`);
    }

    if (query.targetStaffUserId) {
      values.push(query.targetStaffUserId);
      filters.push(`"targetStaffUserId" = $${values.length}`);
    }

    if (query.action) {
      values.push(query.action);
      filters.push(`"eventType" = $${values.length}`);
    }

    const startDate = this.parseIsoDate(query.startDate, "INVALID_START_DATE");
    if (startDate) {
      values.push(startDate);
      filters.push(`"occurredAt" >= $${values.length}`);
    }

    const endDate = this.parseIsoDate(query.endDate, "INVALID_END_DATE");
    if (endDate) {
      values.push(endDate);
      filters.push(`"occurredAt" <= $${values.length}`);
    }

    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException("INVALID_DATE_RANGE");
    }

    const limit = this.parseLimit(query.limit);
    values.push(limit);

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = (await (this.prisma as any).$queryRawUnsafe(
      `SELECT
        "id",
        "eventType",
        "occurredAt",
        "actorStaffUserId",
        "actorEmailSnapshot",
        "actorRoleSnapshot",
        "targetStaffUserId",
        "targetEmailSnapshot",
        "outcome",
        "reasonCode",
        "metadataJson"
      FROM "StaffAuditEvent"
      ${whereSql}
      ORDER BY "occurredAt" DESC
      LIMIT $${values.length}`,
      ...values
    )) as any[];

    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      occurredAt: new Date(row.occurredAt).toISOString(),
      actorStaffUserId: row.actorStaffUserId,
      actorEmailSnapshot: row.actorEmailSnapshot,
      actorRoleSnapshot: row.actorRoleSnapshot,
      targetStaffUserId: row.targetStaffUserId ?? undefined,
      targetEmailSnapshot: row.targetEmailSnapshot ?? undefined,
      outcome: row.outcome,
      reasonCode: row.reasonCode ?? undefined,
      metadataJson: row.metadataJson ?? undefined
    }));
  }

  private parseLimit(limit?: number): number {
    if (typeof limit === "undefined") {
      return 50;
    }

    if (!Number.isFinite(limit) || !Number.isInteger(limit)) {
      throw new BadRequestException("INVALID_LIMIT");
    }

    return Math.min(Math.max(limit, 1), 200);
  }

  private parseIsoDate(value: string | undefined, errorCode: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(errorCode);
    }

    return parsed;
  }
}