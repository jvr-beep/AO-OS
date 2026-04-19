import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { IronSession } from 'iron-session'

export interface MemberSessionData {
  sessionId?: string
  memberId?: string
  expiresAt?: string
  memberNumber?: string
}

const MEMBER_SESSION_OPTIONS = {
  password: (() => {
    const secret = process.env.MEMBER_SESSION_SECRET ?? process.env.SESSION_SECRET
    if (!secret && process.env.NODE_ENV !== 'development') {
      throw new Error('MEMBER_SESSION_SECRET must be set')
    }
    return secret ?? 'dev-only-member-session-secret!!'
  })(),
  cookieName: 'ao-member-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

export async function getMemberSession(): Promise<IronSession<MemberSessionData>> {
  return getIronSession<MemberSessionData>(cookies(), MEMBER_SESSION_OPTIONS)
}

export async function requireMemberSession(): Promise<IronSession<MemberSessionData> & Required<MemberSessionData>> {
  const session = await getMemberSession()
  if (!session.sessionId || !session.memberId) {
    throw new Error('REDIRECT_TO_MEMBER_LOGIN')
  }
  return session as IronSession<MemberSessionData> & Required<MemberSessionData>
}
