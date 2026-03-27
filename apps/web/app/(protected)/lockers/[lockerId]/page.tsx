import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Locker, LockerAccessEvent } from '@/types/api'

const HARD_BLOCKED_STATUSES = ['maintenance', 'offline', 'forced_open', 'out_of_service']

export default async function LockerDetailPage({
  params,
}: {
  params: { lockerId: string }
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

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/lockers" className="text-sm text-blue-600 hover:underline">
          ← Lockers
        </Link>
        <h1 className="text-2xl font-semibold">Locker {locker.code}</h1>
        <StatusBadge status={locker.status} />
      </div>

      {locker.assignedMemberId && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Occupant</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Member</dt>
            <dd>
              <Link
                href={`/members/${locker.assignedMemberId}`}
                className="text-blue-600 hover:underline"
              >
                {locker.assignedMemberId}
              </Link>
            </dd>
            <dt className="text-gray-500">Assigned</dt>
            <dd>{locker.assignedAt ? new Date(locker.assignedAt).toLocaleString() : '—'}</dd>
          </dl>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Operational Safety Rules</h2>
        <p className="text-xs text-gray-500 mb-2">
          The statuses below are hard-blocked for assignment and access, even under staff override.
        </p>
        <div className="flex flex-wrap gap-2">
          {HARD_BLOCKED_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-700">
            Access Events ({events.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Time
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Member
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Reference
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Denial
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No access events.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(ev.occurredAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={ev.eventType} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {ev.memberId ? (
                      <Link
                        href={`/members/${ev.memberId}`}
                        className="text-blue-600 hover:underline font-mono"
                      >
                        {ev.memberId.slice(0, 8)}…
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 font-mono">
                    {ev.sourceReference ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {ev.denialReasonCode ? (
                      <StatusBadge status={ev.denialReasonCode} variant="danger" />
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
