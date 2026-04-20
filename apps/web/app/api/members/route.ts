import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
const LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? 'AO_TORONTO'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const url = q ? `${API_BASE}/members?q=${encodeURIComponent(q)}` : `${API_BASE}/members`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}`, 'X-AO-Location': LOCATION_CODE },
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
