'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { setSessionAction, requestPasswordReset, confirmStaffPasswordReset } from '@/app/actions/auth'
import { reportErrorAction } from '@/app/actions/report-error'
import { AoLogo } from '@/components/AoLogo'

const USERS_KEY = 'ao-os-login-users'
const LAST_USER_KEY = 'ao-os-last-login-user'
const MAX_USERS = 8

type Props = {
  resetState: 'sent' | 'error' | 'expired' | 'confirmed' | null
  resetToken: string | null
  sessionExpired?: boolean
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" className="w-full btn-primary" disabled={pending}>
      {pending && <span className="login-spinner" aria-hidden="true" />}
      {pending ? 'Signing in...' : 'Sign in'}
    </button>
  )
}

export default function LoginClient({ resetState, resetToken, sessionExpired }: Props) {
  const [email, setEmail] = useState('')
  const [savedUsers, setSavedUsers] = useState<string[]>([])
  const [showReset, setShowReset] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const rawUsers = window.localStorage.getItem(USERS_KEY)
    const rawLastUser = window.localStorage.getItem(LAST_USER_KEY)

    if (rawUsers) {
      try {
        const parsed = JSON.parse(rawUsers) as string[]
        setSavedUsers(Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, MAX_USERS) : [])
      } catch {
        setSavedUsers([])
      }
    }

    if (rawLastUser) {
      setEmail(rawLastUser)
    }
  }, [])

  const resetDefaultEmail = useMemo(() => email || savedUsers[0] || '', [email, savedUsers])

  function rememberUser(nextEmail: string) {
    const normalized = nextEmail.trim().toLowerCase()
    if (!normalized) return

    const nextUsers = [normalized, ...savedUsers.filter((u) => u !== normalized)].slice(0, MAX_USERS)
    setSavedUsers(nextUsers)
    window.localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers))
    window.localStorage.setItem(LAST_USER_KEY, normalized)
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center px-4">
      <div className="card login-card w-full max-w-sm relative z-10 border-border-subtle shadow-2xl shadow-black/60">

        <div className="text-center mb-8">
          <AoLogo className="mx-auto mb-6 h-16 w-16" />
          <p className="font-heading text-xs text-text-primary uppercase tracking-[0.3em]">Staff Portal</p>
          <p className="font-sans text-xs text-text-muted mt-2">Honor the body. Honor the man.</p>
        </div>

        {sessionExpired && (
          <div className="mb-4 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary font-sans">
            Your session has expired. Please sign in again.
          </div>
        )}

        {loginError && (
          <div className="mb-4 rounded border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-text-primary font-sans">
            {loginError}
          </div>
        )}

        {resetState === 'sent' && (
          <div className="mb-4 rounded border border-accent-primary/40 bg-accent-primary/10 px-4 py-3 text-sm text-text-primary font-sans">
            If that email exists, a password reset link has been sent.
          </div>
        )}

        {resetState === 'confirmed' && (
          <div className="mb-4 rounded border border-accent-primary/40 bg-accent-primary/10 px-4 py-3 text-sm text-text-primary font-sans">
            Password updated. You can now sign in.
          </div>
        )}

        {resetState === 'error' && (
          <div className="mb-4 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary font-sans">
            Could not submit password reset request. Please try again.
          </div>
        )}

        {resetState === 'expired' && (
          <div className="mb-4 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary font-sans">
            That reset link has expired. Request a new one below.
          </div>
        )}

        {!resetToken && <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const emailVal = String(formData.get('email') ?? '').trim()
            const passwordVal = String(formData.get('password') ?? '')

            if (!emailVal || !passwordVal) {
              setLoginError('Email and password are required.')
              return
            }

            rememberUser(emailVal)
            setLoginError(null)
            startTransition(async () => {
              let data: unknown
              try {
                const res = await fetch('https://api.aosanctuary.com/v1/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: emailVal, password: passwordVal }),
                })
                if (!res.ok) {
                  if (res.status === 401 || res.status === 403) {
                    setLoginError('Invalid email or password.')
                  } else {
                    setLoginError('Could not sign in right now. Please try again.')
                    await reportErrorAction({ message: `Login HTTP ${res.status}`, page: '/login', errorName: 'LoginError' })
                  }
                  return
                }
                data = await res.json()
              } catch {
                setLoginError('Could not sign in right now. Please try again.')
                await reportErrorAction({ message: 'Login fetch failed', page: '/login', errorName: 'NetworkError' })
                return
              }
              await setSessionAction(data as Parameters<typeof setSessionAction>[0])
            })
          }}
        >
          <div>
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              list="past-login-users"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
            <datalist id="past-login-users">
              {savedUsers.map((user) => (
                <option key={user} value={user} />
              ))}
            </datalist>
            {savedUsers.length > 0 && (
              <p className="mt-1 text-xs text-text-muted font-sans">Saved users available in dropdown.</p>
            )}
          </div>

          <div>
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="form-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <SubmitButton pending={isPending} />
        </form>}

        {!resetToken && (
          <>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowReset((s) => !s)}
                className="text-xs text-text-muted hover:text-text-primary font-sans underline underline-offset-4 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {showReset && (
              <form action={requestPasswordReset} className="mt-4 space-y-3 border-t border-border-subtle pt-4">
                <p className="text-xs text-text-muted font-sans">Request a password reset link by email.</p>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={resetDefaultEmail}
                  autoComplete="email"
                  className="form-input"
                  placeholder="name@domain.com"
                />
                <button type="submit" className="w-full btn-secondary">
                  Send reset link
                </button>
              </form>
            )}
          </>
        )}

        {resetToken && (
          <form action={confirmStaffPasswordReset} className="space-y-4">
            <input type="hidden" name="token" value={resetToken} />
            <p className="text-xs text-text-muted font-sans">Enter your new password below.</p>
            <div>
              <label className="form-label" htmlFor="newPassword">New password</label>
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
            <button type="submit" className="w-full btn-primary">
              Set new password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
