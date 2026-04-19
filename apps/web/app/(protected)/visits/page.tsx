import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { guestCheckoutAction } from '@/app/actions/operators'
import type { GuestVisit } from '@/types/api'

const FILTER_GROUPS: Record<string, string[]> = {
  pending: ['initiated', 'awaiting_payment', 'ready_for_assignment', 'paid_pending_assignment'],
  active: ['checked_in', 'active', 'extended'],
  closed: ['checked_out', 'cancelled'],
}

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

  const statusesToFetch = FILTER_GROUPS[statusFilter] ?? []
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
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
  ]

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Visits</h1>
          <p className="text-sm text-text-muted mt-1">Live and historical guest visit records.</p>
        </div>
        <Link href="/check-in" className="btn-primary text-xs">Check-In Console →</Link>
      </div>

      {(okMessage || errorMessage) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          errorMessage
            ? 'border-critical/40 bg-critical/10 text-critical'
            : 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
        }`}>
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={`/visits?status=${f.value}`}
            className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-accent-primary text-surface-0 border-accent-primary'
                : 'bg-transparent text-text-muted border-border-subtle hover:border-accent-primary hover:text-text-primary'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Guest</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Pass</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Mode</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                  No visits found.
                </td>
              </tr>
            ) : (
              sorted.map((visit) => {
                const checkoutEligible = ['checked_in', 'active', 'extended'].includes(visit.status)
                const guestName = (visit as any).guest_name
                return (
                  <tr key={visit.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 text-xs">
                      {guestName ? (
                        <Link href={`/guests/${visit.guest_id}`} className="text-text-primary hover:text-accent-primary transition-colors">
                          {guestName}
                        </Link>
                      ) : (
                        <Link href={`/guests/${visit.guest_id}`} className="font-mono text-text-muted hover:text-accent-primary">
                          {visit.guest_id.slice(0, 8)}…
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {(visit as any).tier_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted capitalize">
                      {(visit as any).visit_mode ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {new Date(visit.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/visits/${visit.id}`} className="text-xs text-accent-primary hover:underline">
                          View
                        </Link>
                        {checkoutEligible && (
                          <form action={guestCheckoutAction}>
                            <input type="hidden" name="redirectTo" value="/visits" />
                            <input type="hidden" name="visitId" value={visit.id} />
                            <button className="text-xs text-text-muted hover:text-text-primary transition-colors">
                              Check Out
                            </button>
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
