import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { LocationContextService } from '../location/location-context.service'

@Injectable()
export class KioskBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationContext: LocationContextService,
  ) {}

  async lookupBooking(lookupType: 'code' | 'phone', value: string) {
    if (lookupType === 'code') {
      const booking = await this.prisma.guestBooking.findUnique({
        where: { bookingCode: value.trim().toUpperCase() },
        include: { tier: true, guest: true },
      })
      if (!booking) throw new NotFoundException('Booking not found')
      return this.toBookingWithGuest(booking)
    }

    // phone lookup — find guest, then their active bookings
    const normalised = value.replace(/\D/g, '')
    const guest = await this.prisma.guest.findFirst({
      where: {
        OR: [
          { phone: value.trim() },
          { phone: normalised },
        ],
      },
    })
    if (!guest) throw new NotFoundException('No guest found with that phone number')

    const bookings = await this.prisma.guestBooking.findMany({
      where: {
        guestId: guest.id,
        status: { in: ['reserved', 'confirmed'] },
      },
      include: { tier: true, guest: true },
      orderBy: { arrivalWindowStart: 'asc' },
      take: 5,
    })

    if (bookings.length === 0) {
      throw new NotFoundException('No upcoming bookings found for that phone number')
    }

    // Return the soonest upcoming booking
    return this.toBookingWithGuest(bookings[0])
  }

  async checkinBooking(bookingId: string) {
    const booking = await this.prisma.guestBooking.findUnique({
      where: { id: bookingId },
      include: { tier: true },
    })
    if (!booking) throw new NotFoundException('Booking not found')

    if (!['reserved', 'confirmed'].includes(booking.status)) {
      throw new ConflictException(
        `Booking cannot be checked in — current status is '${booking.status}'`,
      )
    }

    if (!booking.tier || !booking.tier.active) {
      throw new BadRequestException('Booking tier is no longer active')
    }

    const locationId = this.locationContext.locationOrNull?.id ?? null

    const { visit } = await this.prisma.$transaction(async (tx: any) => {
      const visit = await tx.visit.create({
        data: {
          guestId: booking.guestId,
          bookingId: booking.id,
          sourceType: 'booking',
          productType: booking.productType,
          tierId: booking.tierId,
          locationId,
          durationMinutes: booking.durationMinutes,
          status: 'initiated',
          waiverRequired: false,
        },
      })

      await tx.visitStatusHistory.create({
        data: {
          visitId: visit.id,
          previousStatus: null,
          newStatus: 'initiated',
          reasonCode: 'booking_checkin',
        },
      })

      await tx.folio.create({ data: { visitId: visit.id } })

      await tx.guestBooking.update({
        where: { id: booking.id },
        data: { status: 'checked_in', version: { increment: 1 } },
      })

      return { visit }
    })

    return {
      visit_id: visit.id,
      tier_id: booking.tierId,
      tier_code: booking.tier.code,
      balance_due_cents: booking.balanceDueCents ?? 0,
    }
  }

  private toBookingWithGuest(booking: any) {
    return {
      booking: {
        id: booking.id,
        booking_code: booking.bookingCode,
        status: booking.status,
        tier_id: booking.tierId,
        tier_name: booking.tier?.name ?? null,
        product_type: booking.productType,
        arrival_window_start: booking.arrivalWindowStart.toISOString(),
        arrival_window_end: booking.arrivalWindowEnd.toISOString(),
        duration_minutes: booking.durationMinutes,
        balance_due_cents: booking.balanceDueCents,
        quoted_price_cents: booking.quotedPriceCents,
        paid_amount_cents: booking.paidAmountCents,
      },
      guest: {
        id: booking.guest?.id ?? booking.guestId,
      },
    }
  }
}
