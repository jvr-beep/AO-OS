'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from '@/app/actions/auth'
import { AoLogo } from '@/components/AoLogo'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full btn-primary"
      aria-busy={pending}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="login-spinner" aria-hidden="true" />
          Signing in…
        </span>
      ) : (
        'Sign in'
      )}
    </button>
  )
}

export function LoginClient() {
  const [state, action] = useFormState(loginAction, null)

  return (
    <div className="card w-full max-w-sm login-card">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <AoLogo className="w-16 h-16" />
        </div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
          Staff Portal
        </p>
        <p className="text-xs text-gray-500 mt-2">Honor the body. Honor the man.</p>
      </div>

      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
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
            className="form-input"
          />
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
    </div>
  )
}
