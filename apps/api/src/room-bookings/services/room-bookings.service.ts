import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  RoomBooking,
  RoomBookingSourceType,
  RoomBookingStatus,
  RoomBookingType,
  RoomStatus,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BookingResponseDto } from "../dto/booking.response.dto";
import { CancelBookingDto } from "../dto/cancel-booking.dto";
import { CheckInBookingDto } from "../dto/check-in-booking.dto";
import { CheckOutBookingDto } from "../dto/check-out-booking.dto";
import { CreateBookingDto } from "../dto/create-booking.dto";
import { ListBookingsQueryDto } from "../dto/list-bookings.query.dto";

@Injectable()
export class RoomBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(input: CreateBookingDto): Promise<BookingResponseDto> {
    const startsAt = this.parseDate(input.startsAt, "INVALID_START_DATE");
    const endsAt = this.parseDate(input.endsAt, "INVALID_END_DATE");

    if (endsAt <= startsAt) {
      throw new BadRequestException("INVALID_BOOKING_WINDOW");
    }

    await this.ensureMemberExists(input.memberId);

    const room = await this.prisma.room.findUnique({ where: { id: input.roomId } });
    if (!room) {
      throw new NotFoundException("ROOM_NOT_FOUND");
    }

    if (!room.active || !room.bookable) {
      throw new ConflictException("ROOM_NOT_BOOKABLE");
    }

    if (room.status === "cleaning") {
      throw new ConflictException("ROOM_IN_CLEANING");
    }

    if (room.status === "out_of_service") {
      throw new ConflictException("ROOM_OUT_OF_SERVICE");
    }

    const overlapping = await this.findOverlappingActiveBooking(input.roomId, startsAt, endsAt);

    const created = await this.prisma.roomBooking.create({
      data: {
        memberId: input.memberId,
        roomId: input.roomId,
        bookingType: this.parseBookingType(input.bookingType),
        status: overlapping ? "waitlisted" : "reserved",
        startsAt,
        endsAt,
        sourceType: this.parseSourceType(input.sourceType),
        sourceReference: input.sourceReference ?? null,
        waitlistPriority: input.waitlistPriority ?? 0
      }
    });

    if (!overlapping) {
      await this.prisma.room.update({
        where: { id: input.roomId },
        data: { status: "booked" }
      });
    }

