'use client'

import type { Role } from '@/types/api'

export const BROWSER_ACCESS_TOKEN_KEY = 'ao-os-access-token'
export const BROWSER_SESSION_USER_KEY = 'ao-os-session-user'

export type BrowserSessionUser = {
  id: string
  email: string
  fullName: string
  role: Role
}

export function getBrowserApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (configuredBase) {
    return configuredBase.endsWith('/v1') ? configuredBase : `${configuredBase.replace(/\/+$/, '')}/v1`
  }

  if (typeof window === 'undefined') {
    return 'https://api.aosanctuary.com/v1'
  }

  const host = window.location.host.toLowerCase()

  if (host.includes('staging.aosanctuary.com')) {
    return 'https://api-staging.aosanctuary.com/v1'
  }

  if (host.endsWith('.aosanctuary.com') || host === 'aosanctuary.com' || host.includes('vercel.app')) {
    return 'https://api.aosanctuary.com/v1'
  }

  return 'http://localhost:4000/v1'
}

export function storeBrowserAccessToken(token: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(BROWSER_ACCESS_TOKEN_KEY, token)
}

export function storeBrowserSession(accessToken: string, user: BrowserSessionUser) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(BROWSER_ACCESS_TOKEN_KEY, accessToken)
  window.sessionStorage.setItem(BROWSER_SESSION_USER_KEY, JSON.stringify(user))
}

export function readBrowserAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(BROWSER_ACCESS_TOKEN_KEY)
}

export function readBrowserSessionUser(): BrowserSessionUser | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.sessionStorage.getItem(BROWSER_SESSION_USER_KEY)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as BrowserSessionUser
  } catch {
    return null
  }
}

export function clearBrowserAccessToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(BROWSER_ACCESS_TOKEN_KEY)
}

export function clearBrowserSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(BROWSER_ACCESS_TOKEN_KEY)
  window.sessionStorage.removeItem(BROWSER_SESSION_USER_KEY)
}