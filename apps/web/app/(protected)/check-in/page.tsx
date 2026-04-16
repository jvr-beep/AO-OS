import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { guestBookingCheckInAction, guestWalkInCheckInAction, guestCheckoutAction } from '@/app/actions/operators'
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

  const activeStatuses = ['checked_in', 'active', 'extended', 'paid_pending_assignment']
  const params = new URLSearchParams()
  activeStatuses.forEach((s) => params.append('status', s))

  const [tiers, activeVisits] = await Promise.all([
    apiFetch<Tier[]>('/catalog/tiers', token).catch(() => [] as Tier[]),
    apiFetch<GuestVisit[]>(`/visits?${params.toString()}`, token).catch(() => [] as GuestVisit[]),
  ])

  const activeSorted = [...activeVisits].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Check-In Console</h1>
          <p className="text-gray-400 text-sm">Booking check-in, walk-in registration, and checkout.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-xs">Back to Dashboard</Link>
      </div>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-700 bg-red-900 text-red-200'
              : 'border-green-700 bg-green-900 text-green-200'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Booking Check-In</h2>
          <p className="text-xs text-gray-400 mb-3">Scan or enter a booking code or UUID.</p>
          <form action={guestBookingCheckInAction} className="flex flex-col gap-2">
            <input type="hidden" name="redirectTo" value="/check-in" />
            <input
              name="bookingCode"
              placeholder="Booking code (e.g. AO-XXXX)"
              defaultValue={prefilledBookingCode}
              className="form-input"
            />
            <p className="text-xs text-gray-500">— or —</p>
            <input name="bookingId" placeholder="Booking UUID" className="form-input" />
            <button className="btn-primary">Check In from Booking</button>
          </form>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Walk-In Check-In</h2>
          <p className="text-xs text-gray-400 mb-3">Create a visit for a guest without a booking.</p>
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
              <option value="">Select tier…</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} ({tier.code})
                </option>
              ))}
            </select>
            <select name="productType" className="form-input" required>
              <option value="day_pass">day_pass</option>
              <option value="session">session</option>
              <option value="package">package</option>
            </select>
            <div className="flex gap-2">
              <input name="durationMinutes" type="number" placeholder="Duration (min)" className="form-input flex-1" required />
              <input name="quotedPriceCents" type="number" placeholder="Price (cents)" className="form-input flex-1" required />
            </div>
            <div className="flex gap-2">
              <input name="amountPaidCents" type="number" placeholder="Paid now (cents)" defaultValue="0" className="form-input flex-1" />
              <select name="paymentProvider" className="form-input flex-1">
                <option value="cash">cash</option>
                <option value="card">card</option>
                <option value="stripe">stripe</option>
              </select>
            </div>
            <button className="btn-primary">Walk-In Check In</button>
          </form>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-1">Quick Checkout</h2>
        <p className="text-xs text-gray-400 mb-3">Enter a visit UUID to check out directly.</p>
        <form action={guestCheckoutAction} className="flex gap-2">
          <input type="hidden" name="redirectTo" value="/check-in" />
          <input name="visitId" placeholder="Visit UUID" className="form-input flex-1" required />
          <button className="btn-secondary">Check Out</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">Active Visits ({activeSorted.length})</h2>
          <Link href="/visits" className="text-xs text-ao-teal hover:text-ao-primary transition-colors">
            All visits →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ao-dark border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Started</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Guest</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {activeSorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No active visits.
                </td>
              </tr>
            ) : (
              activeSorted.map((visit) => {
                const checkoutEligible = ['checked_in', 'active', 'extended'].includes(visit.status)
                return (
                  <tr key={visit.id} className="hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {new Date(visit.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link
                        href={`/guests/${visit.guest_id}`}
                        className="text-ao-teal hover:text-ao-primary transition-colors font-mono"
                      >
                        {visit.guest_id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      {visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/visits/${visit.id}`}
                          className="text-xs text-ao-teal hover:text-ao-primary transition-colors"
                        >
                          View →
                        </Link>
                        {checkoutEligible && (
                          <form action={guestCheckoutAction}>
                            <input type="hidden" name="redirectTo" value="/check-in" />
                            <input type="hidden" name="visitId" value={visit.id} />
                            <button className="btn-secondary text-xs px-2 py-1">Check Out</button>
                          </form>
                        )}
                      </div>
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
