'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost, apiPatch } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Locker, LockerAccessEvent } from '@/types/api'

const HARD_BLOCKED_STATUSES = ['maintenance', 'offline', 'forced_open', 'out_of_service']

export function LockerDetailClient({ token, lockerId, staffUserId, okMessage, errorMessage }: { token: string; lockerId: string; staffUserId?: string; okMessage?: string; errorMessage?: string }) {
  const router = useRouter()
  const [locker, setLocker] = useState<Locker | null>(null)
  const [events, setEvents] = useState<LockerAccessEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    okMessage ? { text: okMessage, ok: true } : errorMessage ? { text: errorMessage, ok: false } : null
  )
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.allSettled([
      apiGet<Locker[]>('/lockers', token),
      apiGet<LockerAccessEvent[]>(`/lockers/${lockerId}/access-events`, token),
    ]).then(([lr, er]) => {
      if (lr.status === 'fulfilled') {
        const found = lr.value.find((l) => l.id === lockerId)
        setLocker(found ?? null)
      }
      if (er.status === 'fulfilled') setEvents(er.value)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [lockerId, token])

  const handleMove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const toLockerId = (new FormData(e.currentTarget).get('toLockerId') as string ?? '').trim()
    setBusy(true)
    setMessage(null)
    try {
      await apiPost('/lockers/move', { fromLockerId: lockerId, toLockerId, memberId: locker?.assignedMemberId, staffUserId }, token)
      router.push(`/lockers/${toLockerId}?ok=${encodeURIComponent('Locker moved')}`)
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Move failed', ok: false })
      setBusy(false)
    }
  }

  const handleUnassign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const reason = (new FormData(e.currentTarget).get('unassignedReason') as string ?? '').trim()
    setBusy(true)
    setMessage(null)
    try {
      await apiPost('/lockers/unassign', { lockerId, unassignedReason: reason || undefined }, token)
      setMessage({ text: 'Locker released', ok: true })
      load()
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Release failed', ok: false })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="max-w-3xl"><p className="text-text-muted">Loading…</p></div>
  if (!locker) return <div className="max-w-3xl"><p className="text-red-400">Locker not found</p></div>

  const isOccupied = locker.status === 'occupied' && !!locker.assignedMemberId

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/lockers" className="text-sm text-accent-primary hover:text-accent-primary transition-colors">← Lockers</Link>
        <h1 className="text-3xl font-bold">Locker {locker.code}</h1>
        <StatusBadge status={locker.status} />
      </div>

      {message && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-success/40 bg-success/10 text-success' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      {locker.assignedMemberId && (
        <div className="card mb-4">
          <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Current Occupant</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-muted">Member</dt>
            <dd><Link href={`/members/${locker.assignedMemberId}`} className="text-accent-primary hover:text-accent-primary transition-colors">{locker.assignedMemberId}</Link></dd>
            <dt className="text-text-muted">Assigned</dt>
            <dd className="text-text-primary">{locker.assignedAt ? new Date(locker.assignedAt).toLocaleString() : '—'}</dd>
          </dl>
        </div>
      )}

      {isOccupied && (
        <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
          <div className="card">
            <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Move to Another Locker</h2>
            <p className="text-xs text-text-muted mb-2">Atomically releases this locker and assigns the member to the new one.</p>
            <form onSubmit={handleMove} className="space-y-2">
              <input name="toLockerId" placeholder="New Locker ID" className="form-input" required />
              <button disabled={busy} className="btn-primary w-full">Move</button>
            </form>
          </div>
          <div className="card">
            <h2 className="text-sm font-semibold text-accent-primary mb-3 uppercase tracking-wide">Release Locker</h2>
            <p className="text-xs text-text-muted mb-2">Manually release this locker assignment.</p>
            <form onSubmit={handleUnassign} className="space-y-2">
              <input name="unassignedReason" placeholder="Reason (optional)" className="form-input" />
              <button disabled={busy} className="btn-secondary w-full">Release</button>
            </form>
          </div>
        </div>
      )}

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Maintenance</h2>
        <p className="text-xs text-text-muted mb-3">
          {locker.status === 'maintenance'
            ? 'Locker is in maintenance mode. Assignment and access are blocked.'
            : 'Mark this locker out of service for repairs or inspection.'}
        </p>
        <button
          disabled={busy || ['occupied', 'reserved', 'assigned'].includes(locker.status)}
          onClick={async () => {
            setBusy(true)
            setMessage(null)
            try {
              const updated = await apiPatch<Locker>(`/lockers/${lockerId}/maintenance`, { maintenance: locker.status !== 'maintenance' }, token)
              setLocker(updated)
              setMessage({ text: locker.status === 'maintenance' ? 'Locker returned to service' : 'Locker set to maintenance', ok: true })
            } catch (e2: unknown) {
              setMessage({ text: e2 instanceof Error ? e2.message : 'Failed', ok: false })
            } finally {
              setBusy(false)
            }
          }}
          className={`text-xs px-4 py-2 rounded font-medium transition-colors disabled:opacity-40 ${locker.status === 'maintenance' ? 'bg-success/20 hover:bg-success/30 text-success' : 'bg-warning/20 hover:bg-warning/30 text-warning'}`}
        >
          {busy ? '…' : locker.status === 'maintenance' ? 'Return to Service' : 'Set Maintenance'}
        </button>
        {['occupied', 'reserved', 'assigned'].includes(locker.status) && (
          <p className="text-xs text-text-muted mt-2">Cannot set maintenance while locker is {locker.status}.</p>
        )}
      </div>

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wide">Operational Safety Rules</h2>
        <p className="text-xs text-text-muted mb-2">The statuses below are hard-blocked for assignment and access, even under staff override.</p>
        <div className="flex flex-wrap gap-2">{HARD_BLOCKED_STATUSES.map((s) => <StatusBadge key={s} status={s} />)}</div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle bg-surface-0">
          <h2 className="text-sm font-semibold text-accent-primary uppercase tracking-wide">Access Events ({events.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Member</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Reference</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Denial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {events.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No access events.</td></tr>
            ) : events.map((ev) => (
              <tr key={ev.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-2 text-xs text-text-muted">{new Date(ev.occurredAt).toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge status={ev.eventType} /></td>
                <td className="px-4 py-2 text-xs">
                  {ev.memberId ? <Link href={`/members/${ev.memberId}`} className="text-accent-primary hover:text-accent-primary transition-colors font-mono">{ev.memberId.slice(0, 8)}…</Link> : '—'}
                </td>
                <td className="px-4 py-2 text-xs text-text-muted font-mono">{ev.sourceReference ?? '—'}</td>
                <td className="px-4 py-2 text-xs">{ev.denialReasonCode ? <StatusBadge status={ev.denialReasonCode} /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
