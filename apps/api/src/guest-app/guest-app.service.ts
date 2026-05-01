import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from '../stripe/stripe.service'
import { GuestTokenService } from './guest-token.service'
import { randomBytes } from 'crypto'

function generateBookingCode(): string {
  return 'AO-' + randomBytes(4).toString('hex').toUpperCase()
}

@Injectable()
export class GuestAppService {
  private readonly logger = new Logger(GuestAppService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly guestTokens: GuestTokenService,
  ) {}

  async getCatalog() {
    const tiers = await this.prisma.tier.findMany({
      where: { active: true },
      include: {
        durationOptions: {
          where: { active: true },
          orderBy: { durationMinutes: 'asc' },
        },
      },
      orderBy: { upgradeRank: 'asc' },
    })

    return tiers.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      productType: t.productType,
      publicDescription: t.publicDescription,
      basePriceCents: t.basePriceCents,
      durations: t.durationOptions.map((d) => ({
        id: d.id,
        durationMinutes: d.durationMinutes,
        priceCents: d.priceCents,
      })),
    }))
  }

  async identifyGuest(dto: {
    firstName: string
    lastName?: string
    email?: string
    phone?: string
  }) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required')
    }

    // Try to find existing guest
    let guest = null
    if (dto.email) {
      guest = await this.prisma.guest.findFirst({ where: { email: dto.email } })
    }
    if (!guest && dto.phone) {
      guest = await this.prisma.guest.findFirst({ where: { phone: dto.phone } })
    }

    if (guest) {
      // Update name if provided
      if (dto.firstName && dto.firstName !== guest.firstName) {
        guest = await this.prisma.guest.update({
          where: { id: guest.id },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName ?? guest.lastName,
            ...(dto.email && !guest.email ? { email: dto.email } : {}),
            ...(dto.phone && !guest.phone ? { phone: dto.phone } : {}),
          },
        })
      }
    } else {
      guest = await this.prisma.guest.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
        },
      })
    }

    const { token, expiresAt } = this.guestTokens.issue(guest.id)

    this.logger.log(`guest-identify: guest=${guest.id} new=${!guest}`)

    return {
      guestId: guest.id,
      guestToken: token,
      tokenExpiresAt: expiresAt,
    }
  }

  async createPaymentIntent(guestId: string, dto: {
    tierId: string
    durationMinutes: number
    productType: 'room' | 'locker'
    currency?: string
  }) {
    const tier = await this.prisma.tier.findUnique({
      where: { id: dto.tierId },
      include: {
        durationOptions: { where: { active: true } },
      },
    })
    if (!tier || !tier.active) throw new NotFoundException('Tier not found or inactive')

    const durationOption = tier.durationOptions.find(
      (d) => d.durationMinutes === dto.durationMinutes,
    )
    if (!durationOption) throw new BadRequestException('Duration option not available for this tier')

    const amountCents = durationOption.priceCents
    if (amountCents === 0) {
      // Complimentary — skip Stripe
      return { paymentIntentId: null, clientSecret: null, amountCents: 0, offline: true }
    }

    const currency = dto.currency ?? 'cad'
    const idempotencyKey = `guest_booking_pi_${guestId}_${dto.tierId}_${dto.durationMinutes}`

    const intent = await this.stripe.createPaymentIntent({
      amountCents,
      currency,
      guestId,
      tierCode: tier.code,
      idempotencyKey,
    })

    this.logger.log(`payment-intent: guest=${guestId} tier=${tier.code} amount=${amountCents}¢`)

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
      amountCents,
      currency,
    }
  }

  async confirmBooking(guestId: string, dto: {
    paymentIntentId: string | null
    tierId: string
    durationMinutes: number
    productType: 'room' | 'locker'
    arrivalDate: string // YYYY-MM-DD
  }) {
    const tier = await this.prisma.tier.findUnique({ where: { id: dto.tierId } })
    if (!tier || !tier.active) throw new NotFoundException('Tier not found or inactive')

    const durationOption = await this.prisma.tierDurationOption.findFirst({
      where: { tierId: dto.tierId, durationMinutes: dto.durationMinutes, active: true },
    })
    if (!durationOption) throw new BadRequestException('Duration option not available')

    // Verify payment if not complimentary
    if (dto.paymentIntentId) {
      const pi = await this.stripe.stripe.paymentIntents.retrieve(dto.paymentIntentId)
      if (pi.status !== 'succeeded') {
        throw new BadRequestException(`Payment not completed — status: ${pi.status}`)
      }
      // Verify it belongs to this guest
      if (pi.metadata?.ao_guest_id && pi.metadata.ao_guest_id !== guestId) {
        throw new BadRequestException('Payment intent does not match guest')
      }
    }

    // Build arrival window: 7AM–10PM on the requested date (location local time — UTC for now)
    const [year, month, day] = dto.arrivalDate.split('-').map(Number)
    const arrivalWindowStart = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)) // noon UTC
    const arrivalWindowEnd = new Date(Date.UTC(year, month - 1, day, 23, 0, 0))   // 11PM UTC

    // Generate unique booking code
    let bookingCode: string
    let attempts = 0
    do {
      bookingCode = generateBookingCode()
      const existing = await this.prisma.guestBooking.findUnique({ where: { bookingCode } })
      if (!existing) break
      attempts++
    } while (attempts < 5)

    const paidCents = dto.paymentIntentId ? durationOption.priceCents : 0

    const booking = await this.prisma.guestBooking.create({
      data: {
        guestId,
        tierId: dto.tierId,
        productType: dto.productType as any,
        bookingChannel: 'web',
        bookingDate: arrivalWindowStart,
        arrivalWindowStart,
        arrivalWindowEnd,
        durationMinutes: dto.durationMinutes,
        quotedPriceCents: durationOption.priceCents,
        paidAmountCents: paidCents,
        balanceDueCents: durationOption.priceCents - paidCents,
        status: 'confirmed',
        bookingCode: bookingCode!,
      },
    })

    this.logger.log(`booking-confirm: guest=${guestId} booking=${booking.id} code=${booking.bookingCode}`)

    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      arrivalWindowStart: booking.arrivalWindowStart.toISOString(),
      arrivalWindowEnd: booking.arrivalWindowEnd.toISOString(),
      tierName: tier.name,
      durationMinutes: booking.durationMinutes,
      paidAmountCents: booking.paidAmountCents,
    }
  }

  async getBookingByCode(bookingCode: string) {
    const booking = await this.prisma.guestBooking.findUnique({
      where: { bookingCode: bookingCode.toUpperCase() },
      include: { tier: true },
    })
    if (!booking) throw new NotFoundException('Booking not found')

    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      tierName: booking.tier.name,
      productType: booking.productType,
      durationMinutes: booking.durationMinutes,
      arrivalWindowStart: booking.arrivalWindowStart.toISOString(),
      arrivalWindowEnd: booking.arrivalWindowEnd.toISOString(),
      quotedPriceCents: booking.quotedPriceCents,
      paidAmountCents: booking.paidAmountCents,
      balanceDueCents: booking.balanceDueCents,
    }
  }
}
