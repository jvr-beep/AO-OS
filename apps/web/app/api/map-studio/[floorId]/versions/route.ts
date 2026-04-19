import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-AO-Location': LOCATION_CODE }
}

export async function GET(_req: NextRequest, { params }: { params: { floorId: string } }) {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = await fetch(`${API_BASE}/map-studio/floors/${params.floorId}/versions`, { headers: headers(session.accessToken), cache: 'no-store' })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(req: NextRequest, { params }: { params: { floorId: string } }) {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const res = await fetch(`${API_BASE}/map-studio/floors/${params.floorId}/versions`, {
    method: 'POST',
    headers: headers(session.accessToken),
    body: JSON.stringify(body),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
