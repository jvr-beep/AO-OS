import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as crypto from 'crypto'

const TTL_SECONDS = 30 * 60 // 30 minutes

export interface GuestTokenPayload {
  guestId: string
  exp: number
}

@Injectable()
export class GuestTokenService {
  private readonly secret: string

  constructor() {
    this.secret =
      process.env.GUEST_TOKEN_SECRET ??
      process.env.SESSION_SECRET ??
      'dev-guest-token-secret-change-me'
  }

  issue(guestId: string): { token: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
    const payload: GuestTokenPayload = { guestId, exp }
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = crypto.createHmac('sha256', this.secret).update(b64).digest('base64url')
    return {
      token: `${b64}.${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    }
  }

  verify(token: string): GuestTokenPayload {
    const parts = token.split('.')
    if (parts.length !== 2) throw new UnauthorizedException('Invalid guest token')
    const [b64, sig] = parts
    const expected = crypto.createHmac('sha256', this.secret).update(b64).digest('base64url')
    if (sig !== expected) throw new UnauthorizedException('Invalid guest token')
    let payload: GuestTokenPayload
    try {
      payload = JSON.parse(Buffer.from(b64, 'base64url').toString())
    } catch {
      throw new UnauthorizedException('Invalid guest token')
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Guest session expired — please start over')
    }
    return payload
  }
}
