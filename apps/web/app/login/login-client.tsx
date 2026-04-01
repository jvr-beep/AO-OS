'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { loginAction, requestPasswordReset } from '@/app/actions/auth'
import { AoLogo } from '@/components/AoLogo'

const USERS_KEY = 'ao-os-login-users'
const LAST_USER_KEY = 'ao-os-last-login-user'
const MAX_USERS = 8

type LoginFormState = {
  error?: string
} | null

type Props = {
  resetState: 'sent' | 'error' | null
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="w-full btn-primary" disabled={pending}>
      {pending && <span className="login-spinner" aria-hidden="true" />}
      {pending ? 'Signing in...' : 'Sign in'}
    </button>
  )
}

export default function LoginClient({ resetState }: Props) {
  const [email, setEmail] = useState('')
  const [savedUsers, setSavedUsers] = useState<string[]>([])
  const [showReset, setShowReset] = useState(false)
  const [formState, formAction] = useFormState<LoginFormState, FormData>(loginAction, null)

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
      <div className="login-overlay" />

      {/* AO brand watermark — metallic Λ + O mark, semi-transparent */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 280 320"
          className="h-[70vh] w-auto opacity-[0.09]"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 0 32px rgba(42,181,192,0.35))' }}
        >
          <defs>
            <linearGradient
              id="ao-metal"
              x1="0"
              y1="0"
              x2="280"
              y2="280"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="#063040" />
              <stop offset="22%"  stopColor="#0d6070" />
              <stop offset="42%"  stopColor="#2ab5c0" />
              <stop offset="52%"  stopColor="#5eccd4" />
              <stop offset="65%"  stopColor="#1a8090" />
              <stop offset="85%"  stopColor="#0d5060" />
              <stop offset="100%" stopColor="#041e28" />
            </linearGradient>
          </defs>

          {/* Left arm of Λ */}
          <line
            x1="144" y1="14"
            x2="14"  y2="265"
            stroke="url(#ao-metal)"
            strokeWidth="40"
            strokeLinecap="square"
          />
          {/* Right arm of Λ */}
          <line
            x1="144" y1="14"
            x2="266" y2="265"
            stroke="url(#ao-metal)"
            strokeWidth="40"
            strokeLinecap="square"
          />
          {/* O ring — centered at base of Λ */}
          <circle
            cx="144"
            cy="218"
            r="62"
            fill="none"
            stroke="url(#ao-metal)"
            strokeWidth="38"
          />
        </svg>
      </div>

      <div className="card login-card w-full max-w-sm relative z-10 border-cyan-900/40 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
        <div className="text-center mb-8">
          <AoLogo className="mx-auto mb-4 h-20 w-20" />
          <p className="text-xs text-cyan-200/70 uppercase tracking-widest font-semibold">Staff Portal</p>
          <p className="text-xs text-cyan-100/40 mt-2">Honor the body. Honor the man.</p>
        </div>

        {formState?.error && (
          <div className="mb-4 rounded-lg bg-red-900/70 border border-red-700 px-4 py-3 text-sm text-red-100">
            {formState.error}
          </div>
        )}

        {resetState === 'sent' && (
          <div className="mb-4 rounded-lg bg-emerald-950/60 border border-emerald-700 px-4 py-3 text-sm text-emerald-100">
            If that email exists, a password reset link has been sent.
          </div>
        )}

        {resetState === 'error' && (
          <div className="mb-4 rounded-lg bg-amber-900/60 border border-amber-700 px-4 py-3 text-sm text-amber-100">
            Could not submit password reset request. Please try again.
          </div>
        )}

        <form
          action={formAction}
          className="space-y-4"
          onSubmit={() => rememberUser(email)}
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
              <p className="mt-1 text-xs text-cyan-100/45">Saved users available in dropdown.</p>
            )}
          </div>

          <div>
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="form-input"
            />
          </div>

          <SubmitButton />
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowReset((s) => !s)}
            className="text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
          >
            Forgot password?
          </button>
        </div>

        {showReset && (
          <form action={requestPasswordReset} className="mt-4 space-y-3 border-t border-cyan-950/60 pt-4">
            <p className="text-xs text-cyan-100/70">Request a password reset link by email.</p>
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
      </div>
    </div>
  )
}
