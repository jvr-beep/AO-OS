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

      for (const hold of expiredHolds) {
        // Avoid duplicate open exceptions for the same resource
        const existing = await this.prisma.systemException.findFirst({
          where: {
            exceptionType: "STALE_RESOURCE_HOLD",
            status: "open",
            resourceId: hold.resourceId,
          },
        });

        if (existing) continue;

        await this.prisma.systemException.create({
          data: {
            exceptionType: "STALE_RESOURCE_HOLD",
            severity: "warning",
            status: "open",
            resourceId: hold.resourceId,
            visitId: hold.visitId ?? null,
            payload: {
              hold_id: hold.id,
              expired_at: hold.expiresAt.toISOString(),
            },
          },
        });

        this.logger.warn(
          `Created STALE_RESOURCE_HOLD exception for resource ${hold.resourceId} (hold ${hold.id})`
        );
      }
    } catch (error) {
      this.logger.error("Failed to detect stale holds", error);
    }
  }
}
