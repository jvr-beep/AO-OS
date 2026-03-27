'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

function readRequired(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}

function readOptional(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function postWithAuth(path: string, body: Record<string, unknown>, accessToken: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    const rawMessage = payload?.message
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.join(', ')
          : res.statusText

    throw new Error(`${res.status} ${message}`)
  }

  return payload as Record<string, unknown>
}

async function withSession() {
  const session = await getSession()

  if (!session.accessToken || !session.user) {
    redirect('/login')
  }

  return session
}

export async function issueCredentialAction(formData: FormData) {
  try {
    const session = await withSession()
    const uid = readRequired(formData, 'uid')
    const memberId = readRequired(formData, 'memberId')

    await postWithAuth('/wristbands/issue', { uid, memberId }, session.accessToken!)
    revalidatePath('/wristbands')
    redirect('/wristbands?ok=Credential+issued')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Issue failed'
    redirect(`/wristbands?error=${encodeURIComponent(message)}`)
  }
}

export async function activateCredentialAction(formData: FormData) {
  try {
    const session = await withSession()
    const credentialId = readRequired(formData, 'credentialId')

    await postWithAuth('/wristbands/activate', { credentialId }, session.accessToken!)
    revalidatePath('/wristbands')
    redirect('/wristbands?ok=Credential+activated')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Activate failed'
    redirect(`/wristbands?error=${encodeURIComponent(message)}`)
  }
}

export async function suspendCredentialAction(formData: FormData) {
  try {
    const session = await withSession()
    const credentialId = readRequired(formData, 'credentialId')

    await postWithAuth('/wristbands/suspend', { credentialId }, session.accessToken!)
    revalidatePath('/wristbands')
    redirect('/wristbands?ok=Credential+suspended')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Suspend failed'
    redirect(`/wristbands?error=${encodeURIComponent(message)}`)
  }
}

export async function replaceCredentialAction(formData: FormData) {
  try {
    const session = await withSession()
    const oldCredentialId = readRequired(formData, 'oldCredentialId')
    const newCredentialUid = readRequired(formData, 'newCredentialUid')

    await postWithAuth(
      '/wristbands/replace',
      { oldCredentialId, newCredentialUid },
      session.accessToken!,
    )
    revalidatePath('/wristbands')
    redirect('/wristbands?ok=Credential+replaced')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Replace failed'
    redirect(`/wristbands?error=${encodeURIComponent(message)}`)
  }
}

export async function evaluateLockerPolicyAction(formData: FormData) {
  try {
    const session = await withSession()
    const memberId = readRequired(formData, 'memberId')
    const credentialId = readRequired(formData, 'credentialId')
    const siteId = readRequired(formData, 'siteId')
    const sessionId = readRequired(formData, 'sessionId')
    const requestMode = readRequired(formData, 'requestMode')
    const requestedZoneId = readOptional(formData, 'requestedZoneId')
    const requestedLockerId = readOptional(formData, 'requestedLockerId')
    const staffOverrideReason = readOptional(formData, 'staffOverrideReason')

    const payload = await postWithAuth(
      '/lockers/policy/evaluate',
      {
        memberId,
        credentialId,
        siteId,
        sessionId,
        requestMode,
        requestedZoneId,
        requestedLockerId,
        staffOverride: requestMode === 'staff_override',
        staffOverrideReason,
      },
      session.accessToken!,
    )

    revalidatePath('/lockers')

    const decision = typeof payload.decision === 'string' ? payload.decision : 'unknown'
    const reasonCode = typeof payload.reasonCode === 'string' ? payload.reasonCode : 'n/a'
    const chosenLockerId =
      typeof payload.chosenLockerId === 'string' ? payload.chosenLockerId : 'none'

    redirect(
      `/lockers?ok=${encodeURIComponent(
        `Policy ${decision} (${reasonCode}), chosen=${chosenLockerId}`,
      )}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Policy evaluate failed'
    redirect(`/lockers?error=${encodeURIComponent(message)}`)
  }
}

export async function assignLockerAction(formData: FormData) {
  try {
    const session = await withSession()
    const lockerId = readRequired(formData, 'lockerId')
    const memberId = readRequired(formData, 'memberId')
    const siteId = readOptional(formData, 'siteId')
    const visitSessionId = readOptional(formData, 'visitSessionId')
    const assignmentMode = readOptional(formData, 'assignmentMode') ?? 'assigned'
    const requestedZoneId = readOptional(formData, 'requestedZoneId')
    const requestedLockerId = readOptional(formData, 'requestedLockerId')
    const staffOverrideReason = readOptional(formData, 'staffOverrideReason')

    await postWithAuth(
      '/lockers/assign',
      {
        lockerId,
        memberId,
        siteId,
        visitSessionId,
        assignmentMode,
        requestedZoneId,
        requestedLockerId,
        staffOverrideReason,
        assignedByStaffUserId: session.user?.id,
      },
      session.accessToken!,
    )

    revalidatePath('/lockers')
    revalidatePath(`/lockers/${lockerId}`)
    redirect('/lockers?ok=Locker+assigned')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assign failed'
    redirect(`/lockers?error=${encodeURIComponent(message)}`)
  }
}

export async function unassignLockerAction(formData: FormData) {
  try {
    const session = await withSession()
    const lockerId = readRequired(formData, 'lockerId')
    const unassignedReason = readOptional(formData, 'unassignedReason')

    await postWithAuth(
      '/lockers/unassign',
      { lockerId, unassignedReason },
      session.accessToken!,
    )

    revalidatePath('/lockers')
    revalidatePath(`/lockers/${lockerId}`)
    redirect('/lockers?ok=Locker+released')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Release failed'
    redirect(`/lockers?error=${encodeURIComponent(message)}`)
  }
}
