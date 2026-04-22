import LoginClient from './login-client'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { reset?: string; resetToken?: string; expired?: string }
}) {
  const resetState = (searchParams.reset === 'sent' || searchParams.reset === 'error' || searchParams.reset === 'expired' || searchParams.reset === 'confirmed')
    ? searchParams.reset
    : null

  const resetToken = searchParams.resetToken ?? null
  const sessionExpired = searchParams.expired === '1'

  return (
    <LoginClient resetState={resetState} resetToken={resetToken} sessionExpired={sessionExpired} />
  )
}
