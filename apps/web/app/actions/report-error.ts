'use server'

import { getSession } from '@/lib/session'

export async function reportErrorAction(params: {
  message: string
  page: string
  digest?: string
}): Promise<void> {
  try {
    const session = await getSession()
    if (!session.accessToken) return

    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
    await fetch(`${apiBase}/ops/exceptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        exception_type: 'WEB_PAGE_ERROR',
        severity: 'critical',
        payload: {
          message: params.message,
          page: params.page,
          digest: params.digest ?? null,
        },
      }),
      cache: 'no-store',
    })
  } catch {
    // Silently fail — error reporting must never cause further errors
  }
}
