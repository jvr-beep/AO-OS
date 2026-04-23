'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost, apiPatch } from '@/lib/browser-api'
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

const RISK_FLAG_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'banned', label: 'Banned' },
]

function EditGuestPanel({ guest, token, onSaved }: { guest: Guest; token: string; onSaved: (g: Guest) => void }) {
  const [email, setEmail] = useState(guest.email ?? '')
  const [phone, setPhone] = useState(guest.phone ?? '')
  const [firstName, setFirstName] = useState(guest.firstName ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    setOk(false)
    try {
      const updated = await apiPatch<Guest>(`/guests/${guest.id}`, {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        firstName: firstName.trim() || undefined,
      }, token)
      onSaved(updated)
      setOk(true)
    } catch (e: any) {
      setErr(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-4">
      <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Edit Contact</h2>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {ok && <span className="text-success text-xs">Saved.</span>}
          {err && <span className="text-critical text-xs">{err}</span>}
        </div>
      </form>
    </div>
  )
}

function RiskFlagPanel({ guest, token, onSaved }: { guest: Guest; token: string; onSaved: (g: Guest) => void }) {
  const [status, setStatus] = useState(guest.riskFlagStatus ?? 'clear')
  const [reason, setReason] = useState(guest.riskFlagReason ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    setOk(false)
    try {
      const updated = await apiPatch<Guest>(`/guests/${guest.id}`, {
        riskFlagStatus: status,
        riskFlagReason: reason.trim() || null,
      }, token)
      onSaved(updated)
      setOk(true)
    } catch (e: any) {
      setErr(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-4">
      <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Risk Flag</h2>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
            >
              {RISK_FLAG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Reason (staff note)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. aggressive behaviour 2026-04-20"
              className="w-full bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
            {saving ? 'Saving…' : 'Update Flag'}
          </button>
          {ok && <span className="text-success text-xs">Saved.</span>}
          {err && <span className="text-critical text-xs">{err}</span>}
        </div>
      </form>
    </div>
  )
}

function CancelBookingButton({ booking, token, onCancelled }: {
  booking: GuestBooking
  token: string
  onCancelled: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!['reserved', 'confirmed'].includes(booking.status)) return null

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault()
    setCancelling(true)
    setErr(null)
    try {
      await apiPost(`/guest-bookings/${booking.id}/cancel`, { reason: reason.trim() || undefined }, token)
      onCancelled(booking.id)
    } catch (e: any) {
      setErr(e.message ?? 'Cancel failed')
      setCancelling(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-critical hover:underline"
      >
        Cancel
      </button>
    )
  }

  return (
    <form onSubmit={handleCancel} className="flex flex-col gap-1 items-end">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        autoFocus
        className="bg-surface-0 border border-border-subtle text-text-primary rounded px-2 py-1 text-xs focus:outline-none focus:border-red-500 w-40"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setErr(null) }}
          className="text-xs text-text-muted hover:text-text-primary"
        >
          Keep
        </button>
        <button
          type="submit"
          disabled={cancelling}
          className="text-xs text-critical disabled:opacity-50"
        >
          {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
        </button>
      </div>
      {err && <p className="text-critical text-xs">{err}</p>}
    </form>
  )
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
  const [mergeSearchQ, setMergeSearchQ] = useState('')
  const [mergeSearching, setMergeSearching] = useState(false)
  const [mergeCandidates, setMergeCandidates] = useState<Guest[]>([])
  const [mergeSelected, setMergeSelected] = useState<Guest | null>(null)

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

  async function searchMergeTarget(e: React.FormEvent) {
    e.preventDefault()
    if (!mergeSearchQ.trim()) return
    setMergeSearching(true)
    setMergeCandidates([])
    setMergeSelected(null)
    setMergeTarget('')
    try {
      const q = mergeSearchQ.trim()
      const isEmail = q.includes('@')
      const isPhone = /^\+?[\d\s\-()]{7,}$/.test(q)
      const body = isEmail ? { email: q } : isPhone ? { phone: q } : { firstName: q }
      const result = await apiPost<{ guest: Guest | null; duplicateCandidates: Guest[] }>('/guests/lookup', body, token)
      const all: Guest[] = [
        ...(result.guest ? [result.guest] : []),
        ...(result.duplicateCandidates ?? []),
      ].filter((g) => g.id !== guestId)
      setMergeCandidates(all)
    } catch {
      setMergeCandidates([])
    } finally {
      setMergeSearching(false)
    }
  }

  function selectMergeTarget(g: Guest) {
    setMergeSelected(g)
    setMergeTarget(g.id)
    setMergeCandidates([])
  }

  if (loading) return <div className="max-w-5xl"><p className="text-text-muted">Loading…</p></div>
  if (error || !guest) return <div className="max-w-5xl"><p className="text-critical">{error ?? 'Guest not found'}</p></div>

  const displayIdentifier = guest.email ?? guest.phone ?? `Guest …${guest.id.slice(-8)}`
  const isBanned = guest.riskFlagStatus === 'banned'
  const isFlagged = guest.riskFlagStatus === 'flagged'

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">{displayIdentifier}</h1>
          <p className="text-text-muted text-xs font-mono">{guest.id}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/check-in?guestId=${guest.id}`} className="btn-primary text-xs">Check In →</Link>
          <Link href="/guests" className="btn-secondary text-xs">Back</Link>
        </div>
      </div>

      {(isBanned || isFlagged) && (
        <div className={`rounded-md border px-4 py-3 text-sm flex items-start gap-3 ${isBanned ? 'border-critical/40 bg-critical/10 text-critical' : 'border-warning/40 bg-warning/10 text-warning'}`}>
          <span className="text-lg">{isBanned ? '🚫' : '⚠️'}</span>
          <div>
            <p className="font-semibold">{isBanned ? 'Guest is banned' : 'Guest is flagged'}</p>
            {guest.riskFlagReason && <p className="text-xs mt-0.5 opacity-80">{guest.riskFlagReason}</p>}
            {guest.riskFlaggedAt && (
              <p className="text-xs opacity-60 mt-0.5">
                Flagged {new Date(guest.riskFlaggedAt).toLocaleDateString()}
                {guest.riskFlaggedBy && ` by ${guest.riskFlaggedBy}`}
              </p>
            )}
          </div>
        </div>
      )}

      {(okMessage || errorMessage) && (
        <div className={`rounded-md border px-3 py-2 text-sm ${errorMessage ? 'border-critical/40 bg-critical/10 text-critical' : 'border-success/40 bg-success/10 text-success'}`}>
          {errorMessage ?? okMessage}
        </div>
      )}

      {/* Profile + Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-text-muted">Name</dt><dd className="text-text-primary">{[guest.firstName, guest.lastName].filter(Boolean).join(' ') || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Email</dt><dd className="text-text-primary">{guest.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Phone</dt><dd className="text-text-primary">{guest.phone ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Language</dt><dd className="text-text-primary">{guest.preferredLanguage}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Marketing</dt><dd className="text-text-primary">{guest.marketingOptIn ? 'Opted in' : 'No'}</dd></div>
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-3">Status</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-center"><dt className="text-text-muted">Membership</dt><dd><StatusBadge status={guest.membershipStatus} /></dd></div>
            <div className="flex justify-between items-center"><dt className="text-text-muted">Risk Flag</dt><dd><StatusBadge status={guest.riskFlagStatus} /></dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Created</dt><dd className="text-text-primary text-xs">{new Date(guest.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        </div>
      </div>

      {/* Edit Contact */}
      <EditGuestPanel guest={guest} token={token} onSaved={setGuest} />

      {/* Risk Flag */}
      <RiskFlagPanel guest={guest} token={token} onSaved={setGuest} />

      {/* Visits */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle"><h2 className="text-sm font-semibold text-text-primary">Visits ({visits.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Duration</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {visits.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-text-muted">No visits yet.</td></tr>
            ) : visits.map((visit) => (
              <tr key={visit.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-3 text-xs text-text-muted">{new Date(visit.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{visit.source_type}</td>
                <td className="px-4 py-3"><StatusBadge status={visit.status} /></td>
                <td className="px-4 py-3 text-xs text-text-muted">{visit.duration_minutes ? `${visit.duration_minutes} min` : '—'}</td>
                <td className="px-4 py-3 text-right"><Link href={`/visits/${visit.id}`} className="text-xs text-accent-primary hover:underline">View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bookings */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle"><h2 className="text-sm font-semibold text-text-primary">Bookings ({bookings.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Channel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Balance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {bookings.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-text-muted">No bookings yet.</td></tr>
            ) : bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-text-muted">{booking.booking_code}</td>
                <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                <td className="px-4 py-3 text-xs text-text-muted">{booking.booking_channel}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{booking.balance_due_cents > 0 ? `$${(booking.balance_due_cents / 100).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{new Date(booking.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <CancelBookingButton
                    booking={booking}
                    token={token}
                    onCancelled={(id) => setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Waivers */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle"><h2 className="text-sm font-semibold text-text-primary">Waiver History ({waivers.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Version</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Accepted</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Channel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Current</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {waivers.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">No waiver on file.</td></tr>
            ) : waivers.map((w) => (
              <tr key={w.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-text-muted">{w.waiverVersion}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{new Date(w.acceptedAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-text-muted capitalize">{w.acceptedChannel}</td>
                <td className="px-4 py-3"><StatusBadge status={w.isCurrent ? 'active' : 'superseded'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Wristband Links */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle"><h2 className="text-sm font-semibold text-text-primary">Wristband History ({wristbandLinks.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">UID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Visit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Link Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {wristbandLinks.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">No wristband history.</td></tr>
            ) : wristbandLinks.map((wl) => (
              <tr key={wl.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-text-muted">{wl.wristbandUid}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {wl.visitStartTime ? new Date(wl.visitStartTime).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={wl.linkStatus} /></td>
                <td className="px-4 py-3 text-xs text-text-muted">{new Date(wl.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Merge Guest */}
      <div className="card p-4">
        <h2 className="text-xs font-semibold text-accent-primary uppercase tracking-wide mb-1">Merge Duplicate Record</h2>
        <p className="text-xs text-text-muted mb-4">
          Move all visits, bookings, and waivers from this guest into a target record. This guest&apos;s contact info will be cleared and the record marked as merged.
        </p>

        {/* Step 1: search */}
        {!mergeSelected && (
          <form onSubmit={searchMergeTarget} className="flex gap-2 mb-3">
            <input
              type="text"
              value={mergeSearchQ}
              onChange={(e) => setMergeSearchQ(e.target.value)}
              placeholder="Search by name, email, or phone"
              className="flex-1 bg-surface-0 border border-border-subtle text-text-primary rounded px-3 py-2 text-xs focus:outline-none focus:border-accent-primary"
            />
            <button
              type="submit"
              disabled={mergeSearching || !mergeSearchQ.trim()}
              className="btn-secondary text-xs py-2 px-3 disabled:opacity-50 shrink-0"
            >
              {mergeSearching ? '…' : 'Search'}
            </button>
          </form>
        )}

        {/* Candidate list */}
        {mergeCandidates.length > 0 && (
          <div className="border border-border-subtle rounded divide-y divide-border-subtle mb-3">
            {mergeCandidates.map((c) => (
              <button
                key={c.id}
                onClick={() => selectMergeTarget(c)}
                className="w-full text-left px-3 py-2.5 hover:bg-surface-1/50 transition-colors"
              >
                <p className="text-xs text-text-primary">{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</p>
                <p className="text-xs text-text-muted">{c.email ?? c.phone ?? c.id.slice(0, 8) + '…'}</p>
              </button>
            ))}
          </div>
        )}
        {mergeCandidates.length === 0 && mergeSearchQ && !mergeSearching && !mergeSelected && (
          <p className="text-xs text-text-muted mb-3">No matching guests found.</p>
        )}

        {/* Step 2: confirm with side-by-side preview */}
        {mergeSelected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-critical/40 bg-critical/10 p-3">
                <p className="text-xs text-critical uppercase tracking-wide mb-1.5">This record (source)</p>
                <p className="text-xs text-text-primary font-medium">{[guest?.firstName, guest?.lastName].filter(Boolean).join(' ') || '—'}</p>
                <p className="text-xs text-text-muted">{guest?.email ?? '—'}</p>
                <p className="text-xs text-text-muted">{guest?.phone ?? '—'}</p>
                <p className="text-xs text-text-muted mt-1">Will be cleared + flagged</p>
              </div>
              <div className="rounded border border-success/40 bg-success/10 p-3">
                <p className="text-xs text-success uppercase tracking-wide mb-1.5">Target (keep)</p>
                <p className="text-xs text-text-primary font-medium">{[mergeSelected.firstName, mergeSelected.lastName].filter(Boolean).join(' ') || '—'}</p>
                <p className="text-xs text-text-muted">{mergeSelected.email ?? '—'}</p>
                <p className="text-xs text-text-muted">{mergeSelected.phone ?? '—'}</p>
                <p className="text-xs text-text-muted mt-1">Receives all history</p>
              </div>
            </div>

            <form onSubmit={handleMerge} className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMergeSelected(null); setMergeTarget(''); setMergeError(null) }}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={merging}
                className="flex-1 rounded bg-red-700 hover:bg-red-600 text-text-primary text-xs font-medium py-2 px-4 transition-colors disabled:opacity-50"
              >
                {merging ? 'Merging…' : 'Confirm Merge — This Cannot Be Undone'}
              </button>
            </form>
            {mergeError && <p className="text-critical text-xs">{mergeError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
