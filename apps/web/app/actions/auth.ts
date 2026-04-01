'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

async function doLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!res.ok) return null

  const data = await res.json()

  const session = await getSession()
  session.accessToken = data.accessToken
  session.user = {
    id: data.staffUser.id,
    email: data.staffUser.email,
    fullName: data.staffUser.fullName,
    role: data.staffUser.role,
  }
  await session.save()
  return true
}

/** Server action used by the legacy (non-JS) form fallback. */
export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const ok = await doLogin(email, password)
  if (!ok) redirect('/login?error=1')
  redirect('/dashboard')
}

/**
 * Server action used by `LoginClient` via `useFormState`.
 * Returns `{ error }` on failure so the client can show an inline message,
 * or redirects to /dashboard on success.
 */
export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const ok = await doLogin(email, password)
  if (!ok) return { error: 'Invalid email or password.' }

  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()
  await session.destroy()
  redirect('/login')
}
