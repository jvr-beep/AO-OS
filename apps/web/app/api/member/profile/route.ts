import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/member-session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

export async function PATCH(req: NextRequest) {
  const session = await getMemberSession()
  if (!session.sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const res = await fetch(`${API_BASE}/me/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-AO-Member-Session': session.sessionId,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
