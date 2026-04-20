import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

export async function POST(req: NextRequest, { params }: { params: { floorId: string; versionId: string } }) {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/map-studio/floors/${params.floorId}/versions/${params.versionId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}`, 'X-AO-Location': LOCATION_CODE, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
