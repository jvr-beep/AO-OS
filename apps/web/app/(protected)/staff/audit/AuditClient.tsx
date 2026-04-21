'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import type { AuditEvent } from '@/types/api'

export function AuditClient({ token }: { token: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    apiGet<AuditEvent[]>('/staff-audit', token)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = query
    ? events.filter((ev) => {
        const q = query.toLowerCase()
        const actorEmailSnapshot = (ev as AuditEvent & { actorEmailSnapshot?: string }).actorEmailSnapshot ?? ''
        const actorDisplay = ev.staffUser?.fullName ?? actorEmailSnapshot ?? ev.staffUserId ?? 'system'
        return (
          actorDisplay.toLowerCase().includes(q) ||
          (ev.action ?? '').toLowerCase().includes(q) ||
          (ev.targetType ?? '').toLowerCase().includes(q) ||
          (ev.targetId ?? '').toLowerCase().includes(q)
        )
      })
    : events

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/staff" className="text-sm text-accent-primary hover:underline">Staff</Link>
        <h1 className="text-2xl font-semibold text-text-primary">Audit Log</h1>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="bg-surface-1 rounded-lg border border-border-subtle overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by staff, action, target type, or target ID"
              className="form-input flex-1"
            />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-2 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Staff</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">No audit events.</td></tr>
            ) : (
              filtered.map((ev) => {
                const actorEmailSnapshot = (ev as AuditEvent & { actorEmailSnapshot?: string }).actorEmailSnapshot
                const actorDisplay = ev.staffUser?.fullName ?? actorEmailSnapshot ?? (ev.staffUserId ? `${ev.staffUserId.slice(0, 8)}…` : 'System')
                return (
                  <tr key={ev.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{new Date(ev.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-text-primary">{actorDisplay}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{ev.action}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {ev.targetType ? `${ev.targetType}${ev.targetId ? ` / ${ev.targetId.slice(0, 8)}…` : ''}` : '—'}
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
