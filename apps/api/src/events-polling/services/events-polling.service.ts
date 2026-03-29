import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export type PollEvent = {
  id: string;
  type: "LockerAccessEvent" | "LockerPolicyDecisionEvent" | "AccessAttempt" | "PresenceEvent" | "RoomAccessEvent" | "StaffAuditEvent" | "CleaningTask" | "RoomBooking" | "GuestAccessEvent" | "SystemException" | "AuthEvent";
  occurredAt: string;
  data: Record<string, unknown>;
};

export type PolledEventsResponse = {
  lastPolledAt: string;
  events: PollEvent[];
  eventCounts: Record<string, number>;
};

@Injectable()
export class EventsPollingService {
  constructor(private readonly prisma: PrismaService) {}

  async pollEvents(since?: string): Promise<PolledEventsResponse> {
    let sinceDate: Date;

    if (since) {
      sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) {
        throw new BadRequestException("INVALID_SINCE_DATE");
      }
    } else {
      // If no since provided, use last polled timestamp from cursor
      const cursor = await (this.prisma as any).eventPollingCursor.findFirst({
        where: { eventType: "LockerAccessEvent" }
      });
      sinceDate = cursor?.lastPolledAt ? new Date(cursor.lastPolledAt) : new Date(Date.now() - 30 * 60 * 1000); // Last 30 mins default
    }

    const events: PollEvent[] = [];
    const eventCounts: Record<string, number> = {
      LockerAccessEvent: 0,
      LockerPolicyDecisionEvent: 0,
      AccessAttempt: 0,
      PresenceEvent: 0,
      RoomAccessEvent: 0,
      StaffAuditEvent: 0,
      CleaningTask: 0,
      RoomBooking: 0,
      GuestAccessEvent: 0,
      SystemException: 0,
      AuthEvent: 0
    };

    // Poll each event type
    const lockerAccessEvents = await this._pollLockerAccessEvents(sinceDate);
    events.push(...lockerAccessEvents);
    eventCounts.LockerAccessEvent = lockerAccessEvents.length;

    const lockerPolicyEvents = await this._pollLockerPolicyEvents(sinceDate);
    events.push(...lockerPolicyEvents);
    eventCounts.LockerPolicyDecisionEvent = lockerPolicyEvents.length;

    const accessAttempts = await this._pollAccessAttempts(sinceDate);
    events.push(...accessAttempts);
    eventCounts.AccessAttempt = accessAttempts.length;

    const presenceEvents = await this._pollPresenceEvents(sinceDate);
    events.push(...presenceEvents);
    eventCounts.PresenceEvent = presenceEvents.length;

    const roomAccessEvents = await this._pollRoomAccessEvents(sinceDate);
    events.push(...roomAccessEvents);
    eventCounts.RoomAccessEvent = roomAccessEvents.length;

    const staffAuditEvents = await this._pollStaffAuditEvents(sinceDate);
    events.push(...staffAuditEvents);
    eventCounts.StaffAuditEvent = staffAuditEvents.length;

    const cleaningTasks = await this._pollCleaningTasks(sinceDate);
    events.push(...cleaningTasks);
    eventCounts.CleaningTask = cleaningTasks.length;

    const roomBookings = await this._pollRoomBookings(sinceDate);
    events.push(...roomBookings);
    eventCounts.RoomBooking = roomBookings.length;

    const guestAccessEvents = await this._pollGuestAccessEvents(sinceDate);
    events.push(...guestAccessEvents);
    eventCounts.GuestAccessEvent = guestAccessEvents.length;

    const systemExceptions = await this._pollSystemExceptions(sinceDate);
    events.push(...systemExceptions);
    eventCounts.SystemException = systemExceptions.length;

    const authEvents = await this._pollAuthEvents(sinceDate);
    events.push(...authEvents);
    eventCounts.AuthEvent = authEvents.length;

