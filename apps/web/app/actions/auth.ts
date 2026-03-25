'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!res.ok) {
    redirect('/login?error=1')
  }

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

  redirect('/dashboard')
}

export async function logout() {
  const session = await getSession()
  await session.destroy()
  redirect('/login')
}
