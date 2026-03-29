import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import { ListBookingsQueryDto } from '../dto/list-bookings.query.dto';
import { GuestBooking, GuestBookingStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

function generateBookingCode(): string {
  return 'AO-' + randomBytes(4).toString('hex').toUpperCase();
}

const VALID_STATUS_TRANSITIONS: Partial<Record<GuestBookingStatus, GuestBookingStatus[]>> = {
  reserved: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
};

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(dto: CreateBookingDto) {
    const tier = await this.prisma.tier.findUnique({ where: { id: dto.tier_id } });
    if (!tier || !tier.active) {
      throw new NotFoundException('Tier not found or inactive');
    }

    const guest = await this.prisma.guest.findUnique({ where: { id: dto.guest_id } });
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    const arrivalStart = new Date(dto.arrival_window_start);
    const arrivalEnd = new Date(dto.arrival_window_end);
    if (arrivalEnd <= arrivalStart) {
      throw new BadRequestException('arrival_window_end must be after arrival_window_start');
    }

    let bookingCode: string;
    let attempts = 0;
    do {
      bookingCode = generateBookingCode();
      const existing = await this.prisma.guestBooking.findUnique({ where: { bookingCode } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const addOns = dto.add_ons ?? [];

    const booking = await this.prisma.guestBooking.create({
      data: {
        guestId: dto.guest_id,
        tierId: dto.tier_id,
        productType: dto.product_type,
        bookingChannel: dto.booking_channel,
        bookingDate: new Date(dto.booking_date),
        arrivalWindowStart: arrivalStart,
        arrivalWindowEnd: arrivalEnd,
        durationMinutes: dto.duration_minutes,
        quotedPriceCents: dto.quoted_price_cents,
        balanceDueCents: dto.quoted_price_cents,
        bookingCode,
        expectsExistingBand: dto.expects_existing_band ?? false,
        addOns: {
          create: addOns.map((a) => ({
            addOnCode: a.add_on_code,
            quantity: a.quantity,
            unitPriceCents: a.unit_price_cents,
            totalPriceCents: a.unit_price_cents * a.quantity,
          })),
        },
      },
      include: { tier: true, addOns: true },
    });

    return this.toResponse(booking as any);
  }

  async getBooking(bookingId: string) {
    const booking = await this.prisma.guestBooking.findUnique({
      where: { id: bookingId },
      include: { tier: true, addOns: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.toResponse(booking as any);
  }

  async getBookingByCode(bookingCode: string) {
    const booking = await this.prisma.guestBooking.findUnique({
      where: { bookingCode },
      include: { tier: true, addOns: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.toResponse(booking as any);
  }

  async getBookingByQrToken(qrToken: string) {
    const booking = await this.prisma.guestBooking.findUnique({
      where: { qrToken },
      include: { tier: true, addOns: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.toResponse(booking as any);
  }

  async listGuestBookings(guestId: string, query: ListBookingsQueryDto) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException('Guest not found');

    const bookings = await this.prisma.guestBooking.findMany({
      where: { guestId, ...(query.status ? { status: query.status } : {}) },
      include: { tier: true, addOns: true },
      orderBy: { bookingDate: 'desc' },
    });
    return bookings.map((b: any) => this.toResponse(b));
  }

  async updateBookingStatus(bookingId: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.guestBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const allowed = VALID_STATUS_TRANSITIONS[booking.status as GuestBookingStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Cannot transition booking from '${booking.status}' to '${dto.status}'`,
      );
    }

    const updated = await this.prisma.guestBooking.update({
      where: { id: bookingId },
      data: { status: dto.status, version: { increment: 1 } },
      include: { tier: true, addOns: true },
    });
    return this.toResponse(updated as any);
  }

  private toResponse(booking: any) {
    return {
      id: booking.id,
      guest_id: booking.guestId,
      tier_id: booking.tierId,
      tier_name: booking.tier?.name ?? null,
      product_type: booking.productType,
      booking_channel: booking.bookingChannel,
      booking_date: booking.bookingDate.toISOString().split('T')[0],
      arrival_window_start: booking.arrivalWindowStart.toISOString(),
      arrival_window_end: booking.arrivalWindowEnd.toISOString(),
      duration_minutes: booking.durationMinutes,
      status: booking.status,
      quoted_price_cents: booking.quotedPriceCents,
      paid_amount_cents: booking.paidAmountCents,
      balance_due_cents: booking.balanceDueCents,
      booking_code: booking.bookingCode,
      qr_token: booking.qrToken ?? null,
      expects_existing_band: booking.expectsExistingBand,
      version: booking.version,
      add_ons: (booking.addOns ?? []).map((a: any) => ({
        id: a.id,
        add_on_code: a.addOnCode,
        quantity: a.quantity,
        unit_price_cents: a.unitPriceCents,
        total_price_cents: a.totalPriceCents,
      })),
      created_at: booking.createdAt.toISOString(),
      updated_at: booking.updatedAt.toISOString(),
    };
  }
}
