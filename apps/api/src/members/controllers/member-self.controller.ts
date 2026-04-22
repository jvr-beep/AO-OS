import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { MemberSessionGuard } from '../../auth/guards/member-session.guard'
import { QrTokenService } from '../../kiosk/qr-token.service'

/**
 * Member self-service endpoints — authenticated via X-AO-Member-Session header.
 * These routes expose data about the currently-authenticated member only.
 */
@Controller('members/me')
@UseGuards(MemberSessionGuard)
export class MemberSelfController {
  constructor(private readonly qrTokenService: QrTokenService) {}

  /**
   * Issues a short-lived (5-min) HMAC-signed QR token for the current member.
   * The token encodes the memberId and is used by the kiosk to identify the
   * member without them typing anything.
   */
  @Get('qr-token')
  getQrToken(@Req() req: any): { token: string; expiresAt: string } {
    return this.qrTokenService.issue(req.memberId)
  }
}
