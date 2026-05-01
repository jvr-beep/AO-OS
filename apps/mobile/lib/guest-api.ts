import { API_BASE } from './config'

export interface CatalogTier {
  id: string
  code: string
  name: string
  productType: 'room' | 'locker'
  publicDescription: string | null
  basePriceCents: number
  durations: { id: string; durationMinutes: number; priceCents: number }[]
}

export interface BookingDetails {
  bookingId: string
  bookingCode: string
  status: string
  tierName: string
  productType: string
  durationMinutes: number
  arrivalWindowStart: string
  arrivalWindowEnd: string
  quotedPriceCents: number
  paidAmountCents: number
  balanceDueCents: number
}

async function guestFetch<T>(
  path: string,
  options?: RequestInit & { guestToken?: string },
): Promise<T> {
  const { guestToken, ...rest } = options ?? {}
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(guestToken ? { 'X-Guest-Token': guestToken } : {}),
      ...(rest.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = text
    try { msg = JSON.parse(text).message ?? text } catch { /* raw text */ }
    throw new Error(msg || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function getGuestCatalog(): Promise<CatalogTier[]> {
  return guestFetch('/guest-app/catalog')
}

export async function identifyGuest(dto: {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
}): Promise<{ guestId: string; guestToken: string; tokenExpiresAt: string }> {
  return guestFetch('/guest-app/identify', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export async function createBookingPaymentIntent(
  guestToken: string,
  dto: {
    tierId: string
    durationMinutes: number
    productType: 'room' | 'locker'
    currency?: string
  },
): Promise<{
  paymentIntentId: string | null
  clientSecret: string | null
  amountCents: number
  offline?: boolean
}> {
  return guestFetch('/guest-app/booking/payment-intent', {
    method: 'POST',
    guestToken,
    body: JSON.stringify(dto),
  })
}

export async function confirmGuestBooking(
  guestToken: string,
  dto: {
    paymentIntentId: string | null
    tierId: string
    durationMinutes: number
    productType: 'room' | 'locker'
    arrivalDate: string
  },
): Promise<{
  bookingId: string
  bookingCode: string
  arrivalWindowStart: string
  arrivalWindowEnd: string
  tierName: string
  durationMinutes: number
  paidAmountCents: number
}> {
  return guestFetch('/guest-app/booking/confirm', {
    method: 'POST',
    guestToken,
    body: JSON.stringify(dto),
  })
}

export async function getGuestBooking(bookingCode: string): Promise<BookingDetails> {
  return guestFetch(`/guest-app/booking/${bookingCode.toUpperCase()}`)
}

// Reuse public waiver endpoints
export async function getWaiverBody(): Promise<{ title: string; body: string; version: string }> {
  return guestFetch('/waivers/current/body')
}

export async function submitGuestWaiver(
  guestId: string,
  waiverVersion: string,
  signatureText: string,
): Promise<void> {
  await guestFetch(`/guests/${guestId}/waivers`, {
    method: 'POST',
    body: JSON.stringify({
      waiverVersion,
      acceptedChannel: 'web',
      signatureText,
    }),
  })
}
