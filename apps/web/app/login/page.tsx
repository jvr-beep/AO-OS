import LoginClient from './login-client'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { reset?: string; resetToken?: string }
}) {
  const resetState = searchParams.reset === 'sent' || searchParams.reset === 'error'
    ? searchParams.reset
    : null

  const resetToken = searchParams.resetToken ?? null

  return (
    <LoginClient resetState={resetState} resetToken={resetToken} />
  )
}
