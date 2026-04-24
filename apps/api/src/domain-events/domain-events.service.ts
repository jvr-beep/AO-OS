import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface EmitEventParams {
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  memberId?: string | null;
  locationId?: string | null;
  payload: Record<string, unknown>;
  sourceSystem?: string;
  correlationId?: string;
  occurredAt?: Date;
}

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emit(params: EmitEventParams): Promise<void> {
    try {
      await this.prisma.domainEvent.create({
        data: {
          eventName: params.eventName,
          aggregateType: params.aggregateType,
          aggregateId: params.aggregateId,
          memberId: params.memberId ?? null,
          locationId: params.locationId ?? null,
          occurredAt: params.occurredAt ?? new Date(),
          payloadJson: params.payload as Prisma.InputJsonValue,
          sourceSystem: params.sourceSystem ?? "ao-os-api",
          correlationId: params.correlationId ?? null
        }
      });
    } catch (err) {
      // Event emission must never crash the caller — log and continue
      this.logger.error(`Failed to emit domain event [${params.eventName}]`, err);
    }
  }
}
