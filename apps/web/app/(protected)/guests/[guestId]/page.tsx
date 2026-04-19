import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Guest, GuestBooking, GuestVisit } from '@/types/api'

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: { guestId: string }
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const { guestId } = params

  let guest: Guest
  try {
    guest = await apiFetch<Guest>(`/guests/${guestId}`, token)
  } catch {
    notFound()
  }

  const [bookings, visits] = await Promise.all([
    apiFetch<GuestBooking[]>(`/guest-bookings/guests/${guestId}/bookings`, token).catch(() => []),
    apiFetch<GuestVisit[]>(`/guests/${guestId}/visits`, token).catch(() => []),
  ])

  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error

  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {guest.firstName} {guest.lastName ?? ''}
          </h1>
          <p className="text-gray-400 text-xs font-mono">{guest.id}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/check-in?guestId=${guest.id}`} className="btn-primary text-xs">
            Check In →
          </Link>
          <Link href="/guests" className="btn-secondary text-xs">
            Back
          </Link>
        </div>
      </div>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-700 bg-red-900 text-red-200'
              : 'border-green-700 bg-green-900 text-green-200'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Profile</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Email</dt>
              <dd className="text-white">{guest.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Phone</dt>
              <dd className="text-white">{guest.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Date of Birth</dt>
              <dd className="text-white">
                {guest.dateOfBirth ? new Date(guest.dateOfBirth).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Language</dt>
              <dd className="text-white">{guest.preferredLanguage}</dd>
            </div>
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Status</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-400">Membership</dt>
              <dd><StatusBadge status={guest.membershipStatus} /></dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-400">Risk Flag</dt>
              <dd><StatusBadge status={guest.riskFlagStatus} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Marketing Opt-in</dt>
              <dd className="text-white">{guest.marketingOptIn ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Created</dt>
              <dd className="text-white text-xs">{new Date(guest.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">Visits ({sortedVisits.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Duration</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedVisits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  No visits yet.
                </td>
              </tr>
            ) : (
              sortedVisits.map((visit) => (
                <tr key={visit.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {new Date(visit.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">{visit.source_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={visit.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/visits/${visit.id}`}
                      className="text-xs text-accent-primary hover:text-accent-primary transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-200">Bookings ({sortedBookings.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Channel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Balance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedBookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  No bookings yet.
                </td>
              </tr>
            ) : (
              sortedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-xs font-mono text-gray-300">{booking.booking_code}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{booking.booking_channel}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {booking.balance_due_cents > 0
                      ? `$${(booking.balance_due_cents / 100).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
