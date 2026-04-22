import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMemberSession } from '@/lib/member-session'
import { getMemberBookings } from '@/lib/member-api'

const STATUS_STYLES: Record<string, string> = {
  reserved: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  confirmed: 'bg-green-900/40 text-green-300 border-green-700',
  checked_in: 'bg-blue-900/40 text-blue-300 border-blue-700',
  cancelled: 'bg-gray-800 text-gray-400 border-gray-600',
  no_show: 'bg-red-900/40 text-red-300 border-red-700',
  completed: 'bg-surface-2 text-text-muted border-border-subtle',
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default async function BookingsPage() {
  const session = await getMemberSession()
  if (!session.sessionId) redirect('/member/login')

  const bookings = await getMemberBookings(session.sessionId).catch(() => [])

  const upcoming = bookings.filter((b) => ['reserved', 'confirmed'].includes(b.status))
  const past = bookings.filter((b) => !['reserved', 'confirmed'].includes(b.status))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading uppercase tracking-widest text-text-primary">My Bookings</h2>
        <Link href="/member/book" className="text-xs text-accent-primary uppercase tracking-widest hover:opacity-80 transition-opacity">
          + Book
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg bg-surface-1 border border-border-subtle p-8 text-center space-y-3">
          <p className="text-xs text-text-muted uppercase tracking-wider">No bookings yet</p>
          <Link href="/member/book" className="inline-block rounded bg-accent-primary text-xs uppercase tracking-widest text-white px-6 py-2.5 hover:opacity-90 transition-opacity">
            Book a Visit
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs text-text-muted uppercase tracking-wider">Upcoming</h3>
              {upcoming.map((b) => (
                <div key={b.id} className="rounded-lg bg-surface-1 border border-border-subtle p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{b.tier_name ?? 'Experience'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_STYLES[b.status] ?? 'bg-surface-2 text-text-muted border-border-subtle'}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {new Date(b.arrival_window_start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(b.arrival_window_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-text-muted">{formatDuration(b.duration_minutes)}</p>
                  <p className="text-xs font-mono text-accent-primary">{b.booking_code}</p>
                </div>
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs text-text-muted uppercase tracking-wider">Past</h3>
              {past.map((b) => (
                <div key={b.id} className="rounded-lg bg-surface-1 border border-border-subtle p-4 space-y-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-secondary">{b.tier_name ?? 'Experience'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_STYLES[b.status] ?? 'bg-surface-2 text-text-muted border-border-subtle'}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {new Date(b.arrival_window_start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}
                    {formatDuration(b.duration_minutes)}
                  </p>
                  <p className="text-xs font-mono text-text-muted">{b.booking_code}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
