'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { GuestVisit } from '@/types/api'

const FILTER_GROUPS: Record<string, string[]> = {
  pending: ['initiated', 'awaiting_payment', 'ready_for_assignment', 'paid_pending_assignment'],
  active: ['checked_in', 'active', 'extended'],
  closed: ['checked_out', 'cancelled'],
}

const filters = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
]

export function VisitsClient({ token, staffUserId }: { token: string; staffUserId?: string }) {
  const [statusFilter, setStatusFilter] = useState('active')
  const [visits, setVisits] = useState<GuestVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const router = useRouter()

  const fetchVisits = (filter: string) => {
    setLoading(true)
    const statuses = FILTER_GROUPS[filter] ?? []
    const params = new URLSearchParams()
    statuses.forEach((s) => params.append('status', s))
    const path = `/visits${params.toString() ? `?${params.toString()}` : ''}`
    apiGet<GuestVisit[]>(path, token)
      .then((data) => setVisits([...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())))
      .catch(() => setVisits([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchVisits(statusFilter) }, [statusFilter, token])

  const checkout = async (visitId: string) => {
    setCheckingOut(visitId)
    try {
      await apiPost('/orchestrators/checkout', { visit_id: visitId, check_out_channel: 'staff', changed_by_user_id: staffUserId }, token)
      setMessage({ text: 'Guest checked out', ok: true })
      fetchVisits(statusFilter)
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Checkout failed', ok: false })
    } finally {
      setCheckingOut(null)
    }
  }

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Visits</h1>
          <p className="text-sm text-text-muted mt-1">Live and historical guest visit records.</p>
        </div>
        <Link href="/check-in" className="btn-primary text-xs">Check-In Console →</Link>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setMessage(null) }}
            className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-accent-primary text-surface-0 border-accent-primary'
                : 'bg-transparent text-text-muted border-border-subtle hover:border-accent-primary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
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
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : visits.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">No visits found.</td></tr>
            ) : visits.map((visit) => {
              const checkoutEligible = ['checked_in', 'active', 'extended'].includes(visit.status)
              const guestName = (visit as any).guest_name
              return (
                <tr key={visit.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3 text-xs">
                    {guestName
                      ? <Link href={`/guests/${visit.guest_id}`} className="text-text-primary hover:text-accent-primary transition-colors">{guestName}</Link>
                      : <Link href={`/guests/${visit.guest_id}`} className="font-mono text-text-muted hover:text-accent-primary">{visit.guest_id.slice(0, 8)}…</Link>}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{(visit as any).tier_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted capitalize">{(visit as any).visit_mode ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={visit.status} /></td>
                  <td className="px-4 py-3 text-xs text-text-muted">{visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(visit.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/visits/${visit.id}`} className="text-xs text-accent-primary hover:underline">View</Link>
                      {checkoutEligible && (
                        <button
                          onClick={() => checkout(visit.id)}
                          disabled={checkingOut === visit.id}
                          className="text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                        >
                          {checkingOut === visit.id ? '…' : 'Check Out'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
