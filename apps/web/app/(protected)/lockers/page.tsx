import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { BrowserApiForm } from '@/components/browser-api-form'
import { StatusBadge } from '@/components/status-badge'
import type { Locker } from '@/types/api'

const HARD_BLOCKED_STATUSES = ['maintenance', 'offline', 'forced_open', 'out_of_service']

export default async function LockersPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string; q?: string }
}) {
  const session = await getSession()
  const lockers = await apiFetch<Locker[]>('/lockers', session.accessToken!)
  const role = session.user?.role
  const canEvaluatePolicy = role === 'operations' || role === 'admin'
  const canResolveAbandoned = role === 'operations' || role === 'admin'
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error
  const query = searchParams?.q?.trim().toLowerCase() ?? ''
  const filteredLockers = query
    ? lockers.filter((locker) => {
        const code = locker.code.toLowerCase()
        const status = locker.status.toLowerCase()
        const assignedMember = locker.assignedMemberId?.toLowerCase() ?? ''
        return code.includes(query) || status.includes(query) || assignedMember.includes(query)
      })
    : lockers

  // Group by zone (null zone → 'Unzoned')
  const zoneGroups = filteredLockers.reduce<Record<string, Locker[]>>((acc, locker) => {
    const key = locker.zoneId ?? 'Unzoned'
    if (!acc[key]) acc[key] = []
    acc[key].push(locker)
    return acc
  }, {})
  const sortedZoneKeys = Object.keys(zoneGroups).sort((a, b) =>
    a === 'Unzoned' ? 1 : b === 'Unzoned' ? -1 : a.localeCompare(b),
  )

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Lockers</h1>
      <p className="text-gray-400 mb-6">Policy evaluation, assignment, and access management</p>

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

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wide">Hard-Blocked Locker Statuses</h2>
        <p className="text-xs text-gray-400 mb-2">
          Staff override can bypass business-policy restrictions but cannot bypass operational safety blocks.
        </p>
        <div className="flex flex-wrap gap-2">
          {HARD_BLOCKED_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Evaluate Policy</h2>
          <p className="text-xs text-gray-400 mb-2">Allowed roles: operations, admin.</p>
          {!canEvaluatePolicy && <p className="text-xs text-amber-500 mb-2">operations/admin only</p>}
          <BrowserApiForm
            actionPath="/lockers/policy/evaluate"
            redirectTo="/lockers"
            successMessage="Locker policy evaluated"
            fallbackErrorMessage="Policy evaluate failed"
            augment="locker-policy"
            className="space-y-2"
            disabled={!canEvaluatePolicy}
          >
            <input name="memberId" placeholder="Member ID" className="form-input" required />
            <input name="credentialId" placeholder="Credential ID" className="form-input" required />
            <input name="siteId" placeholder="Site/Location ID" className="form-input" required />
            <input name="sessionId" placeholder="Session ID" className="form-input" required />
            <select name="requestMode" className="form-input" defaultValue="day_use_shared">
              <option value="day_use_shared">day_use_shared</option>
              <option value="assigned">assigned</option>
              <option value="premium">premium</option>
              <option value="staff_override">staff_override</option>
            </select>
            <input name="requestedZoneId" placeholder="Requested zone ID (optional)" className="form-input" />
            <input name="requestedLockerId" placeholder="Requested locker ID (optional)" className="form-input" />
            <input name="staffOverrideReason" placeholder="Override reason (optional)" className="form-input" />
            <button
              disabled={!canEvaluatePolicy}
              className={
                !canEvaluatePolicy
                  ? 'btn-secondary w-full opacity-50 cursor-not-allowed'
                  : 'btn-primary w-full'
              }
            >
              Evaluate
            </button>
          </BrowserApiForm>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Assign Locker</h2>
          <p className="text-xs text-gray-400 mb-2">Allowed roles: front_desk, operations, admin.</p>
          <BrowserApiForm
            actionPath="/lockers/assign"
            redirectTo="/lockers"
            successMessage="Locker assigned"
            fallbackErrorMessage="Assign failed"
            augment="locker-assign"
            className="space-y-2"
          >
            <input name="lockerId" placeholder="Locker ID" className="form-input" required />
            <input name="memberId" placeholder="Member ID" className="form-input" required />
            <input name="siteId" placeholder="Site/Location ID (optional)" className="form-input" />
            <input name="visitSessionId" placeholder="Visit session ID (optional)" className="form-input" />
            <select name="assignmentMode" className="form-input" defaultValue="assigned">
              <option value="assigned">assigned</option>
              <option value="day_use_shared">day_use_shared</option>
              <option value="premium">premium</option>
              <option value="staff_override">staff_override</option>
            </select>
            <input name="requestedZoneId" placeholder="Requested zone ID (optional)" className="form-input" />
            <input name="requestedLockerId" placeholder="Requested locker ID (optional)" className="form-input" />
            <input name="staffOverrideReason" placeholder="Override reason (optional)" className="form-input" />
            <button className="btn-primary w-full">Assign</button>
          </BrowserApiForm>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Release Locker</h2>
          <p className="text-xs text-gray-400 mb-2">Allowed roles: front_desk, operations, admin.</p>
          <BrowserApiForm
            actionPath="/lockers/unassign"
            redirectTo="/lockers"
            successMessage="Locker released"
            fallbackErrorMessage="Release failed"
            className="space-y-2"
          >
            <input name="lockerId" placeholder="Locker ID" className="form-input" required />
            <input
              name="unassignedReason"
              placeholder="Reason (e.g. visit_complete)"
              className="form-input"
            />
            <button className="btn-secondary w-full">Release</button>
          </BrowserApiForm>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col sm:flex-row gap-2">
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search by locker code, status, or assigned member ID"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {searchParams?.q && (
              <Link href="/lockers" className="btn-secondary text-center">
                Clear Search
              </Link>
            )}
          </form>
        </div>

        {filteredLockers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No lockers found.</p>
        ) : (
          sortedZoneKeys.map((zone) => (
            <div key={zone}>
              <div className="px-4 py-2 bg-surface-0 border-b border-gray-700">
                <p className="text-xs font-semibold text-accent-primary uppercase tracking-wide">
                  Zone: {zone}
                  <span className="ml-2 text-gray-400 font-normal">({zoneGroups[zone].length})</span>
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Code</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Occupant</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Since</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {zoneGroups[zone].map((locker) => (
                    <tr key={locker.id} className="hover:bg-gray-700/40">
                      <td className="px-4 py-3 font-medium text-white">{locker.code}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={locker.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {locker.assignedMemberId ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {locker.assignedAt ? new Date(locker.assignedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/lockers/${locker.id}`}
                          className="text-xs text-accent-primary hover:text-accent-primary transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {canResolveAbandoned && (
        <div className="card mt-4">
          <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wide">Resolve Abandoned Lockers</h2>
          <p className="text-xs text-gray-400 mb-3">
            Releases any lockers still assigned to sessions that have already checked out or expired.
            Optionally scope to a specific site.
          </p>
          <BrowserApiForm
            actionPath="/lockers/resolve-abandoned"
            redirectTo="/lockers"
            successMessage="Abandoned lockers resolved"
            fallbackErrorMessage="Resolve failed"
            className="flex flex-col sm:flex-row gap-2"
          >
            <input name="siteId" placeholder="Site/Location ID (optional — all sites if blank)" className="form-input flex-1" />
            <button className="btn-secondary whitespace-nowrap">Resolve Abandoned</button>
          </BrowserApiForm>
        </div>
      )}
    </div>
  )
}
