import { redirect } from 'next/navigation'
import LoginClient from './login-client'
import { getSession } from '@/lib/session'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; reset?: string; resetToken?: string }
}) {
  const session = await getSession()

  if (session.accessToken && session.user) {
    redirect('/dashboard')
  }

  const resetState = searchParams.reset === 'sent' ||
    searchParams.reset === 'error' ||
    searchParams.reset === 'changed' ||
    searchParams.reset === 'invalid' ||
    searchParams.reset === 'mismatch'
    ? searchParams.reset
    : null

  const loginError = searchParams.error === '1'
    ? 'Invalid email or password.'
    : null

  return (
    <LoginClient
      loginError={loginError}
      resetState={resetState}
      resetToken={searchParams.resetToken?.trim() ?? ''}
    />
  )
}
