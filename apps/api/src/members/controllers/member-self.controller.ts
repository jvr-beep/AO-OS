import { Controller, Get, Req, UseGuards, Logger } from '@nestjs/common'
import { MemberSessionGuard } from '../../auth/guards/member-session.guard'
import { QrTokenService } from '../../kiosk/qr-token.service'

@Controller('members/me')
@UseGuards(MemberSessionGuard)
export class MemberSelfController {
  private readonly logger = new Logger(MemberSelfController.name)

  constructor(private readonly qrTokenService: QrTokenService) {}

  @Get('qr-token')
  getQrToken(@Req() req: any): { token: string; expiresAt: string } {
    this.logger.log(`QR token issued for member ${req.memberId}`)
    return this.qrTokenService.issue(req.memberId)
  }
}
