'use server'

import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { reportErrorAction } from '@/app/actions/report-error'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

const LOCATION_HEADERS = {
  'Content-Type': 'application/json',
  'X-AO-Location': LOCATION_CODE,
}

// ── Step 1: Create or identify guest ────────────────────────────────────────

export async function identifyGuestAction(formData: FormData): Promise<void> {
  const firstName = formData.get('firstName')?.toString().trim()
  const lastName = formData.get('lastName')?.toString().trim()
  const email = formData.get('email')?.toString().trim().toLowerCase() || undefined
  const phone = formData.get('phone')?.toString().trim() || undefined

  if (!firstName) redirect('/kiosk?error=First+name+is+required')

  try {
    // Try lookup first to avoid duplicates
    if (email || phone) {
      const lookupRes = await fetch(`${API_BASE}/guests/lookup`, {
        method: 'POST',
        headers: LOCATION_HEADERS,
        body: JSON.stringify({ email, phone }),
      })
      if (lookupRes.ok) {
        const lookup = await lookupRes.json()
        if (lookup.matchType === 'exact' && lookup.guest) {
          const session = await getKioskSession()
          session.guestId = lookup.guest.id
          await session.save()
          redirect('/kiosk/waiver')
        }
      }
    }

    // Create new guest
    const createRes = await fetch(`${API_BASE}/guests`, {
      method: 'POST',
      headers: LOCATION_HEADERS,
      body: JSON.stringify({ firstName, lastName, email, phone }),
    })

    if (!createRes.ok) {
      const body = await createRes.json().catch(() => ({}))
      redirect(`/kiosk?error=${encodeURIComponent(body?.message ?? 'Failed to register guest')}`)
    }

    const guest = await createRes.json()
    const session = await getKioskSession()
    session.guestId = guest.id
    await session.save()
  } catch (err: any) {
    console.error(`[kiosk-error] identifyGuestAction: ${err?.message ?? err}`)
    await reportErrorAction({ message: err?.message ?? 'identifyGuestAction failed', page: '/kiosk', errorName: err?.name ?? 'KioskError', apiUrl: `${API_BASE}/guests` })
    redirect(`/kiosk?error=${encodeURIComponent(err.message ?? 'An error occurred')}`)
  }

  redirect('/kiosk/waiver')
}

// ── Step 2: Accept waiver ─────────────────────────────────────────────────

