'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import type { CreatedPersonalAccessToken, PersonalAccessToken } from '@/types/api'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

async function withSession() {
  const session = await getSession()
  if (!session.accessToken) throw new Error('Not authenticated')
  return session
}

export async function createPatAction(
  formData: FormData,
): Promise<{ token: CreatedPersonalAccessToken } | { error: string }> {
  const session = await withSession()

  const name = formData.get('name')
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { error: 'Token name is required' }
  }

  const expiresAtRaw = formData.get('expiresAt')
  const expiresAt =
    typeof expiresAtRaw === 'string' && expiresAtRaw.trim().length > 0
      ? expiresAtRaw.trim()
      : undefined

  const res = await fetch(`${API_BASE}/developer/pats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ name: name.trim(), expiresAt }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: body?.message ?? 'Failed to create token' }
  }

  const token = (await res.json()) as CreatedPersonalAccessToken
  revalidatePath('/developer')
  return { token }
}

export async function revokePatAction(
  id: string,
): Promise<{ pat: PersonalAccessToken } | { error: string }> {
  const session = await withSession()

  const res = await fetch(`${API_BASE}/developer/pats/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: body?.message ?? 'Failed to revoke token' }
  }

  const pat = (await res.json()) as PersonalAccessToken
  revalidatePath('/developer')
  return { pat }
}
