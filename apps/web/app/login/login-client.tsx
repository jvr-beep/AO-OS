'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { confirmStaffPasswordReset, loginAction, requestPasswordReset } from '@/app/actions/auth'

const USERS_KEY = 'ao-os-login-users'
const LAST_USER_KEY = 'ao-os-last-login-user'
const MAX_USERS = 8
const thresholdBackgroundSrc = '/images/threshold-wall.png'
const thresholdLogoSrc = '/images/threshold-logo.png'

type Props = {
  loginError: string | null
  resetState: 'sent' | 'error' | 'changed' | 'invalid' | 'mismatch' | null
  resetToken: string
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" className="w-full btn-primary py-3" disabled={pending}>
      {pending && <span className="login-spinner" aria-hidden="true" />}
      {pending ? 'Signing in...' : 'Sign in'}
    </button>
  )
}

export default function LoginClient({ loginError: initialLoginError, resetState, resetToken }: Props) {
  const [email, setEmail] = useState('')
  const [savedUsers, setSavedUsers] = useState<string[]>([])
  const [showReset, setShowReset] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(initialLoginError)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setLoginError(initialLoginError)
  }, [initialLoginError])

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

  useEffect(() => {
    if (resetToken) {
      setShowReset(true)
    }
  }, [resetToken])

  const resetDefaultEmail = useMemo(() => email || savedUsers[0] || '', [email, savedUsers])

  function rememberUser(nextEmail: string) {
    const normalized = nextEmail.trim().toLowerCase()
    if (!normalized) return

    const nextUsers = [normalized, ...savedUsers.filter((u) => u !== normalized)].slice(0, MAX_USERS)
    setSavedUsers(nextUsers)
    window.localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers))
    window.localStorage.setItem(LAST_USER_KEY, normalized)
  }

  const loginHints = ['Staff access only', 'Workspace managed', 'Reset links expire in 30 minutes']

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f14]">
      <img
        src={thresholdBackgroundSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.25]"
      />
      <div className="absolute inset-0 bg-[rgba(10,15,20,0.50)]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.05) 0%, rgba(10,15,20,0) 28%, rgba(10,15,20,0.18) 100%)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[42%] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(33,212,228,0.10)] blur-[90px] md:h-[420px] md:w-[420px] md:bg-[rgba(33,212,228,0.14)] md:blur-[110px]"
      />

      <img
        src={thresholdLogoSrc}
        alt="AO Sanctuary"
        className="pointer-events-none absolute left-1/2 top-[42%] h-auto w-[180px] -translate-x-1/2 -translate-y-1/2 opacity-100 md:w-[240px] xl:w-[260px]"
      />

      <div
        className="pointer-events-none absolute left-1/2 z-10 w-[min(800px,calc(100vw-48px))] -translate-x-1/2 text-center font-heading text-[22px] uppercase tracking-[0.08em] text-[rgba(225,232,230,0.92)] md:text-[28px] lg:text-[34px]"
        style={{ top: 'calc(42% + 185px)', lineHeight: 1.4 }}
      >
        <div>Honor the body.</div>
        <div>Honor the man.</div>
      </div>

      <div className="pointer-events-none absolute left-1/2 bottom-[100px] hidden h-[52px] w-px -translate-x-1/2 bg-[rgba(33,212,228,0.28)] md:block" />

      <div className="relative z-20 min-h-screen px-4 py-8 md:px-8">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-end justify-center md:items-center md:justify-between md:gap-10">
          <div className="relative hidden max-w-xl self-center md:block">
            <div aria-hidden="true" className="ambient-orb absolute -left-10 top-6 h-44 w-44 rounded-full bg-[rgba(47,143,131,0.10)] blur-3xl" />
            <div className="relative z-10 space-y-5 text-left">
              <div className="inline-flex items-center gap-3 rounded-full border border-[rgba(237,233,227,0.14)] bg-[rgba(12,18,25,0.58)] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-text-secondary backdrop-blur-sm">
                AO Sanctuary
                <span className="h-1 w-1 rounded-full bg-accent-primary" />
                Staff authentication
              </div>
              <div>
                <p className="font-heading text-4xl uppercase tracking-[0.12em] text-text-primary lg:text-5xl">
                  Threshold access for daily operations.
                </p>
                <p className="mt-4 max-w-lg text-sm leading-7 text-[rgba(237,233,227,0.72)] lg:text-base">
                  Sign in to manage staff accounts, oversee operational systems, and keep Workspace-backed access aligned with AO OS.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {loginHints.map((hint) => (
                  <span
                    key={hint}
                    className="rounded-full border border-[rgba(237,233,227,0.10)] bg-[rgba(12,18,25,0.54)] px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-text-secondary backdrop-blur-sm"
                  >
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="login-card glass-panel w-full max-w-md p-5 md:p-7">
            <div className="mb-8 text-center">
              <p className="font-heading text-xs text-text-primary uppercase tracking-[0.3em]">Staff Portal</p>
              <p className="mt-2 font-sans text-xs text-text-muted">Private operations access for AO Sanctuary staff.</p>
            </div>

            {loginError && (
              <div className="notice notice-critical mb-4">
                {loginError}
              </div>
            )}

            {resetState === 'sent' && (
              <div className="notice notice-success mb-4">
                If that staff email exists, a password reset link has been sent.
              </div>
            )}

            {resetState === 'changed' && (
              <div className="notice notice-success mb-4">
                Password updated. Sign in with your new password.
              </div>
            )}

            {resetState === 'error' && (
              <div className="notice notice-warning mb-4">
                Could not complete the password reset flow. Please try again.
              </div>
            )}

            {resetState === 'invalid' && (
              <div className="notice notice-warning mb-4">
                This password reset link is invalid or expired. Request a new link below.
              </div>
            )}

            {resetState === 'mismatch' && (
              <div className="notice notice-warning mb-4">
                Passwords did not match. Try again.
              </div>
            )}

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                rememberUser(email)
                setLoginError(null)
                startTransition(async () => {
                  const result = await loginAction(null, formData)
                  if (result?.error) setLoginError(result.error)
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {savedUsers.slice(0, 3).map((user) => (
                      <button
                        key={user}
                        type="button"
                        onClick={() => setEmail(user)}
                        className="rounded-full border border-[rgba(237,233,227,0.10)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-accent-primary hover:text-text-primary"
                      >
                        {user}
                      </button>
                    ))}
                  </div>
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
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowReset((s) => !s)}
                className="text-xs text-text-muted hover:text-text-primary font-sans underline underline-offset-4 transition-colors"
              >
                {showReset ? 'Close password reset' : 'Forgot password?'}
              </button>
            </div>

            {showReset && (
              resetToken ? (
                <form action={confirmStaffPasswordReset} className="mt-5 space-y-3 rounded-2xl border border-[rgba(237,233,227,0.10)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div>
                    <p className="text-xs font-sans uppercase tracking-[0.22em] text-text-secondary">Reset Password</p>
                    <p className="mt-2 text-xs text-text-muted font-sans">Set a new password for this staff account.</p>
                  </div>
                  <input type="hidden" name="token" value={resetToken} />
                  <input
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="form-input"
                    placeholder="New password"
                  />
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="form-input"
                    placeholder="Confirm new password"
                  />
                  <button type="submit" className="w-full btn-secondary py-3">
                    Set new password
                  </button>
                </form>
              ) : (
                <form action={requestPasswordReset} className="mt-5 space-y-3 rounded-2xl border border-[rgba(237,233,227,0.10)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div>
                    <p className="text-xs font-sans uppercase tracking-[0.22em] text-text-secondary">Reset Password</p>
                    <p className="mt-2 text-xs text-text-muted font-sans">Request a password reset link for this staff account.</p>
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={resetDefaultEmail}
                    autoComplete="email"
                    className="form-input"
                    placeholder="name@domain.com"
                  />
                  <button type="submit" className="w-full btn-secondary py-3">
                    Send reset link
                  </button>
                </form>
              )
            )}

            <div className="mt-6 border-t border-[rgba(237,233,227,0.08)] pt-4 text-center text-[11px] uppercase tracking-[0.24em] text-text-muted">
              Authorized staff use only
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
