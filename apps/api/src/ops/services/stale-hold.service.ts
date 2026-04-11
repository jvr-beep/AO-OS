import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StaleHoldService {
  private readonly logger = new Logger(StaleHoldService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async detectStaleHolds(): Promise<void> {
    try {
      const expiredHolds = await this.prisma.resourceHold.findMany({
        where: {
          status: "active",
          expiresAt: { lt: new Date() },
        },
        select: { id: true, resourceId: true, visitId: true, expiresAt: true },
      });

      if (expiredHolds.length === 0) return;

      this.logger.warn(`Detected ${expiredHolds.length} expired resource hold(s)`);

      const affectedResourceIds = expiredHolds.map((h: { resourceId: string }) => h.resourceId);

      // Batch-fetch all existing open exceptions for these resources to avoid N+1
      const existingExceptions = await this.prisma.systemException.findMany({
        where: {
          exceptionType: "STALE_RESOURCE_HOLD",
          status: "open",
          resourceId: { in: affectedResourceIds },
        },
        select: { resourceId: true },
      });

      const resourcesWithOpenException = new Set(
        existingExceptions.map((e: { resourceId: string | null }) => e.resourceId).filter(Boolean) as string[]
      );

      const toCreate = expiredHolds.filter(
        (h: { resourceId: string }) => !resourcesWithOpenException.has(h.resourceId)
      );

      if (toCreate.length === 0) return;

      await this.prisma.systemException.createMany({
        data: toCreate.map((hold: { id: string; resourceId: string; visitId: string | null; expiresAt: Date }) => ({
          exceptionType: "STALE_RESOURCE_HOLD",
          severity: "warning",
          status: "open",
          resourceId: hold.resourceId,
          visitId: hold.visitId ?? null,
          payload: {
            hold_id: hold.id,
            expired_at: hold.expiresAt.toISOString(),
          },
        })),
      });

      this.logger.warn(
        `Created ${toCreate.length} STALE_RESOURCE_HOLD exception(s) for resources: ${toCreate.map((h: { resourceId: string }) => h.resourceId).join(", ")}`
      );
    } catch (error) {
      this.logger.error("Failed to detect stale holds", error);
    }
  }
}
