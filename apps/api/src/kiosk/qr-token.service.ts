import { Injectable, BadRequestException } from '@nestjs/common'
import * as crypto from 'crypto'

const TTL_SECONDS = 5 * 60 // 5 minutes

export interface QrTokenPayload {
  memberId: string
  exp: number
}

@Injectable()
export class QrTokenService {
  private readonly secret: string

  constructor() {
    this.secret =
      process.env.QR_TOKEN_SECRET ??
      process.env.SESSION_SECRET ??
      'dev-qr-token-secret-change-me'
  }

  issue(memberId: string): { token: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
    const payload: QrTokenPayload = { memberId, exp }
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = crypto.createHmac('sha256', this.secret).update(b64).digest('base64url')
    return {
      token: `${b64}.${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    }
  }

  verify(token: string): QrTokenPayload {
    const parts = token.split('.')
    if (parts.length !== 2) throw new BadRequestException('QR code not recognised — please try again')
    const [b64, sig] = parts
    const expected = crypto.createHmac('sha256', this.secret).update(b64).digest('base64url')
    if (sig !== expected) throw new BadRequestException('QR code not recognised — please try again')
    let payload: QrTokenPayload
    try {
      payload = JSON.parse(Buffer.from(b64, 'base64url').toString())
    } catch {
      throw new BadRequestException('QR code not recognised — please try again')
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('QR code expired — please refresh the AO app and try again')
    }
    return payload
  }
}