export async function acceptWaiverAction(formData: FormData): Promise<void> {
  const session = await getKioskSession()
  if (!session.guestId) redirect('/kiosk')

  // Returning guest reconfirm — waiver is still current, no new record needed
  if (formData.get('reconfirm') === 'true') {
    session.waiverCompleted = true
    await session.save()
    redirect('/kiosk/product')
  }

  const signature = formData.get('signature')?.toString().trim()
  if (!signature) redirect('/kiosk/waiver?error=Signature+required+to+accept+waiver')

  try {
    const res = await fetch(`${API_BASE}/guests/${session.guestId}/waivers`, {
      method: 'POST',
      headers: LOCATION_HEADERS,
      body: JSON.stringify({
        waiverVersion: 'AO-WAIVER-v1',
        acceptedChannel: 'kiosk',
        signatureText: signature,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      redirect(`/kiosk/waiver?error=${encodeURIComponent(body?.message ?? 'Failed to record waiver')}`)
    }

    session.waiverCompleted = true
    await session.save()
  } catch (err: any) {
    console.error(`[kiosk-error] acceptWaiverAction: ${err?.message ?? err}`)
    await reportErrorAction({ message: err?.message ?? 'acceptWaiverAction failed', page: '/kiosk/waiver', errorName: err?.name ?? 'KioskError', apiUrl: `${API_BASE}/guests/${session.guestId}/waivers` })
    redirect(`/kiosk/waiver?error=${encodeURIComponent(err.message ?? 'Waiver submission failed')}`)
  }

  redirect('/kiosk/product')
}

// ── Step 3: Choose product type (Locker vs Room) ──────────────────────────

export async function selectProductTypeAction(formData: FormData): Promise<void> {
  const session = await getKioskSession()
  if (!session.guestId || !session.waiverCompleted) redirect('/kiosk')

  const productType = formData.get('productType')?.toString()
  if (productType !== 'locker' && productType !== 'room') redirect('/kiosk/product')

  session.productType = productType
  await session.save()
  redirect('/kiosk/select')
}

// ── Step 4: Select tier + initiate visit ─────────────────────────────────

export async function selectTierAction(formData: FormData): Promise<void> {
  const session = await getKioskSession()
  if (!session.guestId || !session.waiverCompleted) redirect('/kiosk')
  if (!session.productType) redirect('/kiosk/product')

  const tierCode = formData.get('tierCode')?.toString()
  const tierName = formData.get('tierName')?.toString()
  const tierId = formData.get('tierId')?.toString()
  const durationMinutes = parseInt(formData.get('durationMinutes')?.toString() ?? '120', 10)
  const amountCents = parseInt(formData.get('amountCents')?.toString() ?? '0', 10)
  const visitMode = formData.get('visitMode')?.toString() || undefined

  if (!tierCode || !tierId) redirect('/kiosk/select?error=Please+select+a+tier')

  try {
    // Initiate visit
    const visitRes = await fetch(`${API_BASE}/visits`, {
      method: 'POST',
      headers: LOCATION_HEADERS,
      body: JSON.stringify({
        guest_id: session.guestId,
        source_type: 'walk_in',
        product_type: session.productType,
        tier_id: tierId,
        duration_minutes: durationMinutes,
        waiver_required: false, // already completed
        visit_mode: visitMode,
      }),
    })

    if (!visitRes.ok) {
      const body = await visitRes.json().catch(() => ({}))
      redirect(`/kiosk/select?error=${encodeURIComponent(body?.message ?? 'Failed to initiate visit')}`)
    }

    const visit = await visitRes.json()

    // Create payment intent via kiosk endpoint (shared secret, no JWT required)
    const paymentRes = await fetch(`${API_BASE}/kiosk/visit-payment`, {
      method: 'POST',
      headers: {
        ...LOCATION_HEADERS,
        'x-ao-kiosk-secret': process.env.KIOSK_API_SECRET ?? '',
      },
      body: JSON.stringify({
        visitId: visit.id,
        guestId: session.guestId,
        tierCode,
        amountCents,
      }),
    })

    if (!paymentRes.ok) {
      const body = await paymentRes.json().catch(() => ({}))
      redirect(`/kiosk/select?error=${encodeURIComponent(body?.message ?? 'Failed to create payment')}`)
    }

    const payment = await paymentRes.json()

    session.visitId = visit.id
    session.tierCode = tierCode
    session.tierId = tierId
    session.tierName = tierName
    session.visitMode = (visitMode as 'restore' | 'release' | 'retreat') || 'restore'
    session.amountCents = amountCents
    session.paymentIntentId = payment.paymentIntentId
    session.clientSecret = payment.clientSecret

    // Reserve a resource for this visit during the payment window
    const holdRes = await fetch(`${API_BASE}/kiosk/inventory-hold`, {
      method: 'POST',
      headers: {
        ...LOCATION_HEADERS,
        'x-ao-kiosk-secret': process.env.KIOSK_API_SECRET ?? '',
      },
      body: JSON.stringify({
        visit_id: visit.id,
        tier_id: tierId,
        product_type: session.productType,
        duration_minutes: durationMinutes,
      }),
    })

    if (holdRes.ok) {
      const hold = await holdRes.json()
      session.holdId = hold.id
      session.holdExpiresAt = hold.expiresAt
    }
    // Hold failure is non-fatal — proceed without hold, resource assigned at check-in

    await session.save()
  } catch (err: any) {
    console.error(`[kiosk-error] selectTierAction: ${err?.message ?? err}`)
    await reportErrorAction({ message: err?.message ?? 'selectTierAction failed', page: '/kiosk/select', errorName: err?.name ?? 'KioskError', apiUrl: `${API_BASE}/visits` })
    redirect(`/kiosk/select?error=${encodeURIComponent(err.message ?? 'Failed to set up your visit')}`)
  }

  redirect('/kiosk/payment')
}

// ── Booking path: look up booking by code or phone ───────────────────────

export async function lookupBookingAction(formData: FormData): Promise<void> {
  const lookupType = formData.get('lookup_type')?.toString()
  const value = formData.get('value')?.toString().trim()

  if (!value || (lookupType !== 'code' && lookupType !== 'phone')) {
    redirect('/kiosk/booking?error=Invalid+lookup')
  }

  try {
    const res = await fetch(`${API_BASE}/kiosk/booking-lookup`, {
      method: 'POST',
      headers: { ...LOCATION_HEADERS, 'x-ao-kiosk-secret': process.env.KIOSK_API_SECRET ?? '' },
      body: JSON.stringify({ lookup_type: lookupType, value }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      redirect(`/kiosk/booking?tab=${lookupType}&error=${encodeURIComponent(body?.message ?? 'Booking not found')}`)
    }

    const data = await res.json()
    const { booking, guest } = data

    const session = await getKioskSession()
    session.bookingSource = 'booking'
    session.bookingId = booking.id
    session.guestId = guest.id
    session.bookingData = {
      bookingCode: booking.booking_code,
      tierName: booking.tier_name,
      productType: booking.product_type,
      arrivalWindowStart: booking.arrival_window_start,
      arrivalWindowEnd: booking.arrival_window_end,
      durationMinutes: booking.duration_minutes,
      balanceDueCents: booking.balance_due_cents,
    }
    await session.save()
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/kiosk/booking?tab=${lookupType}&error=${encodeURIComponent(err?.message ?? 'Lookup failed')}`)
  }

  redirect('/kiosk/booking/confirm')
}

// ── Booking path: confirm check-in + create visit ────────────────────────

export async function confirmBookingCheckinAction(): Promise<void> {
  const session = await getKioskSession()
  if (!session.bookingId || !session.guestId) redirect('/kiosk/booking')

  try {
    const res = await fetch(`${API_BASE}/kiosk/booking-checkin`, {
      method: 'POST',
      headers: { ...LOCATION_HEADERS, 'x-ao-kiosk-secret': process.env.KIOSK_API_SECRET ?? '' },
      body: JSON.stringify({ booking_id: session.bookingId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      redirect(`/kiosk/booking/confirm?error=${encodeURIComponent(body?.message ?? 'Check-in failed')}`)
    }

    const data = await res.json()
    session.visitId = data.visit_id
    session.waiverCompleted = true // booking guests are pre-verified
    session.productType = (session.bookingData?.productType ?? 'locker') as 'locker' | 'room'

    if (data.client_secret) {
      session.amountCents = data.balance_due_cents
      session.paymentIntentId = data.payment_intent_id
      session.clientSecret = data.client_secret
    }

    await session.save()
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect(`/kiosk/booking/confirm?error=${encodeURIComponent(err?.message ?? 'Check-in failed')}`)
  }

  // Skip waiver for booked guests — go to payment if balance due, else assign
  const hasBalance = (session.clientSecret != null)
  redirect(hasBalance ? '/kiosk/payment' : '/kiosk/assign')
}

// ── Step 5: Complete visit after wristband assigned ───────────────────────

export async function completeKioskAction(): Promise<void> {
  const session = await getKioskSession()

  // Finalize resource hold → marks resource as occupied and visit as checked_in
  if (session.holdId && session.visitId) {
    try {
      await fetch(`${API_BASE}/kiosk/inventory-finalize`, {
        method: 'POST',
        headers: {
          ...LOCATION_HEADERS,
          'x-ao-kiosk-secret': process.env.KIOSK_API_SECRET ?? '',
        },
        body: JSON.stringify({ visit_id: session.visitId, hold_id: session.holdId }),
      })
    } catch {
      // Non-fatal — staff can finalize manually if needed
    }
  }

  session.wristbandAssigned = true
  await session.save()
  redirect('/kiosk/active')
}

// ── Reset kiosk session ───────────────────────────────────────────────────

export async function resetKioskAction(): Promise<void> {
  const session = await getKioskSession()
  session.destroy()
  redirect('/kiosk')
}
