import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { IronSession } from 'iron-session'

/**
 * Ephemeral kiosk session — tracks the in-progress guest visit across kiosk steps.
 * Short-lived: expires after 30 minutes if not completed.
 */
export interface KioskSessionData {
  guestId?: string
  visitId?: string
  folioId?: string
  productType?: 'locker' | 'room'
  tierCode?: string
  tierName?: string
  visitMode?: 'restore' | 'release' | 'retreat'
  amountCents?: number
  paymentIntentId?: string
  clientSecret?: string
  waiverCompleted?: boolean
  wristbandAssigned?: boolean
}

const KIOSK_SESSION_OPTIONS = {
  password: (() => {
    const secret = process.env.KIOSK_SESSION_SECRET ?? process.env.SESSION_SECRET
    if (!secret && process.env.NODE_ENV !== 'development') {
      throw new Error('KIOSK_SESSION_SECRET must be set for kiosk sessions')
    }
    return secret ?? 'dev-only-kiosk-session-secret-32!!'
  })(),
  cookieName: 'ao-kiosk-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60, // 30 minutes
  },
}

export async function getKioskSession(): Promise<IronSession<KioskSessionData>> {
  return getIronSession<KioskSessionData>(cookies(), KIOSK_SESSION_OPTIONS)
}
