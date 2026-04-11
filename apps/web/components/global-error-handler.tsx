'use client'

import { useEffect } from 'react'
import { reportErrorAction } from '@/app/actions/report-error'

/**
 * Registers window-level error handlers for uncaught JS errors and unhandled
 * promise rejections — errors that React's error boundary does NOT catch.
 *
 * Render once in the root layout (inside <body>) so it mounts on every page.
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      void reportErrorAction({
        message: event.message || 'Unknown JS error',
        page: window.location.pathname,
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection'
      void reportErrorAction({
        message,
        page: window.location.pathname,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