    return this.toResponse(created);
  }

  async listBookings(query: ListBookingsQueryDto): Promise<BookingResponseDto[]> {
    const rows = await this.prisma.roomBooking.findMany({
      where: this.buildWhere(query),
      take: this.parseLimit(query.limit),
      orderBy: { startsAt: "asc" }
    });

    return rows.map((row) => this.toResponse(row));
  }

  async listMemberBookings(memberId: string, query: ListBookingsQueryDto): Promise<BookingResponseDto[]> {
    await this.ensureMemberExists(memberId);

    const rows = await this.prisma.roomBooking.findMany({
      where: {
        ...this.buildWhere(query),
        memberId
      },
      take: this.parseLimit(query.limit),
      orderBy: { startsAt: "asc" }
    });

    return rows.map((row) => this.toResponse(row));
  }

  async listRoomBookings(roomId: string, query: ListBookingsQueryDto): Promise<BookingResponseDto[]> {
    await this.ensureRoomExists(roomId);

    const rows = await this.prisma.roomBooking.findMany({
      where: {
        ...this.buildWhere(query),
        roomId
      },
      take: this.parseLimit(query.limit),
      orderBy: { startsAt: "asc" }
    });

    return rows.map((row) => this.toResponse(row));
  }

  async checkInBooking(id: string, input: CheckInBookingDto): Promise<BookingResponseDto> {
    const occurredAt = this.parseDate(input.occurredAt, "INVALID_OCCURRED_AT");

    const booking = await this.prisma.roomBooking.findUnique({
      where: { id },
      include: { room: true }
    });
    if (!booking) {
      throw new NotFoundException("BOOKING_NOT_FOUND");
    }

    if (booking.status !== "reserved") {
      throw new ConflictException("BOOKING_NOT_CHECK_IN_ELIGIBLE");
    }

    if (occurredAt < booking.startsAt || occurredAt > booking.endsAt) {
      throw new ConflictException("BOOKING_NOT_IN_ACCESS_WINDOW");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.roomBooking.update({
        where: { id },
        data: {
          status: "checked_in",
          checkedInAt: occurredAt
        }
      });

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: "occupied" }
      });

      return row;
    });

    return this.toResponse(updated);
  }

  async checkOutBooking(id: string, input: CheckOutBookingDto): Promise<BookingResponseDto> {
    const occurredAt = this.parseDate(input.occurredAt, "INVALID_OCCURRED_AT");

    const booking = await this.prisma.roomBooking.findUnique({
      where: { id },
      include: { room: true }
    });
    if (!booking) {
      throw new NotFoundException("BOOKING_NOT_FOUND");
    }

    if (booking.status !== "checked_in") {
      throw new ConflictException("BOOKING_NOT_CHECK_OUT_ELIGIBLE");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.roomBooking.update({
        where: { id },
        data: {
          status: "checked_out",
          checkedOutAt: occurredAt
        }
      });

      await this.promoteWaitlistForInterval(tx, booking.roomId, booking.startsAt, booking.endsAt);

      const hasActive = await tx.roomBooking.findFirst({
        where: {
          roomId: booking.roomId,
          status: { in: ["reserved", "checked_in"] }
        },
        orderBy: { startsAt: "asc" }
      });

      if (booking.room.cleaningRequired) {
        await tx.cleaningTask.create({
          data: {
            roomId: booking.roomId,
            bookingId: booking.id,
            taskType: "turnover",
            status: "open"
          }
        });
      }

      await tx.room.update({
        where: { id: booking.roomId },
        data: {
          status: booking.room.cleaningRequired ? "cleaning" : hasActive ? "booked" : "available"
        }
      });

      return row;
    });

    return this.toResponse(updated);
  }

  async cancelBooking(id: string, _input: CancelBookingDto): Promise<BookingResponseDto> {
    const booking = await this.prisma.roomBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("BOOKING_NOT_FOUND");
    }

    if (booking.status !== "reserved" && booking.status !== "waitlisted") {
      throw new ConflictException("BOOKING_NOT_CANCELLABLE");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.roomBooking.update({
        where: { id },
        data: { status: "cancelled" }
      });

      if (booking.status === "reserved") {
        await this.promoteWaitlistForInterval(tx, booking.roomId, booking.startsAt, booking.endsAt);
      }

      const hasActive = await tx.roomBooking.findFirst({
        where: {
          roomId: booking.roomId,
          status: { in: ["reserved", "checked_in"] }
        }
      });

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: hasActive ? "booked" : "available" }
      });

      return row;
    });

    return this.toResponse(updated);
  }

  async extendBooking(id: string, minutes: number): Promise<BookingResponseDto> {
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 480) {
      throw new BadRequestException("INVALID_EXTEND_MINUTES");
    }
    const booking = await this.prisma.roomBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException("BOOKING_NOT_FOUND");
    if (booking.status !== "reserved" && booking.status !== "checked_in") {
      throw new ConflictException("BOOKING_NOT_EXTENDABLE");
    }
    const updated = await this.prisma.roomBooking.update({
      where: { id },
      data: { endsAt: new Date(booking.endsAt.getTime() + minutes * 60_000) }
    });
    return this.toResponse(updated);
  }

  private buildWhere(query: ListBookingsQueryDto): Prisma.RoomBookingWhereInput {
    const startDate = this.parseOptionalDate(query.startDate, "INVALID_START_DATE");
    const endDate = this.parseOptionalDate(query.endDate, "INVALID_END_DATE");

    return {
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.status ? { status: this.parseStatus(query.status) } : {}),
      ...(query.bookingType ? { bookingType: this.parseBookingType(query.bookingType) } : {}),
      ...(startDate || endDate
        ? {
            startsAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {})
            }
          }
        : {})
    };
  }

  private async findOverlappingActiveBooking(
    roomId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<RoomBooking | null> {
    return this.prisma.roomBooking.findFirst({
      where: {
        roomId,
        status: { in: ["reserved", "checked_in"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt }
      }
    });
  }

  private async promoteWaitlistForInterval(
    tx: Prisma.TransactionClient,
    roomId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<void> {
    const candidates = await tx.roomBooking.findMany({
      where: {
        roomId,
        status: "waitlisted",
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt }
      },
      include: {
        member: {
          include: {
            subscriptions: {
              where: {
                status: { in: ["active", "trialing"] }
              },
              include: {
                membershipPlan: true
              }
            }
          }
        }
      }
    });

    if (candidates.length === 0) {
      return;
    }

    candidates.sort((a, b) => {
      const aTier = this.getTierPriority(a.member.subscriptions);
      const bTier = this.getTierPriority(b.member.subscriptions);
      if (aTier !== bTier) {
        return bTier - aTier;
      }

      if (a.waitlistPriority !== b.waitlistPriority) {
        return b.waitlistPriority - a.waitlistPriority;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const winner = candidates[0];

    const hasConflict = await tx.roomBooking.findFirst({
      where: {
        roomId,
        id: { not: winner.id },
        status: { in: ["reserved", "checked_in"] },
        startsAt: { lt: winner.endsAt },
        endsAt: { gt: winner.startsAt }
      }
    });

    if (!hasConflict) {
      await tx.roomBooking.update({
        where: { id: winner.id },
        data: { status: "reserved" }
      });
    }
  }

  private getTierPriority(
    subscriptions: { membershipPlan: { tierRank: number } }[]
  ): number {
    if (subscriptions.length === 0) {
      return 0;
    }

    return subscriptions.reduce((max, sub) => {
      return sub.membershipPlan.tierRank > max ? sub.membershipPlan.tierRank : max;
    }, 0);
  }

  private async ensureMemberExists(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }
  }

  private async ensureRoomExists(roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException("ROOM_NOT_FOUND");
    }
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

  private parseBookingType(input: string): RoomBookingType {
    if (input === "restore" || input === "release" || input === "retreat") {
      return input;
    }

    throw new BadRequestException("INVALID_BOOKING_TYPE");
  }

  private parseStatus(input: string): RoomBookingStatus {
    if (
      input === "reserved" ||
      input === "checked_in" ||
      input === "checked_out" ||
      input === "expired" ||
      input === "cancelled" ||
      input === "no_show" ||
      input === "waitlisted"
    ) {
      return input;
    }

    throw new BadRequestException("INVALID_BOOKING_STATUS");
  }

  private parseSourceType(input: string): RoomBookingSourceType {
    if (
      input === "membership_credit" ||
      input === "upgrade_credit" ||
      input === "one_time_purchase" ||
      input === "manual_staff" ||
      input === "package_credit"
    ) {
      return input;
    }

    throw new BadRequestException("INVALID_BOOKING_SOURCE_TYPE");
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

  private toResponse(row: RoomBooking): BookingResponseDto {
    return {
      id: row.id,
      memberId: row.memberId,
      roomId: row.roomId,
      bookingType: row.bookingType,
      status: row.status,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      sourceType: row.sourceType,
      sourceReference: row.sourceReference ?? undefined,
      waitlistPriority: row.waitlistPriority,
      checkedInAt: row.checkedInAt?.toISOString(),
      checkedOutAt: row.checkedOutAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
