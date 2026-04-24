import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-AO-Location': LOCATION_CODE }
}

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const res = await fetch(`${API_BASE}/map-studio/floors`, { headers: headers(session.accessToken), cache: 'no-store' })
    const body = await res.text()
    try {
      return NextResponse.json(JSON.parse(body), { status: res.status })
    } catch {
      return NextResponse.json({ error: body || 'API error' }, { status: res.status || 502 })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reach API'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const res = await fetch(`${API_BASE}/map-studio/floors`, {
      method: 'POST',
      headers: headers(session.accessToken),
      body: JSON.stringify(body),
    })
    const resBody = await res.text()
    try {
      return NextResponse.json(JSON.parse(resBody), { status: res.status })
    } catch {
      return NextResponse.json({ error: resBody || 'API error' }, { status: res.status || 502 })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reach API'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
