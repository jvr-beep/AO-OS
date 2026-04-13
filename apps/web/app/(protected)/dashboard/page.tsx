import Link from 'next/link'
import { getSession } from '@/lib/session'
import { MemberLookup } from '@/components/member-lookup'

async function getApiHealth(): Promise<'ok' | 'degraded' | 'unreachable'> {
  try {
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
    const res = await fetch(`${apiBase}/health`, { cache: 'no-store' })
    return res.ok ? 'ok' : 'degraded'
  } catch {
    return 'unreachable'
  }
}

type IntegrationStatus = {
  name: string
  label: string
  configured: boolean
}

type IntegrationHealthResult = {
  status: 'ok' | 'degraded'
  checkedAt: string
  integrations: IntegrationStatus[]
} | null

async function getIntegrationHealth(): Promise<IntegrationHealthResult> {
  try {
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'
    const monitorKey = process.env.MONITOR_API_KEY
    if (!monitorKey) return null
    const res = await fetch(`${apiBase}/ops/integration-health`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${monitorKey}` },
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (
      typeof data !== 'object' || data === null ||
      !('status' in data) || !('checkedAt' in data) || !('integrations' in data)
    ) return null
    return data as IntegrationHealthResult
  } catch {
    return null
  }
}

const QUICK_LINKS = [
  { href: '/members', label: 'Members' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/cleaning', label: 'Cleaning' },
  { href: '/floor-plans', label: 'Floor Plans' },
  { href: '/wristbands', label: 'Wristbands' },
  { href: '/lockers', label: 'Lockers' },
  { href: '/staff', label: 'Staff' },
  { href: '/staff/audit', label: 'Audit Log' },
]

function HealthPill({ health }: { health: string }) {
  const color =
    health === 'ok'
      ? 'bg-success text-surface-0'
      : health === 'degraded'
        ? 'bg-warning text-surface-0'
        : 'bg-critical text-surface-0'
  return (
    <span className={`inline-block px-3 py-1 rounded font-semibold text-xs ${color}`}>{health}</span>
  )
}

export default async function DashboardPage() {
  const [session, health, integrationHealth] = await Promise.all([
    getSession(),
    getApiHealth(),
    getIntegrationHealth(),
  ])

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2 tracking-tight">AO OS Staff Dashboard</h1>
      <p className="text-text-muted mb-8">Instant operating picture: occupancy, arrivals, cleaning, and alerts.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">API Health</span>
            <HealthPill health={health} />
          </div>
          <div className="text-2xl font-bold text-text-primary">{health === 'ok' ? 'Operational' : health === 'degraded' ? 'Degraded' : 'Unreachable'}</div>
        </div>

        <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 flex flex-col gap-2 shadow-sm">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Signed in as</span>
          <div className="text-lg font-medium text-text-primary">{session.user?.fullName}</div>
          <div className="text-xs text-text-secondary">{session.user?.email}</div>
          <span className="mt-2 inline-block text-xs bg-accent-primary text-surface-0 px-2 py-1 rounded font-semibold">
            {session.user?.role}
          </span>
        </div>
      </div>

      {integrationHealth && (
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-accent-primary uppercase tracking-wide">Integration Health</h2>
            <HealthPill health={integrationHealth.status} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {integrationHealth.integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-2 text-xs text-text-secondary"
              >
                <span className={integration.configured ? 'text-success' : 'text-critical'}>
                  {integration.configured ? '✓' : '✗'}
                </span>
                <span className={integration.configured ? '' : 'text-critical font-semibold'}>
                  {integration.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3">
            Last checked: {new Date(integrationHealth.checkedAt).toLocaleString()}
          </p>
        </div>
      )}

      <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 mb-8 shadow-sm">
        <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm bg-surface-2 text-text-primary px-3 py-1.5 rounded hover:bg-accent-primary hover:text-surface-0 transition-colors font-medium border border-border-subtle"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wide">Member Lookup</h2>
        <p className="text-xs text-text-muted mb-3">Search by member UUID, name, email, or member number.</p>
        <MemberLookup />
      </div>
    </div>
  )
}
