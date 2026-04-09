'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { reportErrorAction } from '@/app/actions/report-error'

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()

  useEffect(() => {
    reportErrorAction({
      message: error.message || 'Unknown error',
      page: pathname ?? 'unknown',
      digest: error.digest,
    })
  }, [error, pathname])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="rounded-lg bg-surface-1 border border-border-subtle p-8 max-w-lg w-full text-center shadow-sm">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-sm text-text-muted mb-1">
          This error has been automatically logged and will be reviewed.
        </p>
        {error.digest && (
          <p className="text-xs text-text-secondary font-mono mt-1 mb-4">
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 rounded bg-accent-primary text-surface-0 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
