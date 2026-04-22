import { NextResponse } from 'next/server'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

export async function GET() {
  const res = await fetch(`${API_BASE}/catalog/tiers?active=true`, { cache: 'no-store' })
  const data = await res.json().catch(() => [])
  return NextResponse.json(data, { status: res.status })
}
