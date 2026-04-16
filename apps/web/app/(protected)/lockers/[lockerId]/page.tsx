import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { moveLockerAction, unassignLockerAction } from '@/app/actions/operators'
import type { Locker, LockerAccessEvent } from '@/types/api'

const HARD_BLOCKED_STATUSES = ['maintenance', 'offline', 'forced_open', 'out_of_service']

export default async function LockerDetailPage({
  params,
  searchParams,
}: {
  params: { lockerId: string }
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const { lockerId } = params

  const [lockersResult, eventsResult] = await Promise.allSettled([
    apiFetch<Locker[]>('/lockers', token),
    apiFetch<LockerAccessEvent[]>(`/lockers/${lockerId}/access-events`, token),
  ])

  const lockers = lockersResult.status === 'fulfilled' ? lockersResult.value : []
  const locker = lockers.find((l) => l.id === lockerId)
  if (!locker) notFound()

  const events = eventsResult.status === 'fulfilled' ? eventsResult.value : []
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error
  const isOccupied = locker.status === 'occupied' && !!locker.assignedMemberId

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/lockers" className="text-sm text-accent-primary hover:text-accent-primary transition-colors">
          ← Lockers
        </Link>
        <h1 className="text-3xl font-bold">Locker {locker.code}</h1>
        <StatusBadge status={locker.status} />
      </div>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            errorMessage
              ? 'border-red-700 bg-red-900 text-red-200'
              : 'border-green-700 bg-green-900 text-green-200'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      {locker.assignedMemberId && (
        <div className="card mb-4">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Current Occupant</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-400">Member</dt>
            <dd>
              <Link
                href={`/members/${locker.assignedMemberId}`}
                className="text-accent-primary hover:text-accent-primary transition-colors"
              >
                {locker.assignedMemberId}
              </Link>
            </dd>
            <dt className="text-gray-400">Assigned</dt>
            <dd className="text-gray-200">{locker.assignedAt ? new Date(locker.assignedAt).toLocaleString() : '—'}</dd>
          </dl>
        </div>
      )}

      {isOccupied && (
        <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
          <div className="card">
            <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Move to Another Locker</h2>
            <p className="text-xs text-gray-400 mb-2">
              Atomically releases this locker and assigns the member to the new one.
            </p>
            <form action={moveLockerAction} className="space-y-2">
              <input type="hidden" name="fromLockerId" value={locker.id} />
              <input type="hidden" name="memberId" value={locker.assignedMemberId!} />
              <input name="toLockerId" placeholder="New Locker ID" className="form-input" required />
              <button className="btn-primary w-full">Move</button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Release Locker</h2>
            <p className="text-xs text-gray-400 mb-2">Manually release this locker assignment.</p>
            <form action={unassignLockerAction} className="space-y-2">
              <input type="hidden" name="lockerId" value={locker.id} />
              <input
                name="unassignedReason"
                placeholder="Reason (optional)"
                className="form-input"
              />
              <button className="btn-secondary w-full">Release</button>
            </form>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wide">Operational Safety Rules</h2>
        <p className="text-xs text-gray-400 mb-2">
          The statuses below are hard-blocked for assignment and access, even under staff override.
        </p>
        <div className="flex flex-wrap gap-2">
          {HARD_BLOCKED_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 bg-surface-0">
          <h2 className="text-sm font-semibold text-accent-primary uppercase tracking-wide">
            Access Events ({events.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Time
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Member
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Reference
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Denial
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No access events.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-2 text-xs text-gray-400">
                    {new Date(ev.occurredAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={ev.eventType} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {ev.memberId ? (
                      <Link
                        href={`/members/${ev.memberId}`}
                        className="text-accent-primary hover:text-accent-primary transition-colors font-mono"
                      >
                        {ev.memberId.slice(0, 8)}…
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                    {ev.sourceReference ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {ev.denialReasonCode ? (
                      <StatusBadge status={ev.denialReasonCode} />
                    ) : (
                      '—'
                    )}
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
