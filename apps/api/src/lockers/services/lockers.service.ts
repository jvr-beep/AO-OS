import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  LockerAssignmentMode,
  LockerAccessDecision,
  LockerAccessEventType,
  LockerStatus,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignLockerDto } from "../dto/assign-locker.dto";
import { CreateLockerAccessDto } from "../dto/create-locker-access.dto";
import { CreateLockerDto } from "../dto/create-locker.dto";
import { EvaluateLockerPolicyDto } from "../dto/evaluate-locker-policy.dto";
import { ListLockerAccessEventsQueryDto } from "../dto/list-locker-access-events.query.dto";
import { ListLockerPolicyEventsQueryDto } from "../dto/list-locker-policy-events.query.dto";
import { ListLockersQueryDto } from "../dto/list-lockers.query.dto";
import { LockerAccessEventResponseDto } from "../dto/locker-access-event.response.dto";
import { LockerAssignmentResponseDto } from "../dto/locker-assignment.response.dto";
import { LockerPolicyEventResponseDto } from "../dto/locker-policy-event.response.dto";
import { LockerPolicyDecisionResponseDto } from "../dto/locker-policy-decision.response.dto";
import { LockerResponseDto } from "../dto/locker.response.dto";
import { UnassignLockerDto } from "../dto/unassign-locker.dto";
import { LockerPolicyService } from "./locker-policy.service";

