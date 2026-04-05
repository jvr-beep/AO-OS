'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import type { Role } from '@/types/api'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

type LoginResponse = {
  accessToken: string
  staffUser: {
    id: string
    email: string
    fullName: string
    role: Role
  }
}

type LoginResult =
  | { ok: true; data: LoginResponse }
  | { ok: false; error: string }

async function saveLoginSession(data: LoginResponse) {
  const session = await getSession()
  session.accessToken = data.accessToken
  session.user = {
    id: data.staffUser.id,
    email: data.staffUser.email,
    fullName: data.staffUser.fullName,
    role: data.staffUser.role,
  }
  await session.save()
}

async function doLogin(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.' }
  }

  let res: Response

  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, error: 'Could not sign in right now. Please try again.' }
  }

  if (!res.ok) {
    if (res.status === 401) {
      return { ok: false, error: 'Invalid email or password.' }
    }

    if (res.status === 403) {
      console.error('Staff login failed', { status: res.status, email })
      return { ok: false, error: 'Sign-in is currently blocked. Please contact support.' }
    }

    return { ok: false, error: 'Could not sign in right now. Please try again.' }
  }

  const data = await res.json() as LoginResponse
  return { ok: true, data }
}

export async function login(formData: FormData) {
  const result = await doLogin(formData)

  if (!result.ok) {
    redirect('/login?error=1')
  }

  await saveLoginSession(result.data)

  redirect('/dashboard')
}

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
) {
  const result = await doLogin(formData)

  if (!result.ok) {
    return { error: result.error }
  }

  await saveLoginSession(result.data)

  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()
  await session.destroy()
  redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    redirect('/login?reset=error')
  }

  const res = await fetch(`${API_BASE}/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    cache: 'no-store',
  })

  if (!res.ok) {
    redirect('/login?reset=error')
  }

  redirect('/login?reset=sent')
}
