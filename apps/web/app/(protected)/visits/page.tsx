import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { guestCheckoutAction } from '@/app/actions/operators'
import type { GuestVisit } from '@/types/api'

export default async function VisitsPage({
  searchParams,
}: {
  searchParams?: { status?: string; ok?: string; error?: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const statusFilter = searchParams?.status ?? 'active'
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error

  const activeStatuses = ['checked_in', 'active', 'extended', 'paid_pending_assignment']

  const statusesToFetch =
    statusFilter === 'all'
      ? []
      : statusFilter === 'active'
        ? activeStatuses
        : [statusFilter]

  const params = new URLSearchParams()
  statusesToFetch.forEach((s) => params.append('status', s))

  const visits = await apiFetch<GuestVisit[]>(
    `/visits${params.toString() ? `?${params.toString()}` : ''}`,
    token,
  ).catch(() => [] as GuestVisit[])

  const sorted = [...visits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const filters = [
    { value: 'active', label: 'Active' },
    { value: 'checked_out', label: 'Checked Out' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Visits</h1>
          <p className="text-gray-400 text-sm">Live and historical guest visit records.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/check-in" className="btn-primary text-xs">Check In →</Link>
          <Link href="/dashboard" className="btn-secondary text-xs">Back</Link>
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

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={`/visits?status=${f.value}`}
            className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-accent-primary text-black border-accent-primary'
                : 'bg-transparent text-gray-300 border-gray-600 hover:border-accent-primary'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Guest</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No visits found.
                </td>
              </tr>
            ) : (
              sorted.map((visit) => {
                const checkoutEligible = ['checked_in', 'active', 'extended'].includes(visit.status)
                return (
                  <tr key={visit.id} className="hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {new Date(visit.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link
                        href={`/guests/${visit.guest_id}`}
                        className="text-accent-primary hover:text-accent-primary transition-colors font-mono"
                      >
                        {visit.guest_id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{visit.source_type}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/visits/${visit.id}`}
                          className="text-xs text-accent-primary hover:text-accent-primary transition-colors"
                        >
                          View →
                        </Link>
                        {checkoutEligible && (
                          <form action={guestCheckoutAction}>
                            <input type="hidden" name="redirectTo" value="/visits" />
                            <input type="hidden" name="visitId" value={visit.id} />
                            <button className="btn-secondary text-xs px-2 py-1">Check Out</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