@Injectable()
export class LockersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockerPolicyService: LockerPolicyService
  ) {}

  async createLocker(input: CreateLockerDto): Promise<LockerResponseDto> {
    const created = await this.prisma.locker.create({
      data: {
        code: input.code,
        vendorLockId: input.vendorLockId ?? null,
        locationId: input.locationId ?? null,
        zoneId: input.zoneId ?? null,
        bankId: input.bankId ?? null,
        wallId: input.wallId ?? null,
        lockerLabel: input.lockerLabel ?? null,
        lockerSize: input.lockerSize ?? null,
        lockerType: input.lockerType ?? null,
        isAccessible: input.isAccessible ?? false,
        isWetAreaRated: input.isWetAreaRated ?? false,
        hasPower: input.hasPower ?? false,
        tierClass: input.tierClass ?? null,
        supportsDayUse: input.supportsDayUse ?? true,
        supportsAssignedUse: input.supportsAssignedUse ?? true,
        active: input.active ?? true,
        status: this.toLockerStatus(input.status)
      }
    });

    return this.toLockerResponse(created);
  }

  async listLockers(query?: ListLockersQueryDto): Promise<LockerResponseDto[]> {
    const status = query?.status ? this.toLockerStatus(query.status) : undefined;
    const assignmentWhere = query?.memberId
      ? { active: true, memberId: query.memberId }
      : { active: true };

    const lockers = await this.prisma.locker.findMany({
      where: {
        ...(query?.siteId ? { locationId: query.siteId } : {}),
        ...(query?.zoneId ? { zoneId: query.zoneId } : {}),
        ...(status ? { status } : {})
      },
      include: {
        assignments: {
          where: assignmentWhere,
          orderBy: { assignedAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (query?.credentialId) {
      const assignmentIds = await this.prisma.wristbandAssignment.findMany({
        where: { wristbandId: query.credentialId, active: true },
        select: { id: true }
      });
      const assignmentIdSet = new Set(assignmentIds.map((row) => row.id));

      return lockers
        .filter((locker) => {
          const activeAssignment = locker.assignments[0];
          return activeAssignment ? assignmentIdSet.has(activeAssignment.wristbandAssignmentId ?? "") : false;
        })
        .map((locker) => this.toLockerResponse(locker));
    }

    return lockers.map((locker) => this.toLockerResponse(locker));
  }

  async assignLocker(input: AssignLockerDto): Promise<LockerAssignmentResponseDto> {
    const locker = await this.prisma.locker.findUnique({ where: { id: input.lockerId } });
    if (!locker) {
      throw new NotFoundException("LOCKER_NOT_FOUND");
    }

    const activeLockerAssignment = await this.prisma.lockerAssignment.findFirst({
      where: { lockerId: input.lockerId, active: true }
    });

    if (activeLockerAssignment) {
      throw new ConflictException("LOCKER_ALREADY_ASSIGNED");
    }

    if (locker.status === "out_of_service" || locker.status === "maintenance" || locker.status === "offline") {
      throw new ConflictException("LOCKER_OUT_OF_SERVICE");
    }

    if (!(locker.status === "available" || locker.status === "reserved" || locker.status === "assigned")) {
      throw new ConflictException("LOCKER_ACCESS_NOT_ALLOWED");
    }

    const member = await this.prisma.member.findUnique({ where: { id: input.memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }

    const wristbandAssignment = input.wristbandAssignmentId
      ? await this.prisma.wristbandAssignment.findUnique({
          where: { id: input.wristbandAssignmentId }
        })
      : await this.prisma.wristbandAssignment.findFirst({
          where: { memberId: input.memberId, active: true },
          orderBy: { assignedAt: "desc" }
        });

    if (!wristbandAssignment || !wristbandAssignment.active) {
      throw new ConflictException("LOCKER_ASSIGNMENT_INACTIVE");
    }

    if (wristbandAssignment.memberId !== input.memberId) {
      throw new ConflictException("LOCKER_ACCESS_NOT_ALLOWED");
    }

    const session = input.visitSessionId
      ? await this.prisma.visitSession.findUnique({ where: { id: input.visitSessionId } })
      : await this.prisma.visitSession.findFirst({
          where: {
            memberId: input.memberId,
            locationId: locker.locationId ?? undefined,
            status: "checked_in"
          },
          orderBy: { checkInAt: "desc" }
        });

    const policyDecision = await this.lockerPolicyService.evaluate({
      memberId: input.memberId,
      credentialId: wristbandAssignment.wristbandId,
      siteId: input.siteId ?? locker.locationId ?? "",
      sessionId: session?.id ?? "",
      requestMode: this.toAssignmentMode(input.assignmentMode),
      requestedZoneId: input.requestedZoneId,
      requestedLockerId: input.requestedLockerId ?? input.lockerId,
      staffOverride: input.assignmentMode === "staff_override",
      staffOverrideReason: input.staffOverrideReason,
      staffUserId: input.assignedByStaffUserId,
      correlationId: input.correlationId
    });

    if (policyDecision.decision !== "allow" || !policyDecision.chosenLockerId) {
      throw new ConflictException(policyDecision.reasonCode);
    }

    if (policyDecision.chosenLockerId !== input.lockerId) {
      throw new ConflictException("LOCKER_NOT_SELECTED_BY_POLICY");
    }

    const created = await this.prisma.lockerAssignment.create({
      data: {
        lockerId: input.lockerId,
        memberId: input.memberId,
        visitSessionId: session?.id ?? null,
        wristbandAssignmentId: wristbandAssignment.id,
        assignmentMode: this.toAssignmentMode(input.assignmentMode),
        policySnapshot: policyDecision.policySnapshot as Prisma.InputJsonValue,
        assignedByStaffUserId: input.assignedByStaffUserId ?? null,
        active: true
      }
    });

    await this.prisma.locker.update({
      where: { id: input.lockerId },
      data: { status: "occupied" }
    });

    return this.toLockerAssignmentResponse(created);
  }

  async unassignLocker(input: UnassignLockerDto): Promise<LockerAssignmentResponseDto> {
    const activeLockerAssignment = await this.prisma.lockerAssignment.findFirst({
      where: { lockerId: input.lockerId, active: true }
    });

    if (!activeLockerAssignment) {
      throw new NotFoundException("NO_ACTIVE_LOCKER_ASSIGNMENT");
    }

    const updated = await this.prisma.lockerAssignment.update({
      where: { id: activeLockerAssignment.id },
      data: {
        active: false,
        unassignedAt: new Date(),
        unassignedReason: input.unassignedReason ?? null
      }
    });

    await this.prisma.locker.update({
      where: { id: input.lockerId },
      data: { status: "available" }
    });

    return this.toLockerAssignmentResponse(updated);
  }

  async accessLocker(input: CreateLockerAccessDto): Promise<LockerAccessEventResponseDto> {
    const locker = await this.prisma.locker.findUnique({ where: { id: input.lockerId } });
    if (!locker) {
      throw new NotFoundException("LOCKER_NOT_FOUND");
    }

    const activeLockerAssignment = await this.prisma.lockerAssignment.findFirst({
      where: { lockerId: input.lockerId, active: true }
    });

    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.wristbandId } });
    const activeWristbandAssignment = await this.prisma.wristbandAssignment.findFirst({
      where: { wristbandId: input.wristbandId, active: true }
    });

    let decision: LockerAccessDecision = "allowed";
    let denialReasonCode: string | null = null;
    let memberId: string | null = activeWristbandAssignment?.memberId ?? null;
    let wristbandId: string | null = wristband?.id ?? null;
    let lockerAssignmentId: string | null = activeLockerAssignment?.id ?? null;

    if (locker.status === "out_of_service" || locker.status === "maintenance" || locker.status === "offline") {
      decision = "denied";
      denialReasonCode = "LOCKER_OUT_OF_SERVICE";
    } else if (!wristband) {
      decision = "denied";
      denialReasonCode = "WRISTBAND_NOT_FOUND";
    } else if (!activeLockerAssignment) {
      decision = "denied";
      denialReasonCode = "LOCKER_NOT_ASSIGNED";
    } else if (!activeWristbandAssignment) {
      decision = "denied";
      denialReasonCode = "LOCKER_ACCESS_NOT_ALLOWED";
    } else if (activeLockerAssignment.memberId !== activeWristbandAssignment.memberId) {
      decision = "denied";
      denialReasonCode = "LOCKER_ACCESS_WRISTBAND_MISMATCH";
    }

    const created = await this.prisma.lockerAccessEvent.create({
      data: {
        memberId,
        lockerId: input.lockerId,
        wristbandId,
        lockerAssignmentId,
        decision,
        denialReasonCode,
        eventType: this.toLockerAccessEventType(input.eventType),
        occurredAt: new Date(input.occurredAt),
        sourceReference: input.sourceReference ?? null
      }
    });

    return this.toLockerAccessEventResponse(created);
  }

  async listLockerAccessEvents(
    lockerId: string,
    query: ListLockerAccessEventsQueryDto
  ): Promise<LockerAccessEventResponseDto[]> {
    const where = this.buildAccessEventWhere(query);
    const take = this.parseLimit(query.limit);

    const rows = await this.prisma.lockerAccessEvent.findMany({
      where: {
        ...where,
        lockerId
      },
      take,
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toLockerAccessEventResponse(row));
  }

  async listMemberLockerAccessEvents(
    memberId: string,
    query: ListLockerAccessEventsQueryDto
  ): Promise<LockerAccessEventResponseDto[]> {
    const where = this.buildAccessEventWhere(query);
    const take = this.parseLimit(query.limit);

    const rows = await this.prisma.lockerAccessEvent.findMany({
      where: {
        ...where,
        memberId
      },
      take,
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toLockerAccessEventResponse(row));
  }

  async evaluateLockerPolicy(input: EvaluateLockerPolicyDto): Promise<LockerPolicyDecisionResponseDto> {
    return this.lockerPolicyService.evaluate({
      memberId: input.memberId,
      credentialId: input.credentialId,
      siteId: input.siteId,
      sessionId: input.sessionId,
      requestMode: this.toAssignmentMode(input.requestMode),
      requestedZoneId: input.requestedZoneId,
      requestedLockerId: input.requestedLockerId,
      staffOverride: input.staffOverride,
      staffOverrideReason: input.staffOverrideReason,
      correlationId: input.correlationId
    });
  }

  async listLockerPolicyEvents(query: ListLockerPolicyEventsQueryDto): Promise<LockerPolicyEventResponseDto[]> {
    const take = this.parseLimit(query.limit) ?? 100;

    const rows = await this.prisma.lockerPolicyDecisionEvent.findMany({
      where: {
        ...(query.siteId ? { siteId: query.siteId } : {}),
        ...(query.memberId ? { memberId: query.memberId } : {}),
        ...(query.sessionId ? { visitSessionId: query.sessionId } : {}),
        ...(query.decision ? { decision: query.decision } : {})
      },
      orderBy: { createdAt: "desc" },
      take
    });

    return rows.map((row) => ({
      id: row.id,
      memberId: row.memberId ?? undefined,
      lockerId: row.lockerId ?? undefined,
      visitSessionId: row.visitSessionId ?? undefined,
      staffUserId: row.staffUserId ?? undefined,
      siteId: row.siteId ?? undefined,
      requestedZoneId: row.requestedZoneId ?? undefined,
      requestedLockerId: row.requestedLockerId ?? undefined,
      assignmentMode: row.assignmentMode,
      decision: row.decision,
      reasonCode: row.reasonCode,
      eligibleLockerIds: row.eligibleLockerIds,
      chosenLockerId: row.chosenLockerId ?? undefined,
      correlationId: row.correlationId ?? undefined,
      createdAt: row.createdAt.toISOString()
    }));
  }

  private buildAccessEventWhere(query: ListLockerAccessEventsQueryDto): {
    decision?: LockerAccessDecision;
    eventType?: LockerAccessEventType;
    occurredAt?: { gte?: Date; lte?: Date };
  } {
    const startDate = this.parseDate(query.startDate, "INVALID_START_DATE");
    const endDate = this.parseDate(query.endDate, "INVALID_END_DATE");

    const where: {
      decision?: LockerAccessDecision;
      eventType?: LockerAccessEventType;
      occurredAt?: { gte?: Date; lte?: Date };
    } = {};

    if (query.decision) {
      where.decision = this.parseDecisionFilter(query.decision);
    }

    if (query.eventType) {
      where.eventType = this.parseEventTypeFilter(query.eventType);
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

  private parseDecisionFilter(input: string): LockerAccessDecision {
    if (input === "allowed" || input === "denied") {
      return input;
    }

    throw new BadRequestException("INVALID_LOCKER_ACCESS_DECISION");
  }

  private parseEventTypeFilter(input: string): LockerAccessEventType {
    if (input === "unlock" || input === "lock" || input === "open" || input === "close") {
      return input;
    }

    throw new BadRequestException("INVALID_LOCKER_ACCESS_EVENT_TYPE");
  }

  private toLockerStatus(status?: CreateLockerDto["status"]): LockerStatus {
    if (!status) {
      return "available";
    }

    return status;
  }

  private toAssignmentMode(mode?: AssignLockerDto["assignmentMode"] | EvaluateLockerPolicyDto["requestMode"]): LockerAssignmentMode {
    if (!mode) {
      return "assigned";
    }

    return mode;
  }

  private toLockerAccessEventType(eventType: CreateLockerAccessDto["eventType"]): LockerAccessEventType {
    return eventType;
  }

  private toLockerResponse(locker: {
    id: string;
    code: string;
    vendorLockId: string | null;
    locationId: string | null;
    zoneId: string | null;
    bankId: string | null;
    wallId: string | null;
    lockerLabel: string | null;
    lockerSize: string | null;
    lockerType: string | null;
    isAccessible: boolean;
    isWetAreaRated: boolean;
    hasPower: boolean;
    tierClass: string | null;
    supportsDayUse: boolean;
    supportsAssignedUse: boolean;
    active: boolean;
    status: LockerStatus;
    assignments?: {
      id: string;
      memberId: string;
      wristbandAssignmentId: string | null;
      assignedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
  }): LockerResponseDto {
    const activeAssignment = locker.assignments?.[0];

    return {
      id: locker.id,
      code: locker.code,
      vendorLockId: locker.vendorLockId ?? undefined,
      locationId: locker.locationId ?? undefined,
      zoneId: locker.zoneId ?? undefined,
      bankId: locker.bankId ?? undefined,
      wallId: locker.wallId ?? undefined,
      lockerLabel: locker.lockerLabel ?? undefined,
      lockerSize: locker.lockerSize ?? undefined,
      lockerType: locker.lockerType ?? undefined,
      isAccessible: locker.isAccessible,
      isWetAreaRated: locker.isWetAreaRated,
      hasPower: locker.hasPower,
      tierClass: locker.tierClass ?? undefined,
      supportsDayUse: locker.supportsDayUse,
      supportsAssignedUse: locker.supportsAssignedUse,
      active: locker.active,
      status: locker.status,
      activeAssignmentId: activeAssignment?.id,
      assignedMemberId: activeAssignment?.memberId,
      wristbandAssignmentId: activeAssignment?.wristbandAssignmentId ?? undefined,
      assignedAt: activeAssignment?.assignedAt.toISOString(),
      createdAt: locker.createdAt.toISOString(),
      updatedAt: locker.updatedAt.toISOString()
    };
  }

  private toLockerAssignmentResponse(assignment: {
    id: string;
    lockerId: string;
    memberId: string;
    visitSessionId: string | null;
    wristbandAssignmentId: string | null;
    assignmentMode: LockerAssignmentMode;
    assignedByStaffUserId: string | null;
    assignedAt: Date;
    unassignedAt: Date | null;
    unassignedReason: string | null;
    active: boolean;
  }): LockerAssignmentResponseDto {
    return {
      id: assignment.id,
      lockerId: assignment.lockerId,
      memberId: assignment.memberId,
      visitSessionId: assignment.visitSessionId ?? undefined,
      wristbandAssignmentId: assignment.wristbandAssignmentId ?? undefined,
      assignmentMode: assignment.assignmentMode,
      assignedByStaffUserId: assignment.assignedByStaffUserId ?? undefined,
      assignedAt: assignment.assignedAt.toISOString(),
      unassignedAt: assignment.unassignedAt?.toISOString() ?? undefined,
      unassignedReason: assignment.unassignedReason ?? undefined,
      active: assignment.active
    };
  }

  private toLockerAccessEventResponse(event: {
    id: string;
    memberId: string | null;
    lockerId: string;
    wristbandId: string | null;
    lockerAssignmentId: string | null;
    decision: LockerAccessDecision;
    denialReasonCode: string | null;
    eventType: LockerAccessEventType;
    occurredAt: Date;
    sourceReference: string | null;
    createdAt: Date;
  }): LockerAccessEventResponseDto {
    return {
      id: event.id,
      memberId: event.memberId ?? undefined,
      lockerId: event.lockerId,
      wristbandId: event.wristbandId ?? undefined,
      lockerAssignmentId: event.lockerAssignmentId ?? undefined,
      decision: event.decision,
      denialReasonCode: event.denialReasonCode ?? undefined,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      sourceReference: event.sourceReference ?? undefined,
      createdAt: event.createdAt.toISOString()
    };
  }
}
