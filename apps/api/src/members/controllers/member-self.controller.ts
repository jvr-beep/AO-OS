import { Body, Controller, Get, NotFoundException, Post, Req, UseGuards, Logger } from '@nestjs/common'
import { MemberSessionGuard } from '../../auth/guards/member-session.guard'
import { QrTokenService } from '../../kiosk/qr-token.service'
import { BookingsService } from '../../bookings/services/bookings.service'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('members/me')
@UseGuards(MemberSessionGuard)
export class MemberSelfController {
  private readonly logger = new Logger(MemberSelfController.name)

  constructor(
    private readonly qrTokenService: QrTokenService,
    private readonly bookingsService: BookingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('qr-token')
  getQrToken(@Req() req: any): { token: string; expiresAt: string } {
    this.logger.log(`QR token issued for member ${req.memberId}`)
    return this.qrTokenService.issue(req.memberId)
  }

  @Get('bookings')
  async getMemberBookings(@Req() req: any) {
    const member = await this.prisma.member.findUnique({ where: { id: req.memberId } })
    if (!member) throw new NotFoundException('Member not found')
    if (!member.email && !member.phone) return []

    const guest = await this.prisma.guest.findFirst({
      where: member.email ? { email: member.email } : { phone: member.phone },
    })
    if (!guest) return []

    return this.bookingsService.listGuestBookings(guest.id, {})
  }

  @Post('bookings')
  async createMemberBooking(
    @Req() req: any,
    @Body() body: {
      tier_id: string
      duration_minutes: number
      booking_date: string
      arrival_window_start: string
      arrival_window_end: string
    },
  ) {
    const member = await this.prisma.member.findUnique({ where: { id: req.memberId } })
    if (!member) throw new NotFoundException('Member not found')

    // Find or create linked guest record
    let guest = member.email
      ? await this.prisma.guest.findFirst({ where: { email: member.email } })
      : member.phone
        ? await this.prisma.guest.findFirst({ where: { phone: member.phone } })
        : null

    if (!guest) {
      guest = await this.prisma.guest.create({
        data: {
          firstName: member.firstName ?? 'Member',
          lastName: member.lastName ?? null,
          email: member.email ?? null,
          phone: member.phone ?? null,
        },
      })
      this.logger.log(`Auto-created guest ${guest.id} for member ${req.memberId}`)
    }

    const tier = await this.prisma.tier.findUnique({ where: { id: body.tier_id } })
    if (!tier || !tier.active) throw new NotFoundException('Tier not found or inactive')

    const durationOption = await this.prisma.tierDurationOption.findFirst({
      where: { tierId: body.tier_id, durationMinutes: body.duration_minutes, active: true },
    })
    const quotedPriceCents = durationOption?.priceCents ?? tier.basePriceCents

    this.logger.log(`Member ${req.memberId} booking tier ${body.tier_id} for ${body.duration_minutes}min`)

    return this.bookingsService.createBooking({
      guest_id: guest.id,
      tier_id: body.tier_id,
      product_type: tier.productType,
      booking_channel: 'web',
      booking_date: body.booking_date,
      arrival_window_start: body.arrival_window_start,
      arrival_window_end: body.arrival_window_end,
      duration_minutes: body.duration_minutes,
      quoted_price_cents: quotedPriceCents,
    })
  }
}
