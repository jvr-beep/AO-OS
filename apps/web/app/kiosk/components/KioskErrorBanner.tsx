'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { resetKioskAction } from '../actions/visit'

interface KioskErrorBannerProps {
  message: string
}

export function KioskErrorBanner({ message }: KioskErrorBannerProps) {
  const pathname = usePathname()
  const [staffMode, setStaffMode] = useState(false)

  if (staffMode) {
    return (
      <div className="fixed inset-0 bg-surface-0 flex flex-col items-center justify-center z-50 px-8">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-warning mb-2">
            <span className="text-4xl">⚑</span>
          </div>
          <h2 className="text-2xl font-heading uppercase tracking-wider text-text-primary">
            Staff Assistance Requested
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            A guest requires help at the kiosk. Please attend to them when available.
          </p>
          <div className="rounded-lg bg-surface-1 border border-border-subtle px-4 py-3 text-xs text-text-muted font-mono">
            {message}
          </div>
          <button
            onClick={() => setStaffMode(false)}
            className="text-xs text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-critical/40 bg-critical/10 p-4 space-y-3">
      <p className="text-critical text-xs text-center font-medium">{message}</p>
      <div className="flex items-center justify-center gap-4">
        <a
          href={pathname}
          className="text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors"
        >
          Try Again
        </a>
        <span className="text-border-subtle">·</span>
        <button
          onClick={() => setStaffMode(true)}
          className="text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors"
        >
          Staff Assistance
        </button>
        <span className="text-border-subtle">·</span>
        <form action={resetKioskAction} className="inline">
          <button
            type="submit"
            className="text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors"
          >
            Start Over
          </button>
        </form>
      </div>
    </div>
  )
}
