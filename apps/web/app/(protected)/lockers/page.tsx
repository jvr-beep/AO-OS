import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import {
  assignLockerAction,
  evaluateLockerPolicyAction,
  unassignLockerAction,
} from '@/app/actions/operators'
import type { Locker } from '@/types/api'

const HARD_BLOCKED_STATUSES = ['maintenance', 'offline', 'forced_open', 'out_of_service']

export default async function LockersPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  const lockers = await apiFetch<Locker[]>('/lockers', session.accessToken!)
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Lockers</h1>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Hard-Blocked Locker Statuses</h2>
        <p className="text-xs text-gray-500 mb-2">
          Staff override can bypass business-policy restrictions but cannot bypass operational safety blocks.
        </p>
        <div className="flex flex-wrap gap-2">
          {HARD_BLOCKED_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Evaluate Policy</h2>
          <form action={evaluateLockerPolicyAction} className="space-y-2">
            <input name="memberId" placeholder="Member ID" className="w-full rounded border px-2 py-1.5 text-sm font-mono" required />
            <input name="credentialId" placeholder="Credential ID" className="w-full rounded border px-2 py-1.5 text-sm font-mono" required />
            <input name="siteId" placeholder="Site/Location ID" className="w-full rounded border px-2 py-1.5 text-sm font-mono" required />
            <input name="sessionId" placeholder="Session ID" className="w-full rounded border px-2 py-1.5 text-sm font-mono" required />
            <select name="requestMode" className="w-full rounded border px-2 py-1.5 text-sm" defaultValue="day_use_shared">
              <option value="day_use_shared">day_use_shared</option>
              <option value="assigned">assigned</option>
              <option value="premium">premium</option>
              <option value="staff_override">staff_override</option>
            </select>
            <input name="requestedZoneId" placeholder="Requested zone ID (optional)" className="w-full rounded border px-2 py-1.5 text-sm font-mono" />
            <input name="requestedLockerId" placeholder="Requested locker ID (optional)" className="w-full rounded border px-2 py-1.5 text-sm font-mono" />
            <input name="staffOverrideReason" placeholder="Override reason (optional)" className="w-full rounded border px-2 py-1.5 text-sm" />
            <button className="rounded bg-blue-700 text-white text-sm px-3 py-1.5">Evaluate</button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Assign Locker</h2>
          <form action={assignLockerAction} className="space-y-2">
            <input name="lockerId" placeholder="Locker ID" className="w-full rounded border px-2 py-1.5 text-sm font-mono" required />
            <input name="memberId" placeholder="Member ID" className="w-full rounded border px-2 py-1.5 text-sm font-mono" required />
            <input name="siteId" placeholder="Site/Location ID (optional)" className="w-full rounded border px-2 py-1.5 text-sm font-mono" />
            <input name="visitSessionId" placeholder="Visit session ID (optional)" className="w-full rounded border px-2 py-1.5 text-sm font-mono" />
            <select name="assignmentMode" className="w-full rounded border px-2 py-1.5 text-sm" defaultValue="assigned">
              <option value="assigned">assigned</option>
              <option value="day_use_shared">day_use_shared</option>
              <option value="premium">premium</option>
              <option value="staff_override">staff_override</option>
            </select>
            <input name="requestedZoneId" placeholder="Requested zone ID (optional)" className="w-full rounded border px-2 py-1.5 text-sm font-mono" />
            <input name="requestedLockerId" placeholder="Requested locker ID (optional)" className="w-full rounded border px-2 py-1.5 text-sm font-mono" />
            <input name="staffOverrideReason" placeholder="Override reason (optional)" className="w-full rounded border px-2 py-1.5 text-sm" />
            <button className="rounded bg-blue-700 text-white text-sm px-3 py-1.5">Assign</button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Release Locker</h2>
          <form action={unassignLockerAction} className="space-y-2">
            <input name="lockerId" placeholder="Locker ID" className="w-full rounded border px-2 py-1.5 text-sm font-mono" required />
            <input
              name="unassignedReason"
              placeholder="Reason (e.g. visit_complete)"
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
            <button className="rounded bg-amber-700 text-white text-sm px-3 py-1.5">Release</button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Code
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Occupant
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Since
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {lockers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No lockers found.
                </td>
              </tr>
            ) : (
              lockers.map((locker) => (
                <tr key={locker.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{locker.code}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={locker.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {locker.assignedMemberId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {locker.assignedAt
                      ? new Date(locker.assignedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/lockers/${locker.id}`}
                      className="text-xs text-blue-600 hover:underline"
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
    </div>
  )
}
