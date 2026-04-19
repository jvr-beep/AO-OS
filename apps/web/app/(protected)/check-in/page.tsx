import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import {
  guestBookingCheckInAction,
  guestWalkInCheckInAction,
  guestCheckoutAction,
  assignKioskVisitAction,
} from '@/app/actions/operators'
import { StatusBadge } from '@/components/status-badge'
import type { GuestVisit, Tier } from '@/types/api'

export default async function CheckInPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string; guestId?: string; bookingCode?: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error
  const prefilledGuestId = searchParams?.guestId ?? ''
  const prefilledBookingCode = searchParams?.bookingCode ?? ''

  const pendingStatuses = ['paid_pending_assignment', 'ready_for_assignment']
  const activeStatuses = ['checked_in', 'active', 'extended']
  const allWatchedStatuses = [...pendingStatuses, ...activeStatuses]

  const pendingParams = new URLSearchParams()
  pendingStatuses.forEach((s) => pendingParams.append('status', s))

  const activeParams = new URLSearchParams()
  allWatchedStatuses.forEach((s) => activeParams.append('status', s))

  const [tiers, allVisits] = await Promise.all([
    apiFetch<Tier[]>('/catalog/tiers', token).catch(() => [] as Tier[]),
    apiFetch<GuestVisit[]>(`/visits?${activeParams.toString()}`, token).catch(() => [] as GuestVisit[]),
  ])

  const pendingVisits = allVisits
    .filter((v) => pendingStatuses.includes(v.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const activeVisits = allVisits
    .filter((v) => activeStatuses.includes(v.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Check-In Console</h1>
          <p className="text-sm text-text-muted mt-1">Kiosk queue, walk-ins, and checkout.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">Dashboard</Link>
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

      {/* ── Pending Wristband Assignment ──────────────────────────────────── */}
      {pendingVisits.length > 0 && (
        <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-accent-primary/20 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <h2 className="text-sm font-semibold text-accent-primary uppercase tracking-wider">
              Awaiting Wristband ({pendingVisits.length})
            </h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {pendingVisits.map((visit) => (
              <div key={visit.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {(visit as any).guest_name ?? 'Guest'}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {(visit as any).tier_name ?? visit.tier_id?.slice(0, 8) ?? '—'}
                    {(visit as any).visit_mode && (
                      <span className="ml-2 text-accent-primary capitalize">{(visit as any).visit_mode}</span>
                    )}
                    {' · '}{visit.duration_minutes} min
                  </p>
                  <p className="text-xs font-mono text-text-muted/60 mt-0.5">{visit.id.slice(0, 8)}…</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={visit.status} />
                  <form action={assignKioskVisitAction}>
                    <input type="hidden" name="visitId" value={visit.id} />
                    <input type="hidden" name="redirectTo" value="/check-in" />
                    <button className="btn-primary text-xs px-3 py-1.5">
                      Assign &amp; Activate
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Walk-In + Booking check-in ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-text-secondary mb-1">Booking Check-In</h2>
          <p className="text-xs text-text-muted mb-3">Scan or enter a booking code or UUID.</p>
          <form action={guestBookingCheckInAction} className="flex flex-col gap-2">
            <input type="hidden" name="redirectTo" value="/check-in" />
            <input
              name="bookingCode"
              placeholder="Booking code (e.g. AO-XXXX)"
              defaultValue={prefilledBookingCode}
              className="form-input"
            />
            <p className="text-xs text-text-muted">— or —</p>
            <input name="bookingId" placeholder="Booking UUID" className="form-input" />
            <button className="btn-primary">Check In from Booking</button>
          </form>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-text-secondary mb-1">Walk-In Check-In</h2>
          <p className="text-xs text-text-muted mb-3">Create a visit without a booking.</p>
          <form action={guestWalkInCheckInAction} className="flex flex-col gap-2">
            <input type="hidden" name="redirectTo" value="/check-in" />
            <input
              name="guestId"
              placeholder="Guest UUID"
              defaultValue={prefilledGuestId}
              className="form-input"
              required
            />
            <select name="tierId" className="form-input" required>
              <option value="">Select pass…</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
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
            <button className="btn-primary">Walk-In Check In</button>
          </form>
        </div>
      </div>

      {/* ── Quick Checkout ────────────────────────────────────────────────── */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-text-secondary mb-1">Quick Checkout</h2>
        <form action={guestCheckoutAction} className="flex gap-2">
          <input type="hidden" name="redirectTo" value="/check-in" />
          <input name="visitId" placeholder="Visit UUID" className="form-input flex-1" required />
          <button className="btn-secondary">Check Out</button>
        </form>
      </div>

      {/* ── Active Visits ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary">
            Active Now ({activeVisits.length})
          </h2>
          <Link href="/visits" className="text-xs text-accent-primary hover:underline">
            All visits →
          </Link>
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
            {activeVisits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  No active visits.
                </td>
              </tr>
            ) : (
              activeVisits.map((visit) => (
                <tr key={visit.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3 text-xs text-text-primary">
                    {(visit as any).guest_name ?? (
                      <span className="font-mono text-text-muted">{visit.guest_id.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {(visit as any).tier_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={visit.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/visits/${visit.id}`} className="text-xs text-accent-primary hover:underline">
                        View
                      </Link>
                      <form action={guestCheckoutAction}>
                        <input type="hidden" name="redirectTo" value="/check-in" />
                        <input type="hidden" name="visitId" value={visit.id} />
                        <button className="text-xs text-text-muted hover:text-text-primary transition-colors">
                          Check Out
                        </button>
                      </form>
                    </div>
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
