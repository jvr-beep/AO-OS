/**
 * Member portal API client.
 * All calls include X-AO-Member-Session header from the server-side session.
 */

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

async function memberFetch<T>(
  path: string,
  sessionId: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-AO-Member-Session': sessionId,
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Member API ${path} failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<T>
}

export interface MemberProfile {
  id: string
  publicMemberNumber: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  status: string
  preferredName: string | null
  pronouns: string | null
  subscription: {
    id: string
    planCode: string
    planName: string
    tierRank: number
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
}

export interface ActiveVisit {
  id: string
  status: string
  tierName: string
  startTime: string | null
  scheduledEndTime: string | null
  durationMinutes: number
  visitMode: string | null
}

export interface VisitHistoryItem {
  id: string
  status: string
  tierName: string
  visitMode: string | null
  startTime: string | null
  actualEndTime: string | null
  durationMinutes: number
  createdAt: string
}

export interface MemberSubscription {
  id: string
  planCode: string
  planName: string
  description: string | null
  tierRank: number
  priceAmount: string
  currency: string
  billingInterval: string
  status: string
  startDate: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export function getMemberProfile(sessionId: string) {
  return memberFetch<MemberProfile>('/me', sessionId)
}

export function getActiveVisit(sessionId: string) {
  return memberFetch<ActiveVisit | null>('/me/visit', sessionId)
}

export function getVisitHistory(sessionId: string) {
  return memberFetch<VisitHistoryItem[]>('/me/visits', sessionId)
}

export function getMemberSubscription(sessionId: string) {
  return memberFetch<MemberSubscription | null>('/me/subscription', sessionId)
}

export async function memberLogin(email: string, password: string): Promise<{
  memberId: string
  session: { sessionId: string; expiresAt: string }
}> {
  const res = await fetch(`${API_BASE}/auth/member/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Invalid email or password')
  }

  return res.json()
}
