'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ApiError, apiFetch } from '@/lib/api'

type AuthenticatedSession = {
  accessToken: string
  user: NonNullable<Awaited<ReturnType<typeof getSession>>['user']>
}

function readRequired(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}

function readOptional(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function requireSession() {
  const session = await getSession()

  if (!session.accessToken || !session.user) {
    redirect('/login')
  }

  return {
    accessToken: session.accessToken,
    user: session.user,
  } satisfies AuthenticatedSession
}

function getStaffActionErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback
  }

  switch (error.message) {
    case 'STAFF_USER_EMAIL_TAKEN':
      return 'A staff user with that email already exists.'
    case 'CANNOT_REMOVE_LAST_ACTIVE_ADMIN':
      return 'You cannot deactivate the last active admin.'
    case 'STAFF_USER_NOT_FOUND':
      return 'That staff user no longer exists.'
    default:
      return fallback
  }
}

function redirectIfSessionExpired(error: unknown): never | void {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    redirect('/login')
  }
}

export async function provisionStaffUserAction(formData: FormData) {
  try {
    const session = await requireSession()

    if (session.user.role !== 'admin') {
      redirect('/dashboard')
    }

    const email = readRequired(formData, 'email').toLowerCase()
    const password = readRequired(formData, 'password')
    const givenName = readRequired(formData, 'givenName')
    const familyName = readRequired(formData, 'familyName')
    const role = readRequired(formData, 'role')
    const alias = readOptional(formData, 'alias')?.toLowerCase()

    if (password.length < 8) {
      redirect('/staff?error=Temporary%20password%20must%20be%20at%20least%208%20characters.')
    }

    await apiFetch('/staff-users/provision', session.accessToken, {
      method: 'POST',
      body: JSON.stringify({ email, password, givenName, familyName, role, alias }),
    })

    revalidatePath('/staff')
    const params = new URLSearchParams({
      ok: 'Staff user provisioned',
      provisionedEmail: email,
    })

    if (alias) {
      params.set('provisionedAlias', alias)
    }

    redirect(`/staff?${params.toString()}`)
  } catch (error) {
    redirectIfSessionExpired(error)
    const message = getStaffActionErrorMessage(error, 'Could not provision the staff user.')
    redirect(`/staff?error=${encodeURIComponent(message)}`)
  }
}

export async function deactivateStaffUserAction(formData: FormData) {
  try {
    const session = await requireSession()

    if (session.user.role !== 'admin') {
      redirect('/dashboard')
    }

    const staffUserId = readRequired(formData, 'staffUserId')
    const email = readRequired(formData, 'email').toLowerCase()

    await apiFetch(`/staff-users/${staffUserId}/deactivate`, session.accessToken, {
      method: 'PATCH',
    })

    revalidatePath('/staff')
    redirect(`/staff?ok=${encodeURIComponent('Staff user deactivated')}&actionEmail=${encodeURIComponent(email)}`)
  } catch (error) {
    redirectIfSessionExpired(error)
    const message = getStaffActionErrorMessage(error, 'Could not deactivate that staff user.')
    redirect(`/staff?error=${encodeURIComponent(message)}`)
  }
}

export async function reactivateStaffUserAction(formData: FormData) {
  try {
    const session = await requireSession()

    if (session.user.role !== 'admin') {
      redirect('/dashboard')
    }

    const staffUserId = readRequired(formData, 'staffUserId')
    const email = readRequired(formData, 'email').toLowerCase()

    await apiFetch(`/staff-users/${staffUserId}/reactivate`, session.accessToken, {
      method: 'PATCH',
    })

    revalidatePath('/staff')
    redirect(`/staff?ok=${encodeURIComponent('Staff user reactivated')}&actionEmail=${encodeURIComponent(email)}`)
  } catch (error) {
    redirectIfSessionExpired(error)
    const message = getStaffActionErrorMessage(error, 'Could not reactivate that staff user.')
    redirect(`/staff?error=${encodeURIComponent(message)}`)
  }
}