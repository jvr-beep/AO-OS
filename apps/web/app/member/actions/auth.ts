'use server'

import { redirect } from 'next/navigation'
import { getMemberSession } from '@/lib/member-session'
import { memberLogin } from '@/lib/member-api'

export async function memberLoginAction(formData: FormData): Promise<void> {
  const email = formData.get('email')?.toString().trim()
  const password = formData.get('password')?.toString()

  if (!email || !password) redirect('/member/login?error=Email+and+password+required')

  try {
    const result = await memberLogin(email, password)
    const session = await getMemberSession()
    session.sessionId = result.session.sessionId
    session.memberId = result.memberId
    session.expiresAt = result.session.expiresAt
    await session.save()
  } catch (err: any) {
    redirect(`/member/login?error=${encodeURIComponent(err.message ?? 'Login failed')}`)
  }

  redirect('/member')
}

export async function memberLogoutAction(): Promise<void> {
  const session = await getMemberSession()
  session.destroy()
  redirect('/member/login')
}