    // Update polling cursors
    const now = new Date();
    for (const eventType of Object.keys(eventCounts)) {
      await (this.prisma as any).eventPollingCursor.update({
        where: { eventType },
        data: { lastPolledAt: now, updatedAt: now }
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

    return {
      lastPolledAt: now.toISOString(),
      events,
      eventCounts
    };
  }

  private async _pollLockerAccessEvents(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).lockerAccessEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "LockerAccessEvent" as const,
      occurredAt: new Date(e.occurredAt).toISOString(),
      data: {
        memberId: e.memberId,
        lockerId: e.lockerId,
        wristbandId: e.wristbandId,
        decision: e.decision,
        denialReasonCode: e.denialReasonCode,
        eventType: e.eventType,
        sourceReference: e.sourceReference
      }
    }));
  }

  private async _pollLockerPolicyEvents(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).lockerPolicyDecisionEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "LockerPolicyDecisionEvent" as const,
      occurredAt: new Date(e.createdAt).toISOString(),
      data: {
        memberId: e.memberId,
        lockerId: e.lockerId,
        visitSessionId: e.visitSessionId,
        staffUserId: e.staffUserId,
        decision: e.decision,
        reasonCode: e.reasonCode,
        assignmentMode: e.assignmentMode
      }
    }));
  }

  private async _pollAccessAttempts(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).accessAttempt.findMany({
      where: { occurredAt: { gte: since } },
      orderBy: { occurredAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "AccessAttempt" as const,
      occurredAt: new Date(e.occurredAt).toISOString(),
      data: {
        memberId: e.memberId,
        wristbandId: e.wristbandId,
        accessPointId: e.accessPointId,
        accessZoneId: e.accessZoneId,
        decision: e.decision,
        denialReasonCode: e.denialReasonCode
      }
    }));
  }

  private async _pollPresenceEvents(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).presenceEvent.findMany({
      where: { occurredAt: { gte: since } },
      orderBy: { occurredAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "PresenceEvent" as const,
      occurredAt: new Date(e.occurredAt).toISOString(),
      data: {
        visitSessionId: e.visitSessionId,
        memberId: e.memberId,
        accessZoneId: e.accessZoneId,
        eventType: e.eventType,
        sourceType: e.sourceType,
        sourceReference: e.sourceReference
      }
    }));
  }

  private async _pollRoomAccessEvents(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).roomAccessEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "RoomAccessEvent" as const,
      occurredAt: new Date(e.occurredAt).toISOString(),
      data: {
        bookingId: e.bookingId,
        roomId: e.roomId,
        memberId: e.memberId,
        wristbandId: e.wristbandId,
        decision: e.decision,
        denialReasonCode: e.denialReasonCode,
        eventType: e.eventType,
        sourceType: e.sourceType,
        sourceReference: e.sourceReference
      }
    }));
  }

  private async _pollStaffAuditEvents(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).staffAuditEvent.findMany({
      where: { occurredAt: { gte: since } },
      orderBy: { occurredAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "StaffAuditEvent" as const,
      occurredAt: new Date(e.occurredAt).toISOString(),
      data: {
        eventType: e.eventType,
        actorStaffUserId: e.actorStaffUserId,
        actorEmailSnapshot: e.actorEmailSnapshot,
        targetStaffUserId: e.targetStaffUserId,
        outcome: e.outcome,
        reasonCode: e.reasonCode,
        metadataJson: e.metadataJson
      }
    }));
  }

  private async _pollCleaningTasks(since: Date): Promise<PollEvent[]> {
    const events = await this.prisma.cleaningTask.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "CleaningTask" as const,
      occurredAt: new Date(e.createdAt).toISOString(),
      data: {
        roomId: e.roomId,
        bookingId: e.bookingId,
        taskType: e.taskType,
        status: e.status,
        assignedToStaffUserId: e.assignedToStaffUserId,
        notes: e.notes,
        completedAt: e.completedAt
      }
    }));
  }

  private async _pollRoomBookings(since: Date): Promise<PollEvent[]> {
    const events = await this.prisma.roomBooking.findMany({
      where: { updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "RoomBooking" as const,
      occurredAt: new Date(e.updatedAt).toISOString(),
      data: {
        memberId: e.memberId,
        roomId: e.roomId,
        bookingType: e.bookingType,
        status: e.status,
        startsAt: new Date(e.startsAt).toISOString(),
        endsAt: new Date(e.endsAt).toISOString()
      }
    }));
  }

  private async _pollGuestAccessEvents(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).guestAccessEvent.findMany({
      where: { eventTime: { gte: since } },
      orderBy: { eventTime: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "GuestAccessEvent" as const,
      occurredAt: new Date(e.eventTime).toISOString(),
      data: {
        visitId: e.visitId,
        wristbandId: e.wristbandId,
        readerId: e.readerId,
        zoneCode: e.zoneCode,
        accessResult: e.accessResult,
        denialReason: e.denialReason
      }
    }));
  }

  private async _pollSystemExceptions(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).systemException.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "SystemException" as const,
      occurredAt: new Date(e.createdAt).toISOString(),
      data: {
        exceptionType: e.exceptionType,
        severity: e.severity,
        status: e.status,
        visitId: e.visitId,
        bookingId: e.bookingId,
        folioId: e.folioId,
        resourceId: e.resourceId,
        wristbandId: e.wristbandId,
        payload: e.payload
      }
    }));
  }

  private async _pollAuthEvents(since: Date): Promise<PollEvent[]> {
    const events = await (this.prisma as any).authEvent.findMany({
      where: { occurredAt: { gte: since } },
      orderBy: { occurredAt: "desc" },
      take: 100
    });

    return events.map((e: any) => ({
      id: e.id,
      type: "AuthEvent" as const,
      occurredAt: new Date(e.occurredAt).toISOString(),
      data: {
        eventType: e.eventType,
        authMethod: e.authMethod,
        outcome: e.outcome,
        memberId: e.memberId,
        sessionId: e.sessionId,
        failureReasonCode: e.failureReasonCode,
        attemptedEmail: e.attemptedEmail,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        metadataJson: e.metadataJson
      }
    }));
  }
}
