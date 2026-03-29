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

export default async function DashboardPage() {
  const [session, health] = await Promise.all([getSession(), getApiHealth()])

  const healthColor =
    health === 'ok'
      ? 'text-green-400'
      : health === 'degraded'
        ? 'text-yellow-400'
        : 'text-red-400'

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-6">Welcome to AO OS</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        <div className="card">
          <p className="text-xs text-ao-teal uppercase tracking-wide font-semibold mb-2">API Health</p>
          <p className={`text-lg font-bold ${healthColor}`}>{health}</p>
        </div>

        <div className="card">
          <p className="text-xs text-ao-teal uppercase tracking-wide font-semibold mb-2">Signed in as</p>
          <p className="text-sm font-medium text-white">{session.user?.fullName}</p>
          <p className="text-xs text-gray-400">{session.user?.email}</p>
          <span className="mt-2 inline-block text-xs bg-ao-primary text-ao-darker px-2 py-1 rounded font-semibold">
            {session.user?.role}
          </span>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-ao-primary mb-3 uppercase tracking-wide">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm bg-gray-700 text-gray-100 px-3 py-1.5 rounded hover:bg-ao-primary hover:text-ao-darker transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-ao-primary mb-2 uppercase tracking-wide">Member Lookup</h2>
        <p className="text-xs text-gray-400 mb-3">Search by member UUID, name, email, or member number.</p>
        <MemberLookup />
      </div>
    </div>
  )
}
