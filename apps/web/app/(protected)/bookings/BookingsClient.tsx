'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { RoomBooking, Room } from '@/types/api'

export function BookingsClient({ token, prefilledRoomId, prefilledMemberId }: { token: string; prefilledRoomId?: string; prefilledMemberId?: string }) {
  const [bookings, setBookings] = useState<RoomBooking[]>([])
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map())
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      apiGet<RoomBooking[]>('/bookings', token),
      apiGet<Room[]>('/rooms', token),
    ]).then(([b, r]) => {
      setBookings([...b].sort((a, z) => new Date(z.startsAt).getTime() - new Date(a.startsAt).getTime()))
      setRooms(new Map(r.map((room) => [room.id, room])))
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const bookingMutate = async (bookingId: string, path: string, body: Record<string, unknown>, msg: string) => {
    setBusyId(bookingId)
    setMessage(null)
    try {
      await apiPost(path, body, token)
      setMessage({ text: msg, ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Action failed', ok: false })
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string ?? '').trim()
    setCreating(true)
    setMessage(null)
    try {
      await apiPost('/bookings', {
        memberId: get('memberId'), roomId: get('roomId'), bookingType: get('bookingType'),
        startsAt: new Date(get('startsAt')).toISOString(), endsAt: new Date(get('endsAt')).toISOString(),
        sourceType: get('sourceType'), sourceReference: get('sourceReference') || undefined,
      }, token)
      setMessage({ text: 'Booking created', ok: true })
      load()
      e.currentTarget.reset()
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Create booking failed', ok: false })
    } finally {
      setCreating(false)
    }
  }

  const filtered = query
    ? bookings.filter((b) => {
        const room = rooms.get(b.roomId)
        const q = query.toLowerCase()
        return (room?.code.toLowerCase() ?? '').includes(q) || b.bookingType.toLowerCase().includes(q) || b.status.toLowerCase().includes(q) || b.roomId.toLowerCase().includes(q) || b.memberId.toLowerCase().includes(q)
      })
    : bookings

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-6 text-gray-100">Bookings</h1>

      {message && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.ok ? 'border-green-700 bg-green-900 text-green-200' : 'border-red-700 bg-red-900 text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-200 mb-3">Create Booking</h2>
        <p className="text-xs text-gray-400 mb-3">Allowed roles: front_desk, operations, admin.</p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input name="memberId" placeholder="Member ID" defaultValue={prefilledMemberId} className="form-input" required />
          <input name="roomId" placeholder="Room ID" defaultValue={prefilledRoomId} className="form-input" required />
          <select name="bookingType" className="form-input" defaultValue="restore">
            <option value="restore">restore</option>
            <option value="release">release</option>
            <option value="retreat">retreat</option>
          </select>
          <input name="startsAt" type="datetime-local" className="form-input" required />
          <input name="endsAt" type="datetime-local" className="form-input" required />
          <select name="sourceType" className="form-input" defaultValue="manual_staff">
            <option value="manual_staff">manual_staff</option>
            <option value="membership_credit">membership_credit</option>
            <option value="upgrade_credit">upgrade_credit</option>
            <option value="one_time_purchase">one_time_purchase</option>
            <option value="package_credit">package_credit</option>
          </select>
          <input name="sourceReference" placeholder="Source reference (optional)" className="form-input md:col-span-2" />
          <button disabled={creating} className="btn-primary">{creating ? 'Creating…' : 'Create Booking'}</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by room code/ID, member ID, type, or status" className="form-input flex-1" />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Start</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">End</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Room</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Member</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No bookings found.</td></tr>
            ) : filtered.map((booking) => {
              const room = rooms.get(booking.roomId)
              const isBusy = busyId === booking.id
              return (
                <tr key={booking.id} className="hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(booking.startsAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(booking.endsAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">
                    <Link href={`/rooms/${booking.roomId}`} className="text-accent-primary hover:text-accent-primary transition-colors">{room?.code ?? booking.roomId.slice(0, 8)}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <Link href={`/members/${booking.memberId}`} className="text-accent-primary hover:text-accent-primary transition-colors font-mono">{booking.memberId.slice(0, 8)}…</Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{booking.bookingType}</td>
                  <td className="px-4 py-3">
                    <p className="text-[11px] text-gray-500 mb-1">Check-in/check-out/cancel: front_desk, operations, admin.</p>
                    <div className="flex flex-col gap-1">
                      {booking.status === 'reserved' && (
                        <>
                          <button onClick={() => bookingMutate(booking.id, `/bookings/${booking.id}/check-in`, { occurredAt: new Date().toISOString() }, 'Booking checked in')} disabled={isBusy} className="btn-primary text-xs px-2 py-1">Check In</button>
                          <CancelRow bookingId={booking.id} busy={isBusy} onCancel={(reason) => bookingMutate(booking.id, `/bookings/${booking.id}/cancel`, { occurredAt: new Date().toISOString(), reason: reason || undefined }, 'Booking cancelled')} />
                        </>
                      )}
                      {booking.status === 'checked_in' && (
                        <button onClick={() => bookingMutate(booking.id, `/bookings/${booking.id}/check-out`, { occurredAt: new Date().toISOString() }, 'Booking checked out')} disabled={isBusy} className="btn-secondary text-xs px-2 py-1">Check Out</button>
                      )}
                      {booking.status !== 'reserved' && booking.status !== 'checked_in' && <span className="text-xs text-gray-500">No actions</span>}
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

function CancelRow({ bookingId, busy, onCancel }: { bookingId: string; busy: boolean; onCancel: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-1">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="cancel reason" className="form-input text-xs" />
      <button onClick={() => onCancel(reason)} disabled={busy} className="btn-secondary text-xs px-2 py-1">Cancel</button>
    </div>
  )
}
