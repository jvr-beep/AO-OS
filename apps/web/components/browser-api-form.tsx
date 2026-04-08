'use client'

import type { ReactNode } from 'react'
import { getBrowserApiBase, readBrowserAccessToken, readBrowserSessionUser } from '@/lib/browser-auth'

type MutationAugment = 'none' | 'locker-policy' | 'locker-assign' | 'locker-move' | 'cleaning-start'

type BrowserApiFormProps = {
  actionPath: string
  redirectTo: string
  successMessage: string
  fallbackErrorMessage?: string
  method?: 'POST' | 'PATCH'
  augment?: MutationAugment
  className?: string
  disabled?: boolean
  children: ReactNode
}

function buildRedirectUrl(path: string, key: 'ok' | 'error', value: string) {
  const url = new URL(path, window.location.origin)
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}${url.hash}`
}

function normalizePayloadValue(key: string, value: FormDataEntryValue) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  if (key.toLowerCase().endsWith('at')) {
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return trimmed
}

function parseFormData(formData: FormData) {
  const payload: Record<string, unknown> = {}

  for (const [key, value] of Array.from(formData.entries())) {
    if (key === 'redirectTo') {
      continue
    }

    const normalizedValue = normalizePayloadValue(key, value)
    if (normalizedValue !== undefined) {
      payload[key] = normalizedValue
    }
  }

  return payload
}

function resolveActionPath(actionPath: string, payload: Record<string, unknown>) {
  const consumedKeys = new Set<string>()

  const resolvedPath = actionPath.replace(/:([A-Za-z0-9_]+)/g, (_match, rawKey: string) => {
    const key = String(rawKey)
    const value = payload[key]

    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${key} is required`)
    }

    consumedKeys.add(key)
    return encodeURIComponent(value)
  })

  for (const key of Array.from(consumedKeys)) {
    delete payload[key]
  }

  return resolvedPath
}

function augmentPayload(
  augment: MutationAugment,
  payload: Record<string, unknown>,
) {
  const sessionUser = readBrowserSessionUser()

  switch (augment) {
    case 'locker-policy':
      payload.staffOverride = payload.requestMode === 'staff_override'
      return payload
    case 'locker-assign':
      if (sessionUser?.id) {
        payload.assignedByStaffUserId = sessionUser.id
      }
      return payload
    case 'locker-move':
      if (sessionUser?.id) {
        payload.staffUserId = sessionUser.id
      }
      return payload
    case 'cleaning-start':
      if (sessionUser?.id) {
        payload.assignedToStaffUserId = sessionUser.id
      }
      return payload
    default:
      return payload
  }
}

async function parseFailure(response: Response) {
  const text = await response.text().catch(() => '')

  let payload: Record<string, unknown> | null = null
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      payload = null
    }
  }

  const rawMessage = payload?.message
  const message =
    typeof rawMessage === 'string'
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : text || response.statusText

  return {
    text,
    message,
  }
}

export function BrowserApiForm({
  actionPath,
  redirectTo,
  successMessage,
  fallbackErrorMessage = 'Request failed',
  method = 'POST',
  augment = 'none',
  className,
  disabled = false,
  children,
}: BrowserApiFormProps) {
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault()

        if (disabled) {
          return
        }

        const accessToken = readBrowserAccessToken()
        if (!accessToken) {
          window.location.assign('/login')
          return
        }

        const form = event.currentTarget
        const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null
        if (submitter instanceof HTMLButtonElement) {
          submitter.disabled = true
        }

        const formData = new FormData(form)
        const payload = augmentPayload(augment, parseFormData(formData))

        let resolvedPath = actionPath

        try {
          resolvedPath = resolveActionPath(actionPath, payload)
        } catch (error) {
          const message = error instanceof Error ? error.message : fallbackErrorMessage
          window.location.assign(buildRedirectUrl(redirectTo, 'error', message))
          return
        }

        const hasBody = Object.keys(payload).length > 0

        void fetch(`${getBrowserApiBase()}${resolvedPath}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: hasBody ? JSON.stringify(payload) : undefined,
          cache: 'no-store',
        })
          .then(async (response) => {
            if (response.ok) {
              window.location.assign(buildRedirectUrl(redirectTo, 'ok', successMessage))
              return
            }

            if (response.status === 401) {
              window.location.assign('/login')
              return
            }

            const failure = await parseFailure(response)
            console.error('Browser API form request failed', {
              actionPath: resolvedPath,
              status: response.status,
              message: failure.message,
              body: failure.text.slice(0, 500),
              payload,
            })

            window.location.assign(
              buildRedirectUrl(redirectTo, 'error', failure.message || fallbackErrorMessage),
            )
          })
          .catch((error) => {
            console.error('Browser API form request failed', {
              actionPath: resolvedPath,
              error: error instanceof Error ? error.message : 'unknown_error',
              payload,
            })

            window.location.assign(buildRedirectUrl(redirectTo, 'error', fallbackErrorMessage))
          })
          .finally(() => {
            if (submitter instanceof HTMLButtonElement) {
              submitter.disabled = false
            }
          })
      }}
    >
      {children}
    </form>
  )
}