'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Locker } from '@/types/api'

const HARD_BLOCKED_STATUSES = ['maintenance', 'offline', 'forced_open', 'out_of_service']

export function LockersClient({ token, role, staffUserId }: { token: string; role?: string; staffUserId?: string }) {
  const [lockers, setLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const canEvaluate = role === 'operations' || role === 'admin'

  const load = () => {
    setLoading(true)
    apiGet<Locker[]>('/lockers', token)
      .then(setLockers)
      .catch(() => setLockers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const mutate = async (path: string, body: Record<string, unknown>, successFn: (r: Record<string, unknown>) => string) => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await apiPost<Record<string, unknown>>(path, body, token)
      setMessage({ text: successFn(result), ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Action failed', ok: false })
    } finally {
      setBusy(false)
    }
  }

  const handleEvaluate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string ?? '').trim()
    const requestMode = get('requestMode')
    mutate('/lockers/policy/evaluate', {
      memberId: get('memberId'), credentialId: get('credentialId'), siteId: get('siteId'),
      sessionId: get('sessionId'), requestMode, requestedZoneId: get('requestedZoneId') || undefined,
      requestedLockerId: get('requestedLockerId') || undefined, staffOverride: requestMode === 'staff_override',
      staffOverrideReason: get('staffOverrideReason') || undefined,
    }, (r) => `Policy ${r.decision} (${r.reasonCode}), chosen=${r.chosenLockerId ?? 'none'}`)
    e.currentTarget.reset()
  }

  const handleAssign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string ?? '').trim()
    mutate('/lockers/assign', {
      lockerId: get('lockerId'), memberId: get('memberId'), siteId: get('siteId') || undefined,
      visitSessionId: get('visitSessionId') || undefined, assignmentMode: get('assignmentMode') || 'assigned',
      requestedZoneId: get('requestedZoneId') || undefined, requestedLockerId: get('requestedLockerId') || undefined,
      staffOverrideReason: get('staffOverrideReason') || undefined, assignedByStaffUserId: staffUserId,
    }, () => 'Locker assigned')
    e.currentTarget.reset()
  }

  const handleUnassign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string ?? '').trim()
    mutate('/lockers/unassign', { lockerId: get('lockerId'), unassignedReason: get('unassignedReason') || undefined }, () => 'Locker released')
    e.currentTarget.reset()
  }

  const handleResolveAbandoned = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const siteId = (fd.get('siteId') as string ?? '').trim()
    mutate('/lockers/resolve-abandoned', { siteId: siteId || undefined }, (r) => `Released ${r.released ?? 0} abandoned locker(s)`)
    e.currentTarget.reset()
  }

  const filtered = query
    ? lockers.filter((l) => {
        const q = query.toLowerCase()
        return l.code.toLowerCase().includes(q) || l.status.toLowerCase().includes(q) || (l.assignedMemberId?.toLowerCase() ?? '').includes(q)
      })
    : lockers

  const zoneGroups = filtered.reduce<Record<string, Locker[]>>((acc, locker) => {
    const key = locker.zoneId ?? 'Unzoned'
    if (!acc[key]) acc[key] = []
    acc[key].push(locker)
    return acc
  }, {})
  const sortedZoneKeys = Object.keys(zoneGroups).sort((a, b) => a === 'Unzoned' ? 1 : b === 'Unzoned' ? -1 : a.localeCompare(b))

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Lockers</h1>
      <p className="text-text-muted mb-6">Policy evaluation, assignment, and access management</p>

      {message && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-success/40 bg-success/10 text-success' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wide">Hard-Blocked Locker Statuses</h2>
        <p className="text-xs text-text-muted mb-2">Staff override can bypass business-policy restrictions but cannot bypass operational safety blocks.</p>
        <div className="flex flex-wrap gap-2">
          {HARD_BLOCKED_STATUSES.map((status) => <StatusBadge key={status} status={status} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Evaluate Policy</h2>
          <p className="text-xs text-text-muted mb-2">Allowed roles: operations, admin.</p>
          {!canEvaluate && <p className="text-xs text-amber-500 mb-2">operations/admin only</p>}
          <form onSubmit={handleEvaluate} className="space-y-2">
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
            <button disabled={!canEvaluate || busy} className={!canEvaluate ? 'btn-secondary w-full opacity-50 cursor-not-allowed' : 'btn-primary w-full'}>Evaluate</button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Assign Locker</h2>
          <p className="text-xs text-text-muted mb-2">Allowed roles: front_desk, operations, admin.</p>
          <form onSubmit={handleAssign} className="space-y-2">
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
            <button disabled={busy} className="btn-primary w-full">Assign</button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Release Locker</h2>
          <p className="text-xs text-text-muted mb-2">Allowed roles: front_desk, operations, admin.</p>
          <form onSubmit={handleUnassign} className="space-y-2">
            <input name="lockerId" placeholder="Locker ID" className="form-input" required />
            <input name="unassignedReason" placeholder="Reason (e.g. visit_complete)" className="form-input" />
            <button disabled={busy} className="btn-secondary w-full">Release</button>
          </form>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by locker code, status, or assigned member ID" className="form-input flex-1" />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No lockers found.</p>
        ) : sortedZoneKeys.map((zone) => (
          <div key={zone}>
            <div className="px-4 py-2 bg-surface-0 border-b border-border-subtle">
              <p className="text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Zone: {zone}<span className="ml-2 text-text-muted font-normal">({zoneGroups[zone].length})</span>
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-0 border-b border-border-subtle">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Occupant</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Since</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {zoneGroups[zone].map((locker) => (
                  <tr key={locker.id} className="hover:bg-surface-1/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{locker.code}</td>
                    <td className="px-4 py-3"><StatusBadge status={locker.status} /></td>
                    <td className="px-4 py-3 text-xs text-text-muted">{locker.assignedMemberId ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{locker.assignedAt ? new Date(locker.assignedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/lockers/${locker.id}`} className="text-xs text-accent-primary hover:text-accent-primary transition-colors">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {canEvaluate && (
        <div className="card mt-4">
          <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wide">Resolve Abandoned Lockers</h2>
          <p className="text-xs text-text-muted mb-3">Releases any lockers still assigned to sessions that have already checked out or expired. Optionally scope to a specific site.</p>
          <form onSubmit={handleResolveAbandoned} className="flex flex-col sm:flex-row gap-2">
            <input name="siteId" placeholder="Site/Location ID (optional — all sites if blank)" className="form-input flex-1" />
            <button disabled={busy} className="btn-secondary whitespace-nowrap">Resolve Abandoned</button>
          </form>
        </div>
      )}
    </div>
  )
}
