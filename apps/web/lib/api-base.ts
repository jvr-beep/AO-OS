import { headers } from 'next/headers'

function normalizeApiBase(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

function resolveApiBaseFromHost(host: string): string {
  const normalizedHost = host.trim().toLowerCase()

  if (!normalizedHost) {
    return 'http://localhost:4000/v1'
  }

  if (
    normalizedHost.startsWith('localhost') ||
    normalizedHost.startsWith('127.0.0.1') ||
    normalizedHost.startsWith('[::1]')
  ) {
    return 'http://localhost:4000/v1'
  }

  if (normalizedHost.includes('staging.aosanctuary.com')) {
    return 'https://api-staging.aosanctuary.com/v1'
  }

  if (
    normalizedHost.includes('app.aosanctuary.com') ||
    normalizedHost.includes('ao-os.aosanctuary.com') ||
    normalizedHost === 'aosanctuary.com'
  ) {
    return 'https://api.aosanctuary.com/v1'
  }

  if (normalizedHost.endsWith('.aosanctuary.com')) {
    return 'https://api.aosanctuary.com/v1'
  }

  return 'http://localhost:4000/v1'
}

export function getApiBase(): string {
  const configuredBase = process.env.API_BASE_URL?.trim()
  if (configuredBase) {
    return normalizeApiBase(configuredBase)
  }

  try {
    const requestHeaders = headers()
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? ''
    return resolveApiBaseFromHost(host)
  } catch {
    return 'http://localhost:4000/v1'
  }
}