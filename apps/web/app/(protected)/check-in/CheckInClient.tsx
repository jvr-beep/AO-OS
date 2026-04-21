'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost, apiPatch } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { GuestVisit, Tier } from '@/types/api'

const PENDING_STATUSES = ['paid_pending_assignment', 'ready_for_assignment']
const ACTIVE_STATUSES = ['checked_in', 'active', 'extended']

export function CheckInClient({ token, staffUserId, prefilledGuestId, prefilledBookingCode }: {
  token: string
  staffUserId?: string
  prefilledGuestId?: string
  prefilledBookingCode?: string
}) {
  const router = useRouter()
  const [tiers, setTiers] = useState<Tier[]>([])
  const [pendingVisits, setPendingVisits] = useState<GuestVisit[]>([])
  const [activeVisits, setActiveVisits] = useState<GuestVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [walkingIn, setWalkingIn] = useState(false)

  const allWatchedStatuses = [...PENDING_STATUSES, ...ACTIVE_STATUSES]

  const load = () => {
    setLoading(true)
    const activeParams = new URLSearchParams()
    allWatchedStatuses.forEach((s) => activeParams.append('status', s))
    Promise.all([
      apiGet<Tier[]>('/catalog/tiers', token).catch(() => [] as Tier[]),
      apiGet<GuestVisit[]>(`/visits?${activeParams.toString()}`, token).catch(() => [] as GuestVisit[]),
    ]).then(([t, visits]) => {
      setTiers(t)
      setPendingVisits(visits.filter((v) => PENDING_STATUSES.includes(v.status)).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
      setActiveVisits(visits.filter((v) => ACTIVE_STATUSES.includes(v.status)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const assignKioskVisit = async (visitId: string) => {
    setBusyId(visitId)
    setMessage(null)
    try {
      await apiPatch(`/visits/${visitId}/status`, { status: 'checked_in', reason_code: 'wristband_assigned', changed_by_user_id: staffUserId }, token)
      await apiPatch(`/visits/${visitId}/status`, { status: 'active', reason_code: 'visit_activated', changed_by_user_id: staffUserId }, token)
      setMessage({ text: 'Visit activated — wristband issued', ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Assign failed', ok: false })
    } finally {
      setBusyId(null)
    }
  }

  const handleBookingCheckIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const bookingCode = (fd.get('bookingCode') as string ?? '').trim() || undefined
    const bookingId = (fd.get('bookingId') as string ?? '').trim() || undefined
    if (!bookingCode && !bookingId) { setMessage({ text: 'bookingId or bookingCode is required', ok: false }); return }
    setCheckingIn(true)
    setMessage(null)
    try {
      const result = await apiPost<{ visit_id: string }>('/orchestrators/check-in/booking', { booking_id: bookingId, booking_code: bookingCode, changed_by_user_id: staffUserId }, token)
      router.push(`/visits/${result.visit_id}?ok=${encodeURIComponent('Guest checked in from booking')}`)
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Booking check-in failed', ok: false })
      setCheckingIn(false)
    }
  }

  const handleWalkIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string ?? '').trim()
    setWalkingIn(true)
    setMessage(null)
    try {
      const result = await apiPost<{ visit_id: string }>('/orchestrators/check-in/walk-in', {
        guest_id: get('guestId'), tier_id: get('tierId'), product_type: get('productType') || 'locker',
        duration_minutes: parseInt(get('durationMinutes') || '120', 10),
        quoted_price_cents: parseInt(get('quotedPriceCents') || '0', 10),
        amount_paid_cents: parseInt(get('amountPaidCents') || '0', 10),
        payment_provider: get('paymentProvider') || 'cash',
        changed_by_user_id: staffUserId,
      }, token)
      router.push(`/visits/${result.visit_id}?ok=${encodeURIComponent('Walk-in checked in')}`)
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Walk-in check-in failed', ok: false })
      setWalkingIn(false)
    }
  }

  const handleQuickCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const visitId = (fd.get('visitId') as string ?? '').trim()
    setCheckingOut(true)
    setMessage(null)
    try {
      await apiPost('/orchestrators/checkout', { visit_id: visitId, check_out_channel: 'staff', changed_by_user_id: staffUserId }, token)
      router.push(`/visits/${visitId}?ok=${encodeURIComponent('Guest checked out')}`)
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Checkout failed', ok: false })
      setCheckingOut(false)
    }
  }

  const checkoutVisit = async (visitId: string) => {
    setBusyId(visitId)
    setMessage(null)
    try {
      await apiPost('/orchestrators/checkout', { visit_id: visitId, check_out_channel: 'staff', changed_by_user_id: staffUserId }, token)
      setMessage({ text: 'Guest checked out', ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Checkout failed', ok: false })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Check-In Console</h1>
          <p className="text-sm text-text-muted mt-1">Kiosk queue, walk-ins, and checkout.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">Dashboard</Link>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      {!loading && pendingVisits.length > 0 && (
        <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-accent-primary/20 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <h2 className="text-sm font-semibold text-accent-primary uppercase tracking-wider">Awaiting Wristband ({pendingVisits.length})</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {pendingVisits.map((visit) => (
              <div key={visit.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{(visit as any).guest_name ?? 'Guest'}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {(visit as any).tier_name ?? visit.tier_id?.slice(0, 8) ?? '—'}
                    {(visit as any).visit_mode && <span className="ml-2 text-accent-primary capitalize">{(visit as any).visit_mode}</span>}
                    {' · '}{visit.duration_minutes} min
                  </p>
                  <p className="text-xs font-mono text-text-muted/60 mt-0.5">{visit.id.slice(0, 8)}…</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={visit.status} />
                  <button onClick={() => assignKioskVisit(visit.id)} disabled={busyId === visit.id} className="btn-primary text-xs px-3 py-1.5">
                    {busyId === visit.id ? '…' : 'Assign & Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-text-secondary mb-1">Booking Check-In</h2>
          <p className="text-xs text-text-muted mb-3">Scan or enter a booking code or UUID.</p>
          <form onSubmit={handleBookingCheckIn} className="flex flex-col gap-2">
            <input name="bookingCode" placeholder="Booking code (e.g. AO-XXXX)" defaultValue={prefilledBookingCode} className="form-input" />
            <p className="text-xs text-text-muted">— or —</p>
            <input name="bookingId" placeholder="Booking UUID" className="form-input" />
            <button disabled={checkingIn} className="btn-primary">{checkingIn ? 'Checking in…' : 'Check In from Booking'}</button>
          </form>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-text-secondary mb-1">Walk-In Check-In</h2>
          <p className="text-xs text-text-muted mb-3">Create a visit without a booking.</p>
          <form onSubmit={handleWalkIn} className="flex flex-col gap-2">
            <input name="guestId" placeholder="Guest UUID" defaultValue={prefilledGuestId} className="form-input" required />
            <select name="tierId" className="form-input" required>
              <option value="">Select pass…</option>
              {tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input name="durationMinutes" type="number" placeholder="Duration (min)" className="form-input flex-1" defaultValue="120" required />
              <input name="quotedPriceCents" type="number" placeholder="Price (cents)" className="form-input flex-1" required />
            </div>
            <div className="flex gap-2">
              <input name="amountPaidCents" type="number" placeholder="Paid now" defaultValue="0" className="form-input flex-1" />
              <select name="paymentProvider" className="form-input flex-1">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>
            <input type="hidden" name="productType" value="locker" />
            <button disabled={walkingIn} className="btn-primary">{walkingIn ? 'Checking in…' : 'Walk-In Check In'}</button>
          </form>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-text-secondary mb-1">Quick Checkout</h2>
        <form onSubmit={handleQuickCheckout} className="flex gap-2">
          <input name="visitId" placeholder="Visit UUID" className="form-input flex-1" required />
          <button disabled={checkingOut} className="btn-secondary">{checkingOut ? '…' : 'Check Out'}</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary">Active Now ({activeVisits.length})</h2>
          <Link href="/visits" className="text-xs text-accent-primary hover:underline">All visits →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Guest</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Pass</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide">Time</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : activeVisits.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No active visits.</td></tr>
            ) : activeVisits.map((visit) => (
              <tr key={visit.id} className="hover:bg-surface-2">
                <td className="px-4 py-3 text-xs text-text-primary">{(visit as any).guest_name ?? <span className="font-mono text-text-muted">{visit.guest_id.slice(0, 8)}…</span>}</td>
                <td className="px-4 py-3 text-xs text-text-secondary">{(visit as any).tier_name ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={visit.status} /></td>
                <td className="px-4 py-3 text-xs text-text-muted">{visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/visits/${visit.id}`} className="text-xs text-accent-primary hover:underline">View</Link>
                    <button onClick={() => checkoutVisit(visit.id)} disabled={busyId === visit.id} className="text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50">
                      {busyId === visit.id ? '…' : 'Check Out'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
