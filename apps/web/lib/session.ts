import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { IronSession } from 'iron-session'

export interface SessionData {
  accessToken?: string
  user?: {
    id: string
    email: string
    fullName: string
    role: 'front_desk' | 'operations' | 'admin'
  }
}

const SESSION_OPTIONS = {
  password: (() => {
    const secret = process.env.SESSION_SECRET
    if (!secret) {
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('SESSION_SECRET must be set in non-development environments')
      }
      console.warn('[session] SESSION_SECRET not set — using insecure dev fallback; set it in .env.local')
    }
    return secret ?? 'dev-only-fallback-secret-32chars!!'
  })(),
  cookieName: 'ao-os-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies(), SESSION_OPTIONS)
}
