import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  RoomAccessDecision,
  RoomAccessEventType,
  RoomAccessSourceType,
  RoomPrivacyLevel,
  RoomStatus,
  RoomType
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoomAccessDto } from "../dto/create-room-access.dto";
import { ListRoomAccessEventsQueryDto } from "../dto/list-room-access-events.query.dto";
import { CreateRoomDto } from "../dto/create-room.dto";
import { ListRoomsQueryDto } from "../dto/list-rooms.query.dto";
import { RoomAccessEventResponseDto } from "../dto/room-access-event.response.dto";
import { RoomResponseDto } from "../dto/room.response.dto";

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(input: CreateRoomDto): Promise<RoomResponseDto> {
    const area = await this.prisma.floorPlanArea.findUnique({ where: { id: input.floorPlanAreaId } });
    if (!area) {
      throw new NotFoundException("FLOOR_PLAN_AREA_NOT_FOUND");
    }

    if (area.areaType !== "room") {
      throw new BadRequestException("FLOOR_PLAN_AREA_NOT_ROOM");
    }

    const created = await this.prisma.room.create({
      data: {
        locationId: input.locationId,
        floorPlanAreaId: input.floorPlanAreaId,
        code: input.code,
        name: input.name,
        roomType: this.parseRoomType(input.roomType),
        privacyLevel: this.parsePrivacyLevel(input.privacyLevel),
        status: this.parseOptionalStatus(input.status),
        active: input.active ?? true,
        bookable: input.bookable ?? true,
        cleaningRequired: input.cleaningRequired ?? false
      }
    });

    return this.toRoomResponse(created);
  }

  async listRooms(query: ListRoomsQueryDto): Promise<RoomResponseDto[]> {
    const take = this.parseLimit(query.limit);
    const bookable = this.parseOptionalBoolean(query.bookable, "INVALID_BOOKABLE_FILTER");
    const cleaningRequired = this.parseOptionalBoolean(
      query.cleaningRequired,
      "INVALID_CLEANING_REQUIRED_FILTER"
    );

    const rows = await this.prisma.room.findMany({
      where: {
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.roomType ? { roomType: this.parseRoomType(query.roomType) } : {}),
        ...(query.privacyLevel ? { privacyLevel: this.parsePrivacyLevel(query.privacyLevel) } : {}),
        ...(query.status ? { status: this.parseStatus(query.status) } : {}),
        ...(bookable !== undefined ? { bookable } : {}),
        ...(cleaningRequired !== undefined ? { cleaningRequired } : {})
      },
      take,
      orderBy: { createdAt: "desc" }
    });

    return rows.map((row) => this.toRoomResponse(row));
  }

  async getRoom(id: string): Promise<RoomResponseDto> {
    const row = await this.prisma.room.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("ROOM_NOT_FOUND");
    }

    return this.toRoomResponse(row);
  }

  async setMaintenanceMode(id: string, maintenance: boolean): Promise<RoomResponseDto> {
    const room = await this.prisma.room.findUnique({ where: { id } })
    if (!room) throw new NotFoundException("ROOM_NOT_FOUND")
    const blocked = ["reserved", "checked_in", "cleaning"]
    if (maintenance && blocked.includes(room.status)) {
      throw new BadRequestException(`Cannot set maintenance: room is currently ${room.status}`)
    }
    const updated = await this.prisma.room.update({
      where: { id },
      data: { status: maintenance ? "maintenance" : "available" },
    })
    return this.toRoomResponse(updated)
  }

  async accessRoom(input: CreateRoomAccessDto): Promise<RoomAccessEventResponseDto> {
    const occurredAt = this.parseDate(input.occurredAt, "INVALID_OCCURRED_AT");

    const room = await this.prisma.room.findUnique({ where: { id: input.roomId } });
    if (!room) {
      throw new NotFoundException("ROOM_NOT_FOUND");
    }

    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.wristbandId } });
    const activeAssignment = await this.prisma.wristbandAssignment.findFirst({
      where: {
        wristbandId: input.wristbandId,
        active: true
      }
    });

    const activeBooking = await this.prisma.roomBooking.findFirst({
      where: {
        roomId: input.roomId,
        status: { in: ["reserved", "checked_in"] },
        startsAt: { lte: occurredAt },
        endsAt: { gte: occurredAt }
      },
      orderBy: { startsAt: "desc" }
    });

    let decision: RoomAccessDecision = "allowed";
    let denialReasonCode: string | null = null;

    if (!room.active || !room.bookable) {
      decision = "denied";
      denialReasonCode = "ROOM_NOT_BOOKABLE";
    } else if (room.status === "out_of_service") {
      decision = "denied";
      denialReasonCode = "ROOM_OUT_OF_SERVICE";
    } else if (room.status === "cleaning") {
      decision = "denied";
      denialReasonCode = "ROOM_IN_CLEANING";
    } else if (!wristband) {
      decision = "denied";
      denialReasonCode = "WRISTBAND_NOT_FOUND";
    } else if (wristband.status !== "assigned" && wristband.status !== "active") {
      decision = "denied";
      denialReasonCode = "WRISTBAND_NOT_ACTIVE";
    } else if (!activeAssignment) {
      decision = "denied";
      denialReasonCode = "NO_ACTIVE_WRISTBAND_ASSIGNMENT";
    } else if (!activeBooking) {
      decision = "denied";
      denialReasonCode = "NO_ACTIVE_BOOKING";
    } else if (activeAssignment.memberId !== activeBooking.memberId) {
      decision = "denied";
      denialReasonCode = "ROOM_ACCESS_WRISTBAND_MISMATCH";
    }

    const created = await this.prisma.roomAccessEvent.create({
      data: {
        bookingId: activeBooking?.id ?? null,
        roomId: input.roomId,
        memberId: activeBooking?.memberId ?? activeAssignment?.memberId ?? null,
        wristbandId: wristband?.id ?? null,
        decision,
        denialReasonCode,
        eventType: this.parseRoomAccessEventType(input.eventType),
        occurredAt,
        sourceType: this.parseOptionalSourceType(input.sourceType),
        sourceReference: input.sourceReference ?? null
      }
    });

    return this.toRoomAccessEventResponse(created);
  }

  async listRoomAccessEvents(
    roomId: string,
    query: ListRoomAccessEventsQueryDto
  ): Promise<RoomAccessEventResponseDto[]> {
    await this.ensureRoomExists(roomId);

    const rows = await this.prisma.roomAccessEvent.findMany({
      where: {
        roomId,
        ...this.buildAccessEventWhere(query)
      },
      take: this.parseLimit(query.limit),
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toRoomAccessEventResponse(row));
  }

  async listMemberRoomAccessEvents(
    memberId: string,
    query: ListRoomAccessEventsQueryDto
  ): Promise<RoomAccessEventResponseDto[]> {
    await this.ensureMemberExists(memberId);

    const rows = await this.prisma.roomAccessEvent.findMany({
      where: {
        memberId,
        ...this.buildAccessEventWhere(query)
      },
      take: this.parseLimit(query.limit),
      orderBy: { occurredAt: "desc" }
    });

    return rows.map((row) => this.toRoomAccessEventResponse(row));
  }

  private parseRoomType(input: string): RoomType {
    if (
      input === "private" ||
      input === "premium_private" ||
      input === "retreat" ||
      input === "ritual" ||
      input === "accessible" ||
      input === "couples_reserved_future"
    ) {
      return input;
    }

    throw new BadRequestException("INVALID_ROOM_TYPE");
  }

  private parsePrivacyLevel(input: string): RoomPrivacyLevel {
    if (input === "standard" || input === "high" || input === "premium") {
      return input;
    }

    throw new BadRequestException("INVALID_PRIVACY_LEVEL");
  }

  private parseStatus(input: string): RoomStatus {
    if (
      input === "available" ||
      input === "booked" ||
      input === "occupied" ||
      input === "cleaning" ||
      input === "out_of_service"
    ) {
      return input;
    }

    throw new BadRequestException("INVALID_ROOM_STATUS");
  }

  private parseOptionalStatus(input: string | undefined): RoomStatus {
    if (!input) {
      return "available";
    }

    return this.parseStatus(input);
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

  private parseDate(value: string, errorCode: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(errorCode);
    }

    return parsed;
  }

  private parseOptionalDate(value: string | undefined, errorCode: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    return this.parseDate(value, errorCode);
  }

  private parseOptionalBoolean(
    input: string | undefined,
    errorCode: "INVALID_BOOKABLE_FILTER" | "INVALID_CLEANING_REQUIRED_FILTER"
  ): boolean | undefined {
    if (!input) {
      return undefined;
    }

    if (input === "true") {
      return true;
    }

    if (input === "false") {
      return false;
    }

    throw new BadRequestException(errorCode);
  }

  private parseRoomAccessDecision(input: string): RoomAccessDecision {
    if (input === "allowed" || input === "denied" || input === "error") {
      return input;
    }

    throw new BadRequestException("INVALID_ROOM_ACCESS_DECISION");
  }

  private parseRoomAccessEventType(input: string): RoomAccessEventType {
    if (
      input === "unlock" ||
      input === "lock" ||
      input === "open" ||
      input === "close" ||
      input === "check_in_gate" ||
      input === "check_out_gate"
    ) {
      return input;
    }

    throw new BadRequestException("INVALID_ROOM_ACCESS_EVENT_TYPE");
  }

  private parseOptionalSourceType(input: string | undefined): RoomAccessSourceType {
    if (!input) {
      return "wristband_reader";
    }

    if (input === "wristband_reader" || input === "staff_console" || input === "system") {
      return input;
    }

    throw new BadRequestException("INVALID_ROOM_ACCESS_SOURCE_TYPE");
  }

  private buildAccessEventWhere(query: ListRoomAccessEventsQueryDto): {
    decision?: RoomAccessDecision;
    eventType?: RoomAccessEventType;
    occurredAt?: { gte?: Date; lte?: Date };
  } {
    const startDate = this.parseOptionalDate(query.startDate, "INVALID_START_DATE");
    const endDate = this.parseOptionalDate(query.endDate, "INVALID_END_DATE");

    return {
      ...(query.decision ? { decision: this.parseRoomAccessDecision(query.decision) } : {}),
      ...(query.eventType ? { eventType: this.parseRoomAccessEventType(query.eventType) } : {}),
      ...(startDate || endDate
        ? {
            occurredAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {})
            }
          }
        : {})
    };
  }

  private async ensureRoomExists(roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException("ROOM_NOT_FOUND");
    }
  }

  private async ensureMemberExists(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }
  }

  private toRoomResponse(row: {
    id: string;
    locationId: string;
    floorPlanAreaId: string;
    code: string;
    name: string;
    roomType: RoomType;
    privacyLevel: RoomPrivacyLevel;
    status: RoomStatus;
    active: boolean;
    bookable: boolean;
    cleaningRequired: boolean;
    lastTurnedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): RoomResponseDto {
    return {
      id: row.id,
      locationId: row.locationId,
      floorPlanAreaId: row.floorPlanAreaId,
      code: row.code,
      name: row.name,
      roomType: row.roomType,
      privacyLevel: row.privacyLevel,
      status: row.status,
      active: row.active,
      bookable: row.bookable,
      cleaningRequired: row.cleaningRequired,
      lastTurnedAt: row.lastTurnedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private toRoomAccessEventResponse(row: {
    id: string;
    bookingId: string | null;
    roomId: string;
    memberId: string | null;
    wristbandId: string | null;
    decision: RoomAccessDecision;
    denialReasonCode: string | null;
    eventType: RoomAccessEventType;
    occurredAt: Date;
    sourceType: RoomAccessSourceType;
    sourceReference: string | null;
    createdAt: Date;
  }): RoomAccessEventResponseDto {
    return {
      id: row.id,
      bookingId: row.bookingId ?? undefined,
      roomId: row.roomId,
      memberId: row.memberId ?? undefined,
      wristbandId: row.wristbandId ?? undefined,
      decision: row.decision,
      denialReasonCode: row.denialReasonCode ?? undefined,
      eventType: row.eventType,
      occurredAt: row.occurredAt.toISOString(),
      sourceType: row.sourceType,
      sourceReference: row.sourceReference ?? undefined,
      createdAt: row.createdAt.toISOString()
    };
  }
}
