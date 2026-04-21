const API = 'https://api.aosanctuary.com/v1'

function parseError(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback
  const msg = (body as Record<string, unknown>).message
  if (Array.isArray(msg)) return msg.join(', ')
  if (typeof msg === 'string') return msg
  return fallback
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(parseError(body, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function apiPost<T = unknown>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    throw new Error(parseError(b, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function apiPatch<T = unknown>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    throw new Error(parseError(b, `HTTP ${res.status}`))
  }
  return res.json()
}
