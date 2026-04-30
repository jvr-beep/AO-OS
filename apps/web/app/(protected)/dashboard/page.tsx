import Link from 'next/link'
import { getSession } from '@/lib/session'
import { MemberLookup } from '@/components/member-lookup'
import { ApiHealthWidget } from './ApiHealthWidget'

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/v1'

interface UpcomingArrival {
  id: string
  booking_code: string
  arrival_window_start: string
  arrival_window_end: string
  guest_identifier: string
  status: string
}

interface OpsSnapshot {
  open_exceptions: number
  active_visits: number
  held_resources: number
  occupied_resources: number
  available_resources: number
  checkins_today: number
  revenue_today_cents: number
  upcoming_arrivals: UpcomingArrival[]
  generated_at: string
}

async function getOpsSnapshot(token: string): Promise<OpsSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/ops/snapshot`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const QUICK_LINKS = [
  { href: '/check-in', label: 'Check-In Console' },
  { href: '/visits', label: 'Visits' },
  { href: '/guests', label: 'Guests' },
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto',
  })
}

export default async function DashboardPage() {
  const session = await getSession()
  const snapshot = session.accessToken ? await getOpsSnapshot(session.accessToken) : null

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-[clamp(1.75rem,5vw,3.5rem)] leading-tight font-bold mb-2 tracking-tight break-words">
        AO OS Staff Dashboard
      </h1>
      <p className="text-text-muted mb-8">Instant operating picture: occupancy, arrivals, cleaning, and alerts.</p>

      {/* Primary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
        <StatWidget label="Active Visits" value={snapshot?.active_visits} />
        <StatWidget label="Check-ins Today" value={snapshot?.checkins_today} />
        <StatWidget
          label="Revenue Today"
          value={snapshot?.revenue_today_cents != null ? `$${(snapshot.revenue_today_cents / 100).toFixed(0)}` : undefined}
          raw
        />
        <StatWidget
          label="Open Exceptions"
          value={snapshot?.open_exceptions}
          accent={snapshot != null && snapshot.open_exceptions > 0 ? 'critical' : undefined}
        />
      </div>

      {/* Resource metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatWidget label="Available Resources" value={snapshot?.available_resources} accent={snapshot?.available_resources === 0 ? 'critical' : undefined} />
        <StatWidget label="Occupied" value={snapshot?.occupied_resources} />
        <StatWidget label="On Hold" value={snapshot?.held_resources} />
      </div>

      {/* Upcoming arrivals */}
      <div className="rounded-lg bg-surface-1 border border-border-subtle mb-6 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-accent-primary uppercase tracking-wide">
            Upcoming Arrivals (next 2 hours)
          </h2>
          <span className="text-xs text-text-muted">
            {snapshot?.upcoming_arrivals?.length ?? 0} expected
          </span>
        </div>
        {!snapshot || snapshot.upcoming_arrivals.length === 0 ? (
          <p className="px-5 py-5 text-sm text-text-muted">No bookings arriving in the next 2 hours.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-0 border-b border-border-subtle">
              <tr>
                <th className="text-left px-5 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Code</th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Guest</th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Window</th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {snapshot.upcoming_arrivals.map((a) => (
                <tr key={a.id} className="hover:bg-surface-2">
                  <td className="px-5 py-2.5 text-xs font-mono text-text-primary">{a.booking_code}</td>
                  <td className="px-5 py-2.5 text-xs text-text-secondary">{a.guest_identifier}</td>
                  <td className="px-5 py-2.5 text-xs text-text-secondary">
                    {formatTime(a.arrival_window_start)} – {formatTime(a.arrival_window_end)}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-text-muted capitalize">{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ApiHealthWidget />

        <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 flex flex-col gap-2 shadow-sm">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Signed in as</span>
          <div className="text-lg font-medium text-text-primary">{session.user?.fullName}</div>
          <div className="text-xs text-text-secondary">{session.user?.email}</div>
          <span className="mt-2 inline-block text-xs bg-accent-primary text-surface-0 px-2 py-1 rounded font-semibold">
            {session.user?.role}
          </span>
        </div>
      </div>

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

function StatWidget({
  label,
  value,
  accent,
  raw,
}: {
  label: string
  value: number | string | undefined
  accent?: 'critical'
  raw?: boolean
}) {
  const valueClass = accent === 'critical' ? 'text-critical' : 'text-text-primary'
  return (
    <div className="rounded-lg bg-surface-1 border border-border-subtle p-4 shadow-sm min-w-0">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 whitespace-normal break-words">
        {label}
      </p>
      <p className={`text-3xl font-bold break-words ${valueClass}`}>
        {value == null ? <span className="text-text-muted text-lg">—</span> : value}
      </p>
    </div>
  )
}
