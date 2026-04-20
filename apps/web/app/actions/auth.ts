'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { reportErrorAction } from '@/app/actions/report-error'
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
  const email = String(formData.get('email') ?? '').trim()
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
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Invalid email or password.' }
    }

    return { ok: false, error: 'Could not sign in right now. Please try again.' }
  }

  const data = await res.json() as LoginResponse
  return { ok: true, data }
}

export async function login(formData: FormData) {
  const result = await doLogin(formData)

  if (!result.ok) {
    console.error(`[auth-error] login failed: ${result.error}`)
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
    console.error(`[auth-error] loginAction failed: ${result.error}`)
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

  const url = `${API_BASE}/auth/password-reset/request`
  console.log('[password-reset] calling', url)

  let res: Response

  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    })
    console.log('[password-reset] response status', res.status)
  } catch (err) {
    console.error('[password-reset] fetch error', err instanceof Error ? err.message : err)
    await reportErrorAction({
      message: err instanceof Error ? err.message : 'Password reset fetch failed',
      page: '/login',
      errorName: err instanceof Error ? err.name : 'NetworkError',
      apiUrl: url,
    })
    redirect('/login?reset=error')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[password-reset] non-ok response', res.status, body)
    await reportErrorAction({
      message: `Password reset request failed: HTTP ${res.status} — ${body}`,
      page: '/login',
      errorName: 'PasswordResetError',
      httpStatus: res.status,
      apiUrl: url,
    })
    redirect('/login?reset=error')
  }

  redirect('/login?reset=sent')
}

export async function confirmStaffPasswordReset(formData: FormData) {
  const token = String(formData.get('token') ?? '').trim()
  const newPassword = String(formData.get('newPassword') ?? '')

  if (!token || !newPassword) {
    redirect('/login?reset=error')
  }

  let res: Response

  try {
    res = await fetch(`${API_BASE}/auth/staff-password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
      cache: 'no-store',
    })
  } catch (err) {
    await reportErrorAction({
      message: err instanceof Error ? err.message : 'Staff password reset confirm failed',
      page: '/login',
      errorName: err instanceof Error ? err.name : 'NetworkError',
      apiUrl: `${API_BASE}/auth/staff-password-reset/confirm`,
    })
    redirect('/login?reset=error')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[auth-error] confirmStaffPasswordReset failed: HTTP ${res.status} — ${body}`)
    await reportErrorAction({
      message: `Staff password reset confirm failed: HTTP ${res.status} — ${body}`,
      page: '/login',
      errorName: 'StaffPasswordResetConfirmError',
      httpStatus: res.status,
      apiUrl: `${API_BASE}/auth/staff-password-reset/confirm`,
    })
    const isExpired = body.includes('EXPIRED_TOKEN')
    redirect(isExpired ? '/login?reset=expired' : '/login?reset=error')
  }

  redirect('/login?reset=confirmed')
}
