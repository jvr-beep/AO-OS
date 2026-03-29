import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSystemExceptionDto } from "../dto/create-system-exception.dto";
import { ListSystemExceptionsQueryDto } from "../dto/list-system-exceptions.query.dto";
import { ResolveSystemExceptionDto } from "../dto/resolve-system-exception.dto";

@Injectable()
export class OpsService {
  constructor(private readonly prisma: PrismaService) {}

  async createException(dto: CreateSystemExceptionDto) {
    const created = await this.prisma.systemException.create({
      data: {
        exceptionType: dto.exception_type,
        severity: dto.severity,
        visitId: dto.visit_id ?? null,
        bookingId: dto.booking_id ?? null,
        folioId: dto.folio_id ?? null,
        resourceId: dto.resource_id ?? null,
        wristbandId: dto.wristband_id ?? null,
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        status: "open"
      }
    });

    return this.toResponse(created);
  }

  async listExceptions(query: ListSystemExceptionsQueryDto) {
    const rows = await this.prisma.systemException.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return rows.map((row) => this.toResponse(row));
  }

  async resolveException(exceptionId: string, dto: ResolveSystemExceptionDto) {
    const current = await this.prisma.systemException.findUnique({ where: { id: exceptionId } });
    if (!current) {
      throw new NotFoundException("System exception not found");
    }

    const updated = await this.prisma.systemException.update({
      where: { id: exceptionId },
      data: {
        status: dto.status,
        resolvedAt: dto.status === "resolved" ? new Date() : null
      }
    });

    return this.toResponse(updated);
  }

  async getOpsSnapshot() {
    const [openExceptions, activeVisits, heldResources, occupiedResources] = await Promise.all([
      this.prisma.systemException.count({ where: { status: "open" } }),
      this.prisma.visit.count({ where: { status: { in: ["checked_in", "active", "extended"] } } }),
      this.prisma.resource.count({ where: { status: "held" } }),
      this.prisma.resource.count({ where: { status: "occupied" } })
    ]);

    return {
      open_exceptions: openExceptions,
      active_visits: activeVisits,
      held_resources: heldResources,
      occupied_resources: occupiedResources,
      generated_at: new Date().toISOString()
    };
  }

  private toResponse(row: {
    id: string;
    exceptionType: string;
    severity: string;
    status: string;
    visitId: string | null;
    bookingId: string | null;
    folioId: string | null;
    resourceId: string | null;
    wristbandId: string | null;
    payload: unknown;
    createdAt: Date;
    resolvedAt: Date | null;
  }) {
    return {
      id: row.id,
      exception_type: row.exceptionType,
      severity: row.severity,
      status: row.status,
      visit_id: row.visitId,
      booking_id: row.bookingId,
      folio_id: row.folioId,
      resource_id: row.resourceId,
      wristband_id: row.wristbandId,
      payload: row.payload,
      created_at: row.createdAt.toISOString(),
      resolved_at: row.resolvedAt ? row.resolvedAt.toISOString() : null
    };
  }
}
