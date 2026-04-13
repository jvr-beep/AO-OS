'use server'

import { getSession } from '@/lib/session'

export async function reportErrorAction(params: {
  message: string
  page: string
  digest?: string
  errorName?: string
  httpStatus?: number
  apiUrl?: string
}): Promise<void> {
  try {
    const session = await getSession()
    const { httpStatus } = params

    const severity = httpStatus
      ? httpStatus >= 500 ? 'critical' : 'warning'
      : 'critical'

    const exceptionType = httpStatus ? 'WEB_API_FETCH_ERROR' : 'WEB_RENDER_ERROR'

    const payload = {
      message: params.message,
      page: params.page,
      digest: params.digest ?? null,
      error_name: params.errorName ?? null,
      http_status: httpStatus ?? null,
      api_url: params.apiUrl ?? null,
      user_id: session.user?.id ?? null,
      user_role: session.user?.role ?? null,
    }

    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
    const body = JSON.stringify({ exception_type: exceptionType, severity, payload })

    if (session.accessToken) {
      await fetch(`${apiBase}/ops/exceptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body,
        cache: 'no-store',
      })
    } else if (process.env.OPS_REPORT_KEY) {
      await fetch(`${apiBase}/ops/exceptions/anonymous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPS_REPORT_KEY}`,
        },
        body,
        cache: 'no-store',
      })
    }
  } catch {
    // Silently fail — error reporting must never cause further errors
  }
}
