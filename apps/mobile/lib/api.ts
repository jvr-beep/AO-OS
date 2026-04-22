import { API_BASE } from './config'
import { getSession } from './storage'

async function memberFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const session = await getSession()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'X-AO-Member-Session': session.sessionId } : {}),
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${path}: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function memberLogin(email: string, password: string): Promise<{
  memberId: string
  session: { sessionId: string; expiresAt: string }
}> {
  return memberFetch('/auth/member/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// ── Member profile ────────────────────────────────────────────────────────

export interface MemberProfile {
  id: string
  publicMemberNumber: string
  displayName: string | null
  firstName: string | null
  status: string
  preferredName: string | null
  subscription: {
    planName: string
    tierRank: number
    status: string
    currentPeriodEnd: string | null
  } | null
}

export async function getMemberProfile(): Promise<MemberProfile> {
  return memberFetch('/members/self')
}

// ── QR token ──────────────────────────────────────────────────────────────

export async function getQrToken(): Promise<{ token: string; expiresAt: string }> {
  return memberFetch('/members/me/qr-token')
}

// ── Waiver ────────────────────────────────────────────────────────────────

export interface WaiverDocument {
  version: string
  title: string
  body: string
}

export async function getCurrentWaiver(): Promise<WaiverDocument> {
  return memberFetch('/waivers/current/body')
}

export interface WaiverStatus {
  isValid: boolean
  waiverVersion: string | null
  acceptedAt: string | null
}

export async function getWaiverStatus(guestId: string): Promise<WaiverStatus> {
  return memberFetch(`/guests/${guestId}/waivers/latest`)
}

export async function submitWaiver(
  guestId: string,
  signatureData: string,
  waiverVersion: string,
): Promise<void> {
  await memberFetch(`/guests/${guestId}/waivers`, {
    method: 'POST',
    body: JSON.stringify({
      waiverVersion,
      acceptedChannel: 'mobile_app',
      signatureText: signatureData,
    }),
  })
}

// ── Visits ────────────────────────────────────────────────────────────────

export interface VisitSummary {
  id: string
  status: string
  tierName: string
  startTime: string | null
  scheduledEndTime: string | null
  durationMinutes: number
  visitMode: string | null
}

export async function getVisitHistory(): Promise<VisitSummary[]> {
  return memberFetch('/members/self/visits')
}
