import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePresenceEventDto } from "../dto/create-presence-event.dto";
import { PresenceEventResponseDto } from "../dto/presence-event.response.dto";

@Injectable()
export class PresenceEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPresenceEvent(input: CreatePresenceEventDto): Promise<PresenceEventResponseDto> {
    const session = await this.prisma.visitSession.findUnique({ where: { id: input.visitSessionId } });
    if (!session) throw new NotFoundException("VISIT_SESSION_NOT_FOUND");
    if (session.status !== "checked_in") throw new ForbiddenException("VISIT_SESSION_CLOSED");

    const created = await this.prisma.presenceEvent.create({
      data: {
        visitSessionId: input.visitSessionId,
        memberId: input.memberId,
        accessZoneId: input.accessZoneId ?? null,
        eventType: input.eventType,
        sourceType: input.sourceType ?? null,
        sourceReference: input.sourceReference ?? null,
        occurredAt: new Date(input.occurredAt),
        payloadJson: input.payloadJson as any
      }
    });

    return this.toDto(created);
  }

  async listVisitSessionPresenceEvents(visitSessionId: string): Promise<PresenceEventResponseDto[]> {
    const events = await this.prisma.presenceEvent.findMany({
      where: { visitSessionId },
      orderBy: { occurredAt: "desc" }
    });

    return events.map((e) => this.toDto(e));
  }

  async listMemberPresenceEvents(memberId: string): Promise<PresenceEventResponseDto[]> {
    const events = await this.prisma.presenceEvent.findMany({
      where: { memberId },
      orderBy: { occurredAt: "desc" }
    });

    return events.map((e) => this.toDto(e));
  }

  private toDto(e: {
    id: string;
    visitSessionId: string;
    memberId: string;
    accessZoneId: string | null;
    eventType: string;
    sourceType: string | null;
    sourceReference: string | null;
    occurredAt: Date;
    payloadJson: unknown;
  }): PresenceEventResponseDto {
    return {
      id: e.id,
      visitSessionId: e.visitSessionId,
      memberId: e.memberId,
      accessZoneId: e.accessZoneId,
      eventType: e.eventType,
      sourceType: e.sourceType,
      sourceReference: e.sourceReference,
      occurredAt: e.occurredAt.toISOString(),
      payloadJson: e.payloadJson
    };
  }
}
