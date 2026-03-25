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
      ? 'text-green-600'
      : health === 'degraded'
        ? 'text-yellow-600'
        : 'text-red-600'

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">API Health</p>
          <p className={`text-lg font-semibold ${healthColor}`}>{health}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Signed in as</p>
          <p className="text-sm font-medium">{session.user?.fullName}</p>
          <p className="text-xs text-gray-400">{session.user?.email}</p>
          <span className="mt-1 inline-block text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            {session.user?.role}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Member Lookup</h2>
        <p className="text-xs text-gray-500 mb-3">Enter a member UUID to view their profile.</p>
        <MemberLookup />
      </div>
    </div>
  )
}
