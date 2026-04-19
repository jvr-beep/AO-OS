'use server'

import { redirect } from 'next/navigation'
import { getApiBase } from '@/lib/api-base'
import { getSession } from '@/lib/session'
import { reportErrorAction } from '@/app/actions/report-error'
import type { Role } from '@/types/api'

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

function resolveLoginError(status: number, failureBody: Record<string, unknown>): string {
  const rawMessage = failureBody.message
  const message =
    typeof rawMessage === 'string'
      ? rawMessage.toLowerCase()
      : Array.isArray(rawMessage)
        ? rawMessage.join(' ').toLowerCase()
        : ''

  if (status === 401) {
    return 'Invalid email or password.'
  }

  if (status === 403 && /(inactive|blocked|disabled)/.test(message)) {
    return 'Sign-in is currently blocked. Please contact support.'
  }

  return 'Could not sign in right now. Please try again.'
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim().toLowerCase()
}

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

export async function persistLoginSession(data: LoginResponse) {
  await saveLoginSession(data)
  return { ok: true as const }
}

async function doLogin(formData: FormData): Promise<LoginResult> {
  const apiBase = getApiBase()
  const email = normalizeEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.' }
  }

  let res: Response

  try {
    res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, error: 'Could not sign in right now. Please try again.' }
  }

  if (!res.ok) {
    const failureBody = await res.json().catch(() => ({} as Record<string, unknown>))
    console.error('Staff login failed', {
      apiBase,
      status: res.status,
      message: typeof failureBody.message === 'string' ? failureBody.message : null,
    })

    return { ok: false, error: resolveLoginError(res.status, failureBody) }
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
  const apiBase = getApiBase()
  const email = normalizeEmail(formData.get('email'))

  if (!email) {
    redirect('/login?reset=error')
  }

  let res: Response

  try {
    res = await fetch(`${apiBase}/auth/staff-password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('Staff password reset request failed to reach API', {
      apiBase,
      email,
      error: error instanceof Error ? error.message : 'unknown_error',
    })
    redirect('/login?reset=error')
  }

  if (!res.ok) {
    const failureBody = await res.json().catch(() => ({} as Record<string, unknown>))
    console.error('Staff password reset request failed', {
      apiBase,
      email,
      status: res.status,
      message: typeof failureBody.message === 'string' ? failureBody.message : null,
    })
    redirect('/login?reset=error')
  }

  redirect('/login?reset=sent')
}

function buildResetPasswordUrl(token: string, state: 'invalid' | 'error' | 'mismatch') {
  const params = new URLSearchParams({ resetToken: token, reset: state })
  return `/login?${params.toString()}`
}

export async function confirmStaffPasswordReset(formData: FormData) {
  const apiBase = getApiBase()
  const token = String(formData.get('token') ?? '').trim()
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (!token) {
    redirect('/login?reset=invalid')
  }

  if (newPassword.length < 8) {
    redirect(buildResetPasswordUrl(token, 'error'))
  }

  if (newPassword !== confirmPassword) {
    redirect(buildResetPasswordUrl(token, 'mismatch'))
  }

  let res: Response

  try {
    res = await fetch(`${apiBase}/auth/staff-password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('Staff password reset confirm failed to reach API', {
      apiBase,
      error: error instanceof Error ? error.message : 'unknown_error',
    })
    redirect(buildResetPasswordUrl(token, 'error'))
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      redirect(buildResetPasswordUrl(token, 'invalid'))
    }

    redirect(buildResetPasswordUrl(token, 'error'))
  }

  redirect('/login?reset=confirmed')
}
