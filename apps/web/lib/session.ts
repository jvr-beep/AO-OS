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
  const cookieStore = cookies()

  try {
    return await getIronSession<SessionData>(cookieStore, SESSION_OPTIONS)
  } catch (error) {
    console.error('Failed to read session cookie', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    const fallbackCookieStore = {
      ...cookieStore,
      get(name: string) {
        if (name === SESSION_OPTIONS.cookieName) {
          return undefined
        }

        return cookieStore.get(name)
      },
      getAll(name?: string) {
        if (name === SESSION_OPTIONS.cookieName) {
          return []
        }

        return typeof name === 'string' ? cookieStore.getAll(name) : cookieStore.getAll()
      },
      has(name: string) {
        if (name === SESSION_OPTIONS.cookieName) {
          return false
        }

        return cookieStore.has(name)
      },
    }

    return getIronSession<SessionData>(
      fallbackCookieStore as typeof cookieStore,
      SESSION_OPTIONS,
    )
  }
}
