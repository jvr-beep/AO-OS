import { Injectable } from "@nestjs/common";
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
  targetStaffUserId?: string;
  eventType?: string;
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

    if (query.targetStaffUserId) {
      values.push(query.targetStaffUserId);
      filters.push(`"targetStaffUserId" = $${values.length}`);
    }

    if (query.eventType) {
      values.push(query.eventType);
      filters.push(`"eventType" = $${values.length}`);
    }

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
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
}