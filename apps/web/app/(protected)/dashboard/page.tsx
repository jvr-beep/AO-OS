import Link from 'next/link'
import { getSession } from '@/lib/session'
import { MemberLookup } from '@/components/member-lookup'
import { ApiHealthWidget } from './ApiHealthWidget'


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

export default async function DashboardPage() {
  const session = await getSession()

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2 tracking-tight">AO OS Staff Dashboard</h1>
      <p className="text-text-muted mb-8">Instant operating picture: occupancy, arrivals, cleaning, and alerts.</p>

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
