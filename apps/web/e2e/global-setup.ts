import type { FullConfig } from '@playwright/test'

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:4000/v1'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@ao-os.dev'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'CiTestPass123!'

export default async function globalSetup(_config: FullConfig) {
  // Get admin token
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

  // Fetch first available tier so walk-in test can use it
  const tiersRes = await fetch(`${API_BASE}/catalog/tiers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (tiersRes.ok) {
    const tiers = await tiersRes.json() as Array<{ id: string; name: string }>
    if (tiers.length > 0) {
      process.env.E2E_TIER_ID = tiers[0].id
      process.env.E2E_TIER_NAME = tiers[0].name
    }
  }

  // Upsert a stable E2E test guest
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
  }

  console.log(`[e2e-setup] API: ${API_BASE} | admin: ${ADMIN_EMAIL} | guestId: ${guestId ?? 'not created'} | tierId: ${process.env.E2E_TIER_ID ?? 'none'}`)
}
