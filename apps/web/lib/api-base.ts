import { headers } from 'next/headers'

const LOCAL_API_BASE = 'http://localhost:4000/v1'
const STAGING_API_BASE = 'https://api-staging.aosanctuary.com/v1'
const PRODUCTION_API_BASE = 'https://api.aosanctuary.com/v1'

function isProductionHost(host: string): boolean {
  const normalizedHost = host.trim().toLowerCase()

  return (
    normalizedHost.includes('app.aosanctuary.com') ||
    normalizedHost.includes('ao-os.aosanctuary.com') ||
    normalizedHost === 'aosanctuary.com' ||
    normalizedHost.endsWith('.aosanctuary.com')
  ) && !normalizedHost.includes('staging.aosanctuary.com')
}

function isStagingHost(host: string): boolean {
  return host.trim().toLowerCase().includes('staging.aosanctuary.com')
}

function normalizeApiBase(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

function resolveApiBaseFromHost(host: string): string {
  const normalizedHost = host.trim().toLowerCase()

  if (!normalizedHost) {
    return process.env.NODE_ENV === 'production' ? PRODUCTION_API_BASE : LOCAL_API_BASE
  }

  if (
    normalizedHost.startsWith('localhost') ||
    normalizedHost.startsWith('127.0.0.1') ||
    normalizedHost.startsWith('[::1]')
  ) {
    return LOCAL_API_BASE
  }

  if (normalizedHost.includes('staging.aosanctuary.com')) {
    return STAGING_API_BASE
  }

  if (
    normalizedHost.includes('app.aosanctuary.com') ||
    normalizedHost.includes('ao-os.aosanctuary.com') ||
    normalizedHost === 'aosanctuary.com'
  ) {
    return PRODUCTION_API_BASE
  }

  if (normalizedHost.endsWith('.aosanctuary.com')) {
    return PRODUCTION_API_BASE
  }

  if (normalizedHost.endsWith('.vercel.app') || normalizedHost.includes('vercel.app')) {
    return process.env.VERCEL_ENV === 'preview' ? STAGING_API_BASE : PRODUCTION_API_BASE
  }

  return process.env.NODE_ENV === 'production' ? PRODUCTION_API_BASE : LOCAL_API_BASE
}

export function getApiBase(): string {
  let host = ''

  try {
    const requestHeaders = headers()
    host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? ''
  } catch {
    host = ''
  }

  const resolvedFromHost = resolveApiBaseFromHost(host)
  const configuredBase = process.env.API_BASE_URL?.trim()
  if (configuredBase) {
    const normalizedConfiguredBase = normalizeApiBase(configuredBase)

    if (isProductionHost(host) && normalizedConfiguredBase === STAGING_API_BASE) {
      return PRODUCTION_API_BASE
    }

    if (isStagingHost(host) && normalizedConfiguredBase === PRODUCTION_API_BASE) {
      return STAGING_API_BASE
    }

    return normalizedConfiguredBase
  }

  return resolvedFromHost
}