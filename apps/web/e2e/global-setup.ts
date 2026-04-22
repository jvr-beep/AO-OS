import type { FullConfig } from '@playwright/test'

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:4000/v1'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ao-os.dev'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'CiTestPass123!'
const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL ?? 'e2e-member@ao-os.test'
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD ?? 'E2eMemberPass1!'

export default async function globalSetup(_config: FullConfig) {
  // ── Admin token ───────────────────────────────────────────────────────────

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })

  if (!loginRes.ok) {
    throw new Error(`E2E global-setup: admin login failed HTTP ${loginRes.status} — is the API running at ${API_BASE}?`)
  }

  const { accessToken } = await loginRes.json() as { accessToken: string }
  process.env.E2E_ADMIN_TOKEN = accessToken

  // ── Fetch tiers ───────────────────────────────────────────────────────────

  const tiersRes = await fetch(`${API_BASE}/catalog/admin/tiers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  let tierId: string | undefined
  let tierProductType: string | undefined
  let tierCode: string | undefined
  let firstDurationMinutes: number | undefined

  if (tiersRes.ok) {
    const tiers = await tiersRes.json() as Array<{
      id: string
      name: string
      code: string
      productType: string
      active: boolean
      durationOptions: Array<{ id: string; durationMinutes: number; priceCents: number; active: boolean }>
    }>

    // Prefer an active tier with at least one active duration
    const activeTier = tiers.find(
      (t) => t.active && t.durationOptions.some((d) => d.active)
    ) ?? tiers[0]

    if (activeTier) {
      tierId = activeTier.id
      tierProductType = activeTier.productType
      tierCode = activeTier.code
      process.env.E2E_TIER_ID = activeTier.id
      process.env.E2E_TIER_NAME = activeTier.name
      process.env.E2E_TIER_PRODUCT_TYPE = activeTier.productType

      const activeDur = activeTier.durationOptions.find((d) => d.active) ?? activeTier.durationOptions[0]
      if (activeDur) {
        firstDurationMinutes = activeDur.durationMinutes
        process.env.E2E_DURATION_MINUTES = String(activeDur.durationMinutes)
      }
    }
  }

  // ── Upsert E2E test guest ─────────────────────────────────────────────────

  const guestLookupRes = await fetch(`${API_BASE}/guests/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ email: 'e2e-guest@ao-os.test' }),
  })

  let guestId: string | undefined

  if (guestLookupRes.ok) {
    const lookup = await guestLookupRes.json() as { guest?: { id: string } }
    guestId = lookup.guest?.id
  }

  if (!guestId) {
    const createRes = await fetch(`${API_BASE}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ firstName: 'E2E', lastName: 'TestGuest', email: 'e2e-guest@ao-os.test' }),
    })
    if (createRes.ok) {
      const guest = await createRes.json() as { id: string }
      guestId = guest.id
    }
  }

  if (guestId) {
    process.env.E2E_GUEST_ID = guestId

    // Accept current waiver so walk-in flow skips re-sign
    await fetch(`${API_BASE}/guests/${guestId}/waivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waiverVersion: 'AO-WAIVER-v1',
        acceptedChannel: 'staff',
        signatureText: 'E2E Test Guest',
      }),
    }).catch(() => { /* ok if already accepted */ })
  }

  // ── Create E2E booking (zero-balance, future date) ────────────────────────

  if (guestId && tierId && tierProductType && firstDurationMinutes !== undefined) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    const arrivalEnd = new Date(tomorrow)
    arrivalEnd.setHours(11, 0, 0, 0)

    const bookingRes = await fetch(`${API_BASE}/guest-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        guest_id: guestId,
        tier_id: tierId,
        product_type: tierProductType,
        booking_channel: 'staff',
        booking_date: tomorrow.toISOString().split('T')[0],
        arrival_window_start: tomorrow.toISOString(),
        arrival_window_end: arrivalEnd.toISOString(),
        duration_minutes: firstDurationMinutes,
        quoted_price_cents: 0,
      }),
    })

    if (bookingRes.ok) {
      const booking = await bookingRes.json() as { id: string; booking_code: string }
      process.env.E2E_BOOKING_ID = booking.id
      process.env.E2E_BOOKING_CODE = booking.booking_code
    }
  }

  // ── Seed verified test member ─────────────────────────────────────────────

  const seedRes = await fetch(`${API_BASE}/auth/dev/seed-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD }),
  })

  if (seedRes.ok) {
    const member = await seedRes.json() as { memberId: string }
    process.env.E2E_MEMBER_ID = member.memberId
    process.env.E2E_MEMBER_EMAIL = MEMBER_EMAIL
    process.env.E2E_MEMBER_PASSWORD = MEMBER_PASSWORD
  } else {
    console.warn(`[e2e-setup] member seed failed: HTTP ${seedRes.status} — member portal tests will skip`)
  }

  console.log(
    `[e2e-setup] API: ${API_BASE} | admin: ${ADMIN_EMAIL} | ` +
    `guestId: ${guestId ?? 'none'} | tierId: ${tierId ?? 'none'} | ` +
    `bookingCode: ${process.env.E2E_BOOKING_CODE ?? 'none'} | ` +
    `memberId: ${process.env.E2E_MEMBER_ID ?? 'none'}`
  )
}
