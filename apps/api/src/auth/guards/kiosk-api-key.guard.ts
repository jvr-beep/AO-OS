import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

/**
 * Guard for kiosk-originated API calls.
 * Validates the `x-ao-kiosk-secret` header against KIOSK_API_SECRET env var.
 * Used on endpoints that the kiosk server-action layer calls directly
 * (no staff JWT, no member session — just shared secret between Next.js server and API).
 */
@Injectable()
export class KioskApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.KIOSK_API_SECRET
    if (!secret) throw new UnauthorizedException('Kiosk API not configured')

    const request = context.switchToHttp().getRequest()
    const provided = request.headers['x-ao-kiosk-secret']

    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid kiosk secret')
    }

    return true
  }
}
