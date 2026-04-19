import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'
const KIOSK_SECRET = process.env.KIOSK_API_SECRET ?? ''

/**
 * Proxy POST /api/kiosk/ritual-guidance → API POST /kiosk/ritual-guidance
 * Kiosk client component calls this directly — no JWT, uses server-side kiosk secret.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${API_BASE}/kiosk/ritual-guidance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AO-Location': LOCATION_CODE,
      'x-ao-kiosk-secret': KIOSK_SECRET,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
