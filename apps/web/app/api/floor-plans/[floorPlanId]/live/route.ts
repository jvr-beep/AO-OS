import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

/**
 * Proxy /api/floor-plans/:id/live → API GET /floor-plans/:id/live
 * The client component calls this with the staff JWT so it doesn't have to
 * expose the raw API URL to the browser.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { floorPlanId: string } }
) {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(`${API_BASE}/floor-plans/${params.floorPlanId}/live`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-AO-Location': LOCATION_CODE,
    },
    cache: 'no-store',
  })

  const body = await res.json()
  return NextResponse.json(body, { status: res.status })
}
