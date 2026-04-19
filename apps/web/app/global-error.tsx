'use client'

import { useEffect } from 'react'
import { reportErrorAction } from '@/app/actions/report-error'
import { ApiError } from '@/lib/api'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportErrorAction({
      message: error.message || 'Unknown global error',
      page: typeof window !== 'undefined' ? window.location.pathname : 'global',
      digest: error.digest,
      errorName: error.name,
      httpStatus: error instanceof ApiError ? error.status : undefined,
      apiUrl: error instanceof ApiError ? error.url : undefined,
    })
  }, [error])

  return (
    <html lang="en">
      <body style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Application error</h2>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
            This error has been automatically logged and will be reviewed.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6b7280', marginTop: '0.25rem', marginBottom: '1rem' }}>
              Ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#14b8a6', color: '#fff', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
