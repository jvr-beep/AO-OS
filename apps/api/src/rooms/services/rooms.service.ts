import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { RoomPrivacyLevel, RoomStatus, RoomType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoomDto } from "../dto/create-room.dto";
import { ListRoomsQueryDto } from "../dto/list-rooms.query.dto";
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
}
