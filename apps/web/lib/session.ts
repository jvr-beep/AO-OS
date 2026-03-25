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
  password: process.env.SESSION_SECRET ?? 'fallback-secret-must-be-32-chars!!',
  cookieName: 'ao-os-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies(), SESSION_OPTIONS)
}
