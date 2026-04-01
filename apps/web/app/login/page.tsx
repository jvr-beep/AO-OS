import LoginClient from './login-client'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { reset?: string }
}) {
  const resetState = searchParams.reset === 'sent' || searchParams.reset === 'error'
    ? searchParams.reset
    : null

  return (
    <LoginClient resetState={resetState} />
  )
}
