import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

export async function GET(
  _req: NextRequest,
  { params }: { params: { floorId: string } }
) {
  const session = await getSession()
  if (!session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(`${API_BASE}/map-studio/floors/${params.floorId}/live`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-AO-Location': LOCATION_CODE,
    },
    cache: 'no-store',
  })

  const body = await res.json()
  return NextResponse.json(body, { status: res.status })
}
