'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { reportErrorAction } from '@/app/actions/report-error'

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

async function reportActionError(error: unknown, page: string, apiPath?: string) {
  const message = error instanceof Error ? error.message : String(error)
  const errorName = error instanceof Error ? error.name : 'OperatorActionError'
  const httpStatus = message.match(/^(\d{3}) /) ? parseInt(message.slice(0, 3), 10) : undefined
  await reportErrorAction({
    message,
    page,
    errorName,
    httpStatus,
    apiUrl: apiPath ? `${API_BASE}${apiPath}` : undefined,
  })
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
    await reportActionError(error, '/wristbands', '/wristbands/issue')
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
    await reportActionError(error, '/wristbands', '/wristbands/activate')
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
    await reportActionError(error, '/wristbands', '/wristbands/suspend')
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
    await reportActionError(error, '/wristbands', '/wristbands/replace')
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
    await reportActionError(error, '/lockers', '/lockers/policy/evaluate')
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
    await reportActionError(error, '/lockers', '/lockers/assign')
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
    await reportActionError(error, '/lockers', '/lockers/unassign')
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
    await reportActionError(error, `/lockers/${fromLockerId}`, '/lockers/move')
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
    await reportActionError(error, '/lockers', '/lockers/resolve-abandoned')
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
    await reportActionError(error, redirectTo, '/bookings')
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
    await reportActionError(error, redirectTo)
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
    await reportActionError(error, redirectTo)
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
    await reportActionError(error, redirectTo)
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
    await reportActionError(error, redirectTo)
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
    await reportActionError(error, redirectTo)
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function createGuestAction(formData: FormData) {
  try {
    const session = await withSession()
    const firstName = readRequired(formData, 'firstName')
    const lastName = readOptional(formData, 'lastName')
    const email = readOptional(formData, 'email')
    const phone = readOptional(formData, 'phone')

    const result = await postWithAuth(
      '/guests',
      { firstName, lastName, email, phone },
      session.accessToken!,
    )

    const guestId = typeof result.id === 'string' ? result.id : ''
    redirect(`/guests/${guestId}?ok=${encodeURIComponent('Guest created')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create guest failed'
    await reportActionError(error, '/guests', '/guests')
    redirect(`/guests?error=${encodeURIComponent(message)}`)
  }
}

export async function guestBookingCheckInAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/check-in')

  try {
    const session = await withSession()
    const bookingId = readOptional(formData, 'bookingId')
    const bookingCode = readOptional(formData, 'bookingCode')

    if (!bookingId && !bookingCode) {
      throw new Error('bookingId or bookingCode is required')
    }

    const result = await postWithAuth(
      '/orchestrators/check-in/booking',
      { booking_id: bookingId, booking_code: bookingCode, changed_by_user_id: session.user?.id },
      session.accessToken!,
    )

    const visitId = typeof result.visit_id === 'string' ? result.visit_id : ''
    revalidatePath('/check-in')
    revalidatePath('/visits')
    redirect(`/visits/${visitId}?ok=${encodeURIComponent('Guest checked in from booking')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Booking check-in failed'
    await reportActionError(error, redirectTo, '/orchestrators/check-in/booking')
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function guestWalkInCheckInAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/check-in')

  try {
    const session = await withSession()
    const guestId = readRequired(formData, 'guestId')
    const tierId = readRequired(formData, 'tierId')
    const productType = readRequired(formData, 'productType')
    const durationMinutes = parseInt(readRequired(formData, 'durationMinutes'), 10)
    const quotedPriceCents = parseInt(readRequired(formData, 'quotedPriceCents'), 10)
    const amountPaidCents = parseInt(readOptional(formData, 'amountPaidCents') ?? '0', 10)
    const paymentProvider = readOptional(formData, 'paymentProvider') ?? 'cash'

    const result = await postWithAuth(
      '/orchestrators/check-in/walk-in',
      {
        guest_id: guestId,
        tier_id: tierId,
        product_type: productType,
        duration_minutes: durationMinutes,
        quoted_price_cents: quotedPriceCents,
        amount_paid_cents: amountPaidCents,
        payment_provider: paymentProvider,
        changed_by_user_id: session.user?.id,
      },
      session.accessToken!,
    )

    const visitId = typeof result.visit_id === 'string' ? result.visit_id : ''
    revalidatePath('/check-in')
    revalidatePath('/visits')
    redirect(`/visits/${visitId}?ok=${encodeURIComponent('Walk-in checked in')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Walk-in check-in failed'
    await reportActionError(error, redirectTo, '/orchestrators/check-in/walk-in')
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function guestCheckoutAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/check-in')

  try {
    const session = await withSession()
    const visitId = readRequired(formData, 'visitId')
    const checkOutChannel = readOptional(formData, 'checkOutChannel') ?? 'staff'

    await postWithAuth(
      '/orchestrators/checkout',
      {
        visit_id: visitId,
        check_out_channel: checkOutChannel,
        changed_by_user_id: session.user?.id,
      },
      session.accessToken!,
    )

    revalidatePath('/check-in')
    revalidatePath('/visits')
    revalidatePath(`/visits/${visitId}`)
    redirect(`/visits/${visitId}?ok=${encodeURIComponent('Guest checked out')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed'
    await reportActionError(error, redirectTo, '/orchestrators/checkout')
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function addFolioLineItemAction(formData: FormData) {
  const folioId = readRequired(formData, 'folioId')
  const redirectTo = readRedirectTarget(formData, '/visits')

  try {
    const session = await withSession()
    const lineType = readRequired(formData, 'lineType')
    const description = readRequired(formData, 'description')
    const quantity = parseInt(readOptional(formData, 'quantity') ?? '1', 10)
    const unitAmountCents = parseInt(readRequired(formData, 'unitAmountCents'), 10)

    await postWithAuth(
      `/folios/${folioId}/line-items`,
      { line_type: lineType, description, quantity, unit_amount_cents: unitAmountCents },
      session.accessToken!,
    )

    revalidatePath(redirectTo)
    redirect(`${redirectTo}?ok=${encodeURIComponent('Line item added')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Add line item failed'
    await reportActionError(error, redirectTo, `/folios/${folioId}/line-items`)
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

export async function recordFolioPaymentAction(formData: FormData) {
  const folioId = readRequired(formData, 'folioId')
  const redirectTo = readRedirectTarget(formData, '/visits')

  try {
    const session = await withSession()
    const paymentProvider = readRequired(formData, 'paymentProvider')
    const transactionType = readOptional(formData, 'transactionType') ?? 'sale'
    const amountCents = parseInt(readRequired(formData, 'amountCents'), 10)

    await postWithAuth(
      `/folios/${folioId}/payments`,
      { payment_provider: paymentProvider, transaction_type: transactionType, amount_cents: amountCents, status: 'succeeded' },
      session.accessToken!,
    )

    revalidatePath(redirectTo)
    redirect(`${redirectTo}?ok=${encodeURIComponent('Payment recorded')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Record payment failed'
    await reportActionError(error, redirectTo, `/folios/${folioId}/payments`)
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}

/**
 * Assign wristband and activate a kiosk-originated visit in one step.
 * Transitions: paid_pending_assignment → checked_in → active
 * Sets start_time and scheduled_end_time on the visit.
 */
export async function assignKioskVisitAction(formData: FormData) {
  const redirectTo = readRedirectTarget(formData, '/check-in')

  try {
    const session = await withSession()
    const visitId = readRequired(formData, 'visitId')

    async function patchStatus(status: string, reasonCode: string) {
      const res = await fetch(`${API_BASE}/visits/${visitId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken!}`,
        },
        body: JSON.stringify({ status, reason_code: reasonCode, changed_by_user_id: session.user?.id }),
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? `Status transition to ${status} failed`)
      }
      return res.json()
    }

    // paid_pending_assignment → checked_in → active
    await patchStatus('checked_in', 'wristband_assigned')
    await patchStatus('active', 'visit_activated')

    revalidatePath('/check-in')
    revalidatePath('/visits')
    revalidatePath(`/visits/${visitId}`)
    redirect(`${redirectTo}?ok=${encodeURIComponent('Visit activated — wristband issued')}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assign failed'
    await reportActionError(error, redirectTo)
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
    await reportActionError(error, redirectTo, '/rooms/access')
    redirect(`${redirectTo}?error=${encodeURIComponent(message)}`)
  }
}
