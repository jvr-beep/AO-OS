import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  LockerAccessDecision,
  LockerAccessEventType,
  LockerStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignLockerDto } from "../dto/assign-locker.dto";
import { CreateLockerAccessDto } from "../dto/create-locker-access.dto";
import { CreateLockerDto } from "../dto/create-locker.dto";
import { LockerAccessEventResponseDto } from "../dto/locker-access-event.response.dto";
import { LockerAssignmentResponseDto } from "../dto/locker-assignment.response.dto";
import { LockerResponseDto } from "../dto/locker.response.dto";
import { UnassignLockerDto } from "../dto/unassign-locker.dto";

@Injectable()
export class LockersService {
  constructor(private readonly prisma: PrismaService) {}

  async createLocker(input: CreateLockerDto): Promise<LockerResponseDto> {
    const created = await this.prisma.locker.create({
      data: {
        code: input.code,
        locationId: input.locationId ?? null,
        status: this.toLockerStatus(input.status)
      }
    });

    return this.toLockerResponse(created);
  }

  async listLockers(): Promise<LockerResponseDto[]> {
    const lockers = await this.prisma.locker.findMany({
      orderBy: { createdAt: "desc" }
    });

    return lockers.map((locker) => this.toLockerResponse(locker));
  }

  async assignLocker(input: AssignLockerDto): Promise<LockerAssignmentResponseDto> {
    const locker = await this.prisma.locker.findUnique({ where: { id: input.lockerId } });
    if (!locker) {
      throw new NotFoundException("LOCKER_NOT_FOUND");
    }

    if (locker.status !== "available") {
      throw new ConflictException("LOCKER_NOT_AVAILABLE");
    }

    const member = await this.prisma.member.findUnique({ where: { id: input.memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }

    if (input.wristbandAssignmentId) {
      const wristbandAssignment = await this.prisma.wristbandAssignment.findUnique({
        where: { id: input.wristbandAssignmentId }
      });

      if (!wristbandAssignment || !wristbandAssignment.active) {
        throw new NotFoundException("NO_ACTIVE_WRISTBAND_ASSIGNMENT");
      }

      if (wristbandAssignment.memberId !== input.memberId) {
        throw new ConflictException("WRISTBAND_ASSIGNMENT_MEMBER_MISMATCH");
      }
    }

    const activeLockerAssignment = await this.prisma.lockerAssignment.findFirst({
      where: { lockerId: input.lockerId, active: true }
    });

    if (activeLockerAssignment) {
      throw new ConflictException("LOCKER_ALREADY_ASSIGNED");
    }

    const created = await this.prisma.lockerAssignment.create({
      data: {
        lockerId: input.lockerId,
        memberId: input.memberId,
        wristbandAssignmentId: input.wristbandAssignmentId ?? null,
        assignedByStaffUserId: input.assignedByStaffUserId ?? null,
        active: true
      }
    });

    await this.prisma.locker.update({
      where: { id: input.lockerId },
      data: { status: "assigned" }
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

    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.wristbandId } });
    if (!wristband) {
      throw new NotFoundException("WRISTBAND_NOT_FOUND");
    }

    const activeLockerAssignment = await this.prisma.lockerAssignment.findFirst({
      where: { lockerId: input.lockerId, active: true }
    });

    const activeWristbandAssignment = await this.prisma.wristbandAssignment.findFirst({
      where: { wristbandId: input.wristbandId, active: true }
    });

    let decision: LockerAccessDecision = "allowed";
    let denialReasonCode: string | null = null;
    let memberId: string | null = activeWristbandAssignment?.memberId ?? null;

    if (locker.status === "out_of_service") {
      decision = "denied";
      denialReasonCode = "LOCKER_OUT_OF_SERVICE";
    } else if (!activeLockerAssignment) {
      decision = "denied";
      denialReasonCode = "LOCKER_NOT_ASSIGNED";
    } else if (!activeWristbandAssignment) {
      decision = "denied";
      denialReasonCode = "NO_ACTIVE_WRISTBAND_ASSIGNMENT";
    } else if (activeLockerAssignment.memberId !== activeWristbandAssignment.memberId) {
      decision = "denied";
      denialReasonCode = "LOCKER_ACCESS_MEMBER_MISMATCH";
    }

    const created = await this.prisma.lockerAccessEvent.create({
      data: {
        memberId,
        lockerId: input.lockerId,
        wristbandId: input.wristbandId,
        lockerAssignmentId: activeLockerAssignment?.id ?? null,
        decision,
        denialReasonCode,
        eventType: this.toLockerAccessEventType(input.eventType),
        occurredAt: new Date(input.occurredAt),
        sourceReference: input.sourceReference ?? null
      }
    });

    return this.toLockerAccessEventResponse(created);
  }

  async listMemberLockerAccessEvents(memberId: string): Promise<LockerAccessEventResponseDto[]> {
    const rows = await this.prisma.lockerAccessEvent.findMany({
      where: { memberId },
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toLockerAccessEventResponse(row));
  }

  private toLockerStatus(status?: CreateLockerDto["status"]): LockerStatus {
    if (!status) {
      return "available";
    }

    return status;
  }

  private toLockerAccessEventType(eventType: CreateLockerAccessDto["eventType"]): LockerAccessEventType {
    return eventType;
  }

  private toLockerResponse(locker: {
    id: string;
    code: string;
    locationId: string | null;
    status: LockerStatus;
    createdAt: Date;
    updatedAt: Date;
  }): LockerResponseDto {
    return {
      id: locker.id,
      code: locker.code,
      locationId: locker.locationId ?? undefined,
      status: locker.status,
      createdAt: locker.createdAt.toISOString(),
      updatedAt: locker.updatedAt.toISOString()
    };
  }

  private toLockerAssignmentResponse(assignment: {
    id: string;
    lockerId: string;
    memberId: string;
    wristbandAssignmentId: string | null;
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
      wristbandAssignmentId: assignment.wristbandAssignmentId ?? undefined,
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
