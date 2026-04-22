'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Guest, GuestBooking, GuestVisit } from '@/types/api'

interface WaiverRecord {
  id: string
  waiverVersion: string
  acceptedAt: string
  acceptedChannel: string
  isCurrent: boolean
}

interface WristbandLink {
  id: string
  wristbandId: string
  wristbandUid: string
  visitId: string
  visitStatus: string | null
  visitStartTime: string | null
  linkStatus: string
  reasonCode: string | null
  createdAt: string
}

export function GuestDetailClient({
  token,
  guestId,
  okMessage,
  errorMessage,
}: {
  token: string
  guestId: string
  okMessage?: string
  errorMessage?: string
}) {
  const router = useRouter()
  const [guest, setGuest] = useState<Guest | null>(null)
  const [visits, setVisits] = useState<GuestVisit[]>([])
  const [bookings, setBookings] = useState<GuestBooking[]>([])
  const [waivers, setWaivers] = useState<WaiverRecord[]>([])
  const [wristbandLinks, setWristbandLinks] = useState<WristbandLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mergeTarget, setMergeTarget] = useState('')
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<Guest>(`/guests/${guestId}`, token),
      apiGet<GuestVisit[]>(`/guests/${guestId}/visits`, token).catch(() => [] as GuestVisit[]),
      apiGet<GuestBooking[]>(`/guest-bookings/guests/${guestId}/bookings`, token).catch(() => [] as GuestBooking[]),
      apiGet<WaiverRecord[]>(`/guests/${guestId}/waivers`, token).catch(() => [] as WaiverRecord[]),
      apiGet<WristbandLink[]>(`/guests/${guestId}/wristband-links`, token).catch(() => [] as WristbandLink[]),
    ]).then(([g, v, b, w, wl]) => {
      setGuest(g)
      setVisits([...v].sort((a, b2) => new Date(b2.created_at).getTime() - new Date(a.created_at).getTime()))
      setBookings([...b].sort((a, b2) => new Date(b2.created_at).getTime() - new Date(a.created_at).getTime()))
      setWaivers(w)
      setWristbandLinks(wl)
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [guestId, token])

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault()
    if (!mergeTarget.trim()) return
    setMerging(true)
    setMergeError(null)
    try {
      await apiPost('/guests/merge', { source_guest_id: guestId, target_guest_id: mergeTarget.trim() }, token)
      router.push(`/guests/${mergeTarget.trim()}?ok=Guest+records+merged`)
    } catch (err: any) {
      setMergeError(err.message ?? 'Merge failed')
      setMerging(false)
    }
  }

  if (loading) return <div className="max-w-5xl"><p className="text-text-muted">Loading…</p></div>
  if (error || !guest) return <div className="max-w-5xl"><p className="text-red-400">{error ?? 'Guest not found'}</p></div>

  const displayIdentifier = guest.email ?? guest.phone ?? `Guest …${guest.id.slice(-8)}`

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">{displayIdentifier}</h1>
          <p className="text-gray-400 text-xs font-mono">{guest.id}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/check-in?guestId=${guest.id}`} className="btn-primary text-xs">Check In →</Link>
          <Link href="/guests" className="btn-secondary text-xs">Back</Link>
        </div>
      </div>

      {(okMessage || errorMessage) && (
        <div className={`rounded-md border px-3 py-2 text-sm ${errorMessage ? 'border-red-700 bg-red-900 text-red-200' : 'border-green-700 bg-green-900 text-green-200'}`}>
          {errorMessage ?? okMessage}
        </div>
      )}

      {/* Profile + Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-400">Email</dt><dd className="text-white">{guest.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Phone</dt><dd className="text-white">{guest.phone ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Language</dt><dd className="text-white">{guest.preferredLanguage}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Marketing</dt><dd className="text-white">{guest.marketingOptIn ? 'Opted in' : 'No'}</dd></div>
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Status</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-center"><dt className="text-gray-400">Membership</dt><dd><StatusBadge status={guest.membershipStatus} /></dd></div>
            <div className="flex justify-between items-center"><dt className="text-gray-400">Risk Flag</dt><dd><StatusBadge status={guest.riskFlagStatus} /></dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Created</dt><dd className="text-white text-xs">{new Date(guest.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        </div>
      </div>

      {/* Visits */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700"><h2 className="text-sm font-semibold text-gray-200">Visits ({visits.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Duration</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {visits.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No visits yet.</td></tr>
            ) : visits.map((visit) => (
              <tr key={visit.id} className="hover:bg-gray-700/40">
                <td className="px-4 py-3 text-xs text-gray-300">{new Date(visit.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{visit.source_type}</td>
                <td className="px-4 py-3"><StatusBadge status={visit.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-300">{visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}</td>
                <td className="px-4 py-3 text-right"><Link href={`/visits/${visit.id}`} className="text-xs text-accent-primary hover:underline">View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bookings */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700"><h2 className="text-sm font-semibold text-gray-200">Bookings ({bookings.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Channel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Balance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {bookings.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No bookings yet.</td></tr>
            ) : bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-700/40">
                <td className="px-4 py-3 text-xs font-mono text-gray-300">{booking.booking_code}</td>
                <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-400">{booking.booking_channel}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{booking.balance_due_cents > 0 ? `$${(booking.balance_due_cents / 100).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(booking.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Waivers */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700"><h2 className="text-sm font-semibold text-gray-200">Waiver History ({waivers.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Version</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Accepted</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Channel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Current</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {waivers.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No waiver on file.</td></tr>
            ) : waivers.map((w) => (
              <tr key={w.id} className="hover:bg-gray-700/40">
                <td className="px-4 py-3 text-xs font-mono text-gray-300">{w.waiverVersion}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{new Date(w.acceptedAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-400 capitalize">{w.acceptedChannel}</td>
                <td className="px-4 py-3"><StatusBadge status={w.isCurrent ? 'active' : 'superseded'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Wristband Links */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700"><h2 className="text-sm font-semibold text-gray-200">Wristband History ({wristbandLinks.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">UID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Visit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Link Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {wristbandLinks.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No wristband history.</td></tr>
            ) : wristbandLinks.map((wl) => (
              <tr key={wl.id} className="hover:bg-gray-700/40">
                <td className="px-4 py-3 text-xs font-mono text-gray-300">{wl.wristbandUid}</td>
                <td className="px-4 py-3 text-xs text-gray-300">
                  {wl.visitStartTime ? new Date(wl.visitStartTime).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={wl.linkStatus} /></td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(wl.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Merge Guest */}
      <div className="card p-4">
        <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-1">Merge Duplicate Record</h2>
        <p className="text-xs text-gray-400 mb-4">
          Move all visits, bookings, and waivers from this guest into another. This guest&apos;s contact info will be cleared and the record flagged.
        </p>
        <form onSubmit={handleMerge} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Target Guest ID</label>
            <input
              type="text"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              placeholder="Paste target guest UUID"
              className="w-full bg-surface-0 border border-gray-600 text-white rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
            />
          </div>
          <button
            type="submit"
            disabled={merging || !mergeTarget.trim()}
            className="btn-secondary text-xs py-2 px-4 disabled:opacity-50 shrink-0"
          >
            {merging ? 'Merging…' : 'Merge →'}
          </button>
        </form>
        {mergeError && <p className="text-red-400 text-xs mt-2">{mergeError}</p>}
      </div>
    </div>
  )
}
