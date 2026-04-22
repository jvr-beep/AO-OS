import { Controller, Post, Get, Body, Query, HttpCode, UseGuards } from '@nestjs/common'
import { IsString, IsIn, IsOptional } from 'class-validator'
import { KioskApiKeyGuard } from '../auth/guards/kiosk-api-key.guard'
import { BillingService } from '../stripe/billing.service'
import { VoiceService, VisitMode, RitualPhase } from '../voice/voice.service'
import { CreateVisitPaymentIntentDto } from '../stripe/dto/create-visit-payment-intent.dto'
import { KioskBookingService } from './kiosk-booking.service'
import { InventoryService } from '../inventory/services/inventory.service'
import { QrTokenService } from './qr-token.service'
import { PrismaService } from '../prisma/prisma.service'

class RitualGuidanceDto {
  @IsString()
  @IsIn(['restore', 'release', 'retreat'])
  mode!: VisitMode

  @IsString()
  @IsIn(['opening', 'mid', 'deep', 'closing'])
  phase!: RitualPhase
}

class BookingLookupDto {
  @IsString()
  @IsIn(['code', 'phone'])
  lookup_type!: 'code' | 'phone'

  @IsString()
  value!: string
}

class BookingCheckinDto {
  @IsString()
  booking_id!: string
}

class InventoryHoldDto {
  @IsString()
  visit_id!: string

  @IsString()
  tier_id!: string

  @IsString()
  @IsIn(['locker', 'room'])
  product_type!: 'locker' | 'room'

  duration_minutes!: number

  @IsOptional()
  @IsString()
  resource_id?: string
}

class InventoryFinalizeDto {
  @IsString()
  visit_id!: string

  @IsString()
  hold_id!: string
}

/**
 * Kiosk-specific API surface.
 * All routes here are protected by the shared KIOSK_API_SECRET header,
 * not by staff JWT — the kiosk server-action layer is the sole caller.
 *
 * POST /v1/kiosk/visit-payment        — create a Stripe PaymentIntent for a guest visit
 * POST /v1/kiosk/ritual-guidance      — Lane 2 TTS ritual coaching (George voice)
 * POST /v1/kiosk/booking-lookup       — find a booking by code or phone
 * POST /v1/kiosk/booking-checkin      — create a visit from a booking + payment intent if balance due
 * POST /v1/kiosk/inventory-hold       — reserve a resource during payment window
 * POST /v1/kiosk/inventory-finalize   — convert hold to assignment after payment
 */
class ResolveQrDto {
  @IsString()
  token!: string
}

@Controller('kiosk')
@UseGuards(KioskApiKeyGuard)
export class KioskController {
  constructor(
    private readonly billingService: BillingService,
    private readonly voiceService: VoiceService,
    private readonly kioskBookingService: KioskBookingService,
    private readonly inventoryService: InventoryService,
    private readonly qrTokenService: QrTokenService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('visit-payment')
  @HttpCode(201)
  async createVisitPayment(@Body() dto: CreateVisitPaymentIntentDto) {
    // Zero-price visits (e.g. E2E tests, comp passes) skip Stripe entirely.
    if (dto.amountCents === 0) {
      return { paymentIntentId: null, clientSecret: null }
    }
    return this.billingService.createVisitPaymentIntent({
      visitId: dto.visitId,
      guestId: dto.guestId,
      tierCode: dto.tierCode,
      amountCents: dto.amountCents,
      currency: dto.currency,
    })
  }

  @Post('ritual-guidance')
  @HttpCode(200)
  async ritualGuidance(@Body() dto: RitualGuidanceDto) {
    const result = await this.voiceService.generateRitualGuidance(dto.mode, dto.phase)
    if (!result) {
      return { available: false }
    }
    return {
      available: true,
      audioBase64: result.audioBase64,
      contentType: result.contentType,
      text: result.text,
    }
  }

  @Post('booking-lookup')
  @HttpCode(200)
  lookupBooking(@Body() dto: BookingLookupDto) {
    return this.kioskBookingService.lookupBooking(dto.lookup_type, dto.value)
  }

  @Post('booking-checkin')
  @HttpCode(201)
  checkinBooking(@Body() dto: BookingCheckinDto) {
    return this.kioskBookingService.checkinBooking(dto.booking_id)
  }

  @Get('available-resources')
  @HttpCode(200)
  getAvailableResources(
    @Query('product_type') productType: string,
    @Query('tier_id') tierId?: string,
  ) {
    const locationId = null
    return this.inventoryService.listAvailableResources(productType, tierId, locationId)
  }

  @Post('inventory-hold')
  @HttpCode(201)
  createInventoryHold(@Body() dto: InventoryHoldDto) {
    return this.inventoryService.createHold({
      visit_id: dto.visit_id,
      tier_id: dto.tier_id,
      product_type: dto.product_type,
      duration_minutes: dto.duration_minutes,
      hold_scope: 'resource',
      resource_id: dto.resource_id,
    })
  }

  @Post('inventory-finalize')
  @HttpCode(200)
  finalizeInventory(@Body() dto: InventoryFinalizeDto) {
    return this.inventoryService.finalizeAssignment({
      visit_id: dto.visit_id,
      hold_id: dto.hold_id,
    })
  }

  /**
   * Resolves a member QR token to a guest identity.
   * Decodes + verifies the HMAC token, looks up the Member, finds or creates
   * the matching Guest record, and returns guest info + waiver status.
   */
  @Post('resolve-qr')
  @HttpCode(200)
  async resolveQr(@Body() dto: ResolveQrDto) {
    const { memberId } = this.qrTokenService.verify(dto.token)

    const member = await this.prisma.member.findUnique({ where: { id: memberId } })
    if (!member) throw new Error('Member not found')

    // Find existing guest by email or phone
    let guest = member.email
      ? await this.prisma.guest.findFirst({ where: { email: member.email } })
      : null

    if (!guest && member.phone) {
      guest = await this.prisma.guest.findFirst({ where: { phone: member.phone } })
    }

    // Auto-create guest from member profile if none found
    if (!guest) {
      guest = await this.prisma.guest.create({
        data: {
          firstName: member.firstName ?? 'Member',
          lastName: member.lastName ?? null,
          email: member.email ?? null,
          phone: member.phone ?? null,
        },
      })
    }

    // Check current waiver
    const latestWaiver = await this.prisma.guestWaiver.findFirst({
      where: { guestId: guest.id },
      orderBy: { acceptedAt: 'desc' },
    })

    const currentWaiverDoc = await this.prisma.waiverDocument.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
    })

    const waiverCurrent =
      latestWaiver != null &&
      latestWaiver.isCurrent &&
      (currentWaiverDoc == null || latestWaiver.waiverVersion === currentWaiverDoc.version)

    return {
      guest_id: guest.id,
      display_name: `${guest.firstName}${guest.lastName ? ' ' + guest.lastName : ''}`,
      waiver_current: waiverCurrent,
      member_id: memberId,
    }
  }
}
