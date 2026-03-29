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

function readRedirectTarget(formData: FormData, fallbackPath: string): string {
  const value = formData.get('redirectTo')
  if (typeof value !== 'string') return fallbackPath
  const trimmed = value.trim()
  return trimmed.startsWith('/') ? trimmed : fallbackPath
}

function toIsoOrNow(input: string | undefined): string {
  if (!input) return new Date().toISOString()
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid timestamp value')
  }
  return parsed.toISOString()
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

export async function moveLockerAction(formData: FormData) {
  const fromLockerId = formData.get('fromLockerId') as string
  try {
    const session = await withSession()
    const memberId = readRequired(formData, 'memberId')
    const toLockerId = readRequired(formData, 'toLockerId')

    await postWithAuth(
      '/lockers/move',
      {
        fromLockerId,
        toLockerId,
        memberId,
        staffUserId: session.user?.id,
      },
      session.accessToken!,
    )

    revalidatePath('/lockers')
    revalidatePath(`/lockers/${fromLockerId}`)
    revalidatePath(`/lockers/${toLockerId}`)
    redirect(`/lockers/${toLockerId}?ok=Locker+moved`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Move failed'
    redirect(`/lockers/${fromLockerId}?error=${encodeURIComponent(message)}`)
  }
}

export async function resolveAbandonedLockersAction(formData: FormData) {
  try {
    const session = await withSession()
    const siteId = readOptional(formData, 'siteId')

    const result = await postWithAuth(
      '/lockers/resolve-abandoned',
      { siteId },
      session.accessToken!,
    )

    const released = typeof result.released === 'number' ? result.released : 0
    revalidatePath('/lockers')
    redirect(`/lockers?ok=${encodeURIComponent(`Released ${released} abandoned locker(s)`)}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Resolve failed'
    redirect(`/lockers?error=${encodeURIComponent(message)}`)
  }
}

export async function createBookingAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/bookings')

  try {
    const session = await withSession()
    const memberId = readRequired(formData, 'memberId')
    const roomId = readRequired(formData, 'roomId')
    const bookingType = readRequired(formData, 'bookingType')
    const startsAt = toIsoOrNow(readRequired(formData, 'startsAt'))
    const endsAt = toIsoOrNow(readRequired(formData, 'endsAt'))
    const sourceType = readRequired(formData, 'sourceType')
    const sourceReference = readOptional(formData, 'sourceReference')

    await postWithAuth(
      '/bookings',
      { memberId, roomId, bookingType, startsAt, endsAt, sourceType, sourceReference },
      session.accessToken!,
    )

    revalidatePath('/bookings')
    revalidatePath(`/rooms/${roomId}`)
    redirect(`${redirectTo}?ok=${encodeURIComponent('Booking created')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create booking failed'
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function checkInBookingAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/bookings')

  try {
    const session = await withSession()
    const bookingId = readRequired(formData, 'bookingId')
    const occurredAt = toIsoOrNow(readOptional(formData, 'occurredAt'))

    await postWithAuth(`/bookings/${bookingId}/check-in`, { occurredAt }, session.accessToken!)

    revalidatePath('/bookings')
    revalidatePath('/rooms')
    redirect(`${redirectTo}?ok=${encodeURIComponent('Booking checked in')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Check-in failed'
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function checkOutBookingAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/bookings')

  try {
    const session = await withSession()
    const bookingId = readRequired(formData, 'bookingId')
    const occurredAt = toIsoOrNow(readOptional(formData, 'occurredAt'))

    await postWithAuth(`/bookings/${bookingId}/check-out`, { occurredAt }, session.accessToken!)

    revalidatePath('/bookings')
    revalidatePath('/rooms')
    redirect(`${redirectTo}?ok=${encodeURIComponent('Booking checked out')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Check-out failed'
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function cancelBookingAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/bookings')

  try {
    const session = await withSession()
    const bookingId = readRequired(formData, 'bookingId')
    const occurredAt = toIsoOrNow(readOptional(formData, 'occurredAt'))
    const reason = readOptional(formData, 'reason')

    await postWithAuth(`/bookings/${bookingId}/cancel`, { occurredAt, reason }, session.accessToken!)

    revalidatePath('/bookings')
    revalidatePath('/rooms')
    redirect(`${redirectTo}?ok=${encodeURIComponent('Booking cancelled')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cancel failed'
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function startCleaningTaskAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/cleaning')

  try {
    const session = await withSession()
    const taskId = readRequired(formData, 'taskId')
    const occurredAt = toIsoOrNow(readOptional(formData, 'occurredAt'))

    await postWithAuth(
      `/cleaning/tasks/${taskId}/start`,
      { occurredAt, assignedToStaffUserId: session.user?.id },
      session.accessToken!,
    )

    revalidatePath('/cleaning')
    redirect(`${redirectTo}?ok=${encodeURIComponent('Cleaning task started')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Task start failed'
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function completeCleaningTaskAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/cleaning')

  try {
    const session = await withSession()
    const taskId = readRequired(formData, 'taskId')
    const occurredAt = toIsoOrNow(readOptional(formData, 'occurredAt'))
    const notes = readOptional(formData, 'notes')

    await postWithAuth(
      `/cleaning/tasks/${taskId}/complete`,
      { occurredAt, notes },
      session.accessToken!,
    )

    revalidatePath('/cleaning')
    redirect(`${redirectTo}?ok=${encodeURIComponent('Cleaning task completed')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Task complete failed'
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function createRoomAccessEventAction(formData: FormData) {
  const roomId = readRequired(formData, 'roomId')
  const redirectTo = readRedirectTarget(formData, `/rooms/${roomId}`)

  try {
    const session = await withSession()
    const wristbandId = readRequired(formData, 'wristbandId')
    const eventType = readRequired(formData, 'eventType')
    const occurredAt = toIsoOrNow(readOptional(formData, 'occurredAt'))
    const sourceType = readOptional(formData, 'sourceType') ?? 'staff_console'
    const sourceReference = readOptional(formData, 'sourceReference')

    await postWithAuth(
      '/rooms/access',
      { roomId, wristbandId, eventType, occurredAt, sourceType, sourceReference },
      session.accessToken!,
    )

    revalidatePath(`/rooms/${roomId}`)
    redirect(`${redirectTo}?ok=${encodeURIComponent('Room access event recorded')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Room access event failed'
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}
