import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common'
import { IsString, IsIn } from 'class-validator'
import { KioskApiKeyGuard } from '../auth/guards/kiosk-api-key.guard'
import { BillingService } from '../stripe/billing.service'
import { VoiceService, VisitMode, RitualPhase } from '../voice/voice.service'
import { CreateVisitPaymentIntentDto } from '../stripe/dto/create-visit-payment-intent.dto'
import { KioskBookingService } from './kiosk-booking.service'

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

/**
 * Kiosk-specific API surface.
 * All routes here are protected by the shared KIOSK_API_SECRET header,
 * not by staff JWT — the kiosk server-action layer is the sole caller.
 *
 * POST /v1/kiosk/visit-payment     — create a Stripe PaymentIntent for a guest visit
 * POST /v1/kiosk/ritual-guidance   — Lane 2 TTS ritual coaching (George voice)
 * POST /v1/kiosk/booking-lookup    — find a booking by code or phone
 * POST /v1/kiosk/booking-checkin   — create a visit from a booking + payment intent if balance due
 */
@Controller('kiosk')
@UseGuards(KioskApiKeyGuard)
export class KioskController {
  constructor(
    private readonly billingService: BillingService,
    private readonly voiceService: VoiceService,
    private readonly kioskBookingService: KioskBookingService,
  ) {}

  @Post('visit-payment')
  @HttpCode(201)
  async createVisitPayment(@Body() dto: CreateVisitPaymentIntentDto) {
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
}
