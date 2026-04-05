import Link from 'next/link'
import { confirmStaffPasswordReset } from '@/app/actions/auth'
import { AoLogo } from '@/components/AoLogo'

type Props = {
  searchParams: {
    token?: string
    state?: string
  }
}

function ResetNotice({ state }: { state: string | undefined }) {
  if (state === 'invalid') {
    return (
      <div className="mb-4 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary font-sans">
        This password reset link is invalid or expired. Request a new link from the staff login page.
      </div>
    )
  }

  if (state === 'mismatch') {
    return (
      <div className="mb-4 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary font-sans">
        Passwords did not match. Try again.
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="mb-4 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary font-sans">
        Could not reset the password right now. Try again.
      </div>
    )
  }

  return null
}

export default function ResetPasswordPage({ searchParams }: Props) {
  const token = searchParams.token?.trim() ?? ''
  const hasToken = token.length > 0

  return (
    <div className="login-bg min-h-screen flex items-center justify-center px-4">
      <div className="card login-card w-full max-w-sm relative z-10 border-border-subtle shadow-2xl shadow-black/60">
        <div className="text-center mb-8">
          <AoLogo className="mx-auto mb-6 h-16 w-16" />
          <p className="font-heading text-xs text-text-primary uppercase tracking-[0.3em]">Staff Portal</p>
          <p className="font-sans text-xs text-text-muted mt-2">Set a new password for your staff account.</p>
        </div>

        <ResetNotice state={searchParams.state} />

        {!hasToken ? (
          <div className="space-y-4">
            <div className="rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary font-sans">
              Missing password reset token. Request a new link from the staff login page.
            </div>
            <Link href="/login" className="w-full btn-secondary">
              Back to login
            </Link>
          </div>
        ) : (
          <form action={confirmStaffPasswordReset} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div>
              <label className="form-label" htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="form-input"
              />
            </div>

            <button type="submit" className="w-full btn-primary">
              Set new password
            </button>

            <Link href="/login" className="w-full btn-secondary">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}