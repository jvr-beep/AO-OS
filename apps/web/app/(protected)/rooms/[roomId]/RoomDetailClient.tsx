'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet, apiPost, apiPatch } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Room, RoomBooking, RoomAccessEvent, CleaningTask } from '@/types/api'

export function RoomDetailClient({ token, roomId, okMessage, errorMessage }: { token: string; roomId: string; okMessage?: string; errorMessage?: string }) {
  const [room, setRoom] = useState<Room | null>(null)
  const [bookings, setBookings] = useState<RoomBooking[]>([])
  const [events, setEvents] = useState<RoomAccessEvent[]>([])
  const [cleaningTask, setCleaningTask] = useState<CleaningTask | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    okMessage ? { text: okMessage, ok: true } : errorMessage ? { text: errorMessage, ok: false } : null
  )
  const [logging, setLogging] = useState(false)
  const [togglingMaintenance, setTogglingMaintenance] = useState(false)
  const [cleaningBusy, setCleaningBusy] = useState(false)
  const [completionNote, setCompletionNote] = useState('')

  const load = () => {
    setLoading(true)
    Promise.allSettled([
      apiGet<Room>(`/rooms/${roomId}`, token),
      apiGet<RoomBooking[]>(`/rooms/${roomId}/bookings`, token),
      apiGet<RoomAccessEvent[]>(`/rooms/${roomId}/access-events`, token),
      apiGet<CleaningTask[]>(`/cleaning/tasks?roomId=${roomId}`, token),
    ]).then(([r, b, e, ct]) => {
      if (r.status === 'fulfilled') setRoom(r.value)
      if (b.status === 'fulfilled') setBookings([...b.value].sort((a, z) => new Date(z.startsAt).getTime() - new Date(a.startsAt).getTime()))
      if (e.status === 'fulfilled') setEvents([...e.value].sort((a, z) => new Date(z.occurredAt).getTime() - new Date(a.occurredAt).getTime()))
      if (ct.status === 'fulfilled') {
        const active = ct.value.find((t) => t.status === 'open' || t.status === 'in_progress') ?? null
        setCleaningTask(active)
      }
    }).finally(() => setLoading(false))
  }

  const startCleaning = async () => {
    setCleaningBusy(true)
    setMessage(null)
    try {
      await apiPost(`/cleaning/rooms/${roomId}/start`, {}, token)
      setMessage({ text: 'Cleaning started — room marked as cleaning', ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Failed to start cleaning', ok: false })
    } finally {
      setCleaningBusy(false)
    }
  }

  const completeCleaning = async () => {
    setCleaningBusy(true)
    setMessage(null)
    try {
      await apiPost(`/cleaning/rooms/${roomId}/complete`, { notes: completionNote || undefined }, token)
      setMessage({ text: 'Cleaning complete — room marked as available', ok: true })
      setCompletionNote('')
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Failed to complete cleaning', ok: false })
    } finally {
      setCleaningBusy(false)
    }
  }

  useEffect(() => { load() }, [roomId, token])

  const handleLogAccess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string ?? '').trim()
    setLogging(true)
    setMessage(null)
    try {
      await apiPost('/rooms/access', {
        roomId, wristbandId: get('wristbandId'), eventType: get('eventType'),
        occurredAt: get('occurredAt') ? new Date(get('occurredAt')).toISOString() : new Date().toISOString(),
        sourceType: get('sourceType') || 'staff_console', sourceReference: get('sourceReference') || undefined,
      }, token)
      setMessage({ text: 'Room access event recorded', ok: true })
      load()
      e.currentTarget.reset()
    } catch (e2: unknown) {
      setMessage({ text: e2 instanceof Error ? e2.message : 'Room access event failed', ok: false })
    } finally {
      setLogging(false)
    }
  }

  if (loading) return <div className="max-w-5xl"><p className="text-text-muted">Loading…</p></div>
  if (!room) return <div className="max-w-5xl"><p className="text-red-400">Room not found</p></div>

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/rooms" className="text-sm text-accent-primary hover:text-accent-primary transition-colors">← Rooms</Link>
        <h1 className="text-2xl font-semibold text-text-primary">{room.name}</h1>
        <StatusBadge status={room.status} />
      </div>

      {message && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.ok ? 'border-success/40 bg-success/10 text-success' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Room Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Code</dt><dd className="font-mono text-xs text-text-muted">{room.code}</dd>
          <dt className="text-text-muted">Type</dt><dd className="text-text-primary">{room.roomType}</dd>
          <dt className="text-text-muted">Privacy</dt><dd className="text-text-primary">{room.privacyLevel}</dd>
          <dt className="text-text-muted">Bookable</dt><dd className="text-text-primary">{room.bookable ? 'yes' : 'no'}</dd>
          <dt className="text-text-muted">Cleaning Required</dt><dd className="text-text-primary">{room.cleaningRequired ? 'yes' : 'no'}</dd>
          <dt className="text-text-muted">Last Turned</dt><dd className="text-text-primary">{room.lastTurnedAt ? new Date(room.lastTurnedAt).toLocaleString() : '—'}</dd>
          <dt className="text-text-muted">Floor Plan Area</dt><dd className="font-mono text-xs text-text-muted break-all">{room.floorPlanAreaId}</dd>
        </dl>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Maintenance</h2>
        <p className="text-xs text-text-muted mb-3">
          {room.status === 'maintenance'
            ? 'Room is in maintenance mode. Bookings and check-ins are blocked.'
            : 'Mark this room out of service for cleaning or repairs.'}
        </p>
        <button
          disabled={togglingMaintenance || ['reserved', 'checked_in', 'cleaning'].includes(room.status)}
          onClick={async () => {
            setTogglingMaintenance(true)
            setMessage(null)
            try {
              const updated = await apiPatch<Room>(`/rooms/${roomId}/maintenance`, { maintenance: room.status !== 'maintenance' }, token)
              setRoom(updated)
              setMessage({ text: room.status === 'maintenance' ? 'Room returned to service' : 'Room set to maintenance', ok: true })
            } catch (e2: unknown) {
              setMessage({ text: e2 instanceof Error ? e2.message : 'Failed', ok: false })
            } finally {
              setTogglingMaintenance(false)
            }
          }}
          className={`text-xs px-4 py-2 rounded font-medium transition-colors disabled:opacity-40 ${room.status === 'maintenance' ? 'bg-success/20 hover:bg-success/30 text-success' : 'bg-warning/20 hover:bg-warning/30 text-warning'}`}
        >
          {togglingMaintenance ? '…' : room.status === 'maintenance' ? 'Return to Service' : 'Set Maintenance'}
        </button>
        {['reserved', 'checked_in', 'cleaning'].includes(room.status) && (
          <p className="text-xs text-text-muted mt-2">Cannot set maintenance while room is {room.status}.</p>
        )}
      </div>

      {cleaningTask !== undefined && (
        <div className="card p-4 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-2">Cleaning</h2>
          {cleaningTask === null ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-text-muted flex-1">No active cleaning task.</p>
              {room.status !== 'occupied' && room.status !== 'booked' && (
                <button onClick={startCleaning} disabled={cleaningBusy} className="btn-primary text-xs px-3 h-8">
                  {cleaningBusy ? '…' : 'Start Cleaning'}
                </button>
              )}
            </div>
          ) : cleaningTask.status === 'open' ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-text-muted">Task queued — <span className="text-text-primary font-mono">{cleaningTask.taskType}</span></p>
                <p className="text-xs text-text-muted mt-0.5">Created {new Date(cleaningTask.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={startCleaning} disabled={cleaningBusy} className="btn-primary text-xs px-3 h-8">
                {cleaningBusy ? '…' : 'Start Cleaning'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-critical/20 text-critical border border-critical/30">Cleaning in progress</span>
                {cleaningTask.startedAt && <span className="text-xs text-text-muted">since {new Date(cleaningTask.startedAt).toLocaleTimeString()}</span>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Completion note (optional)"
                  className="form-input h-8 text-xs flex-1"
                />
                <button onClick={completeCleaning} disabled={cleaningBusy} className="btn-primary text-xs px-3 h-8 whitespace-nowrap">
                  {cleaningBusy ? '…' : 'Mark Complete'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div id="log-access" className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Log Room Access Event</h2>
        <p className="text-xs text-text-muted mb-3">Allowed roles: front_desk, operations, admin.</p>
        <form onSubmit={handleLogAccess} className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input name="wristbandId" placeholder="Wristband ID" className="form-input" required />
          <select name="eventType" className="form-input" defaultValue="unlock">
            <option value="unlock">unlock</option>
            <option value="lock">lock</option>
            <option value="open">open</option>
            <option value="close">close</option>
            <option value="check_in_gate">check_in_gate</option>
            <option value="check_out_gate">check_out_gate</option>
          </select>
          <select name="sourceType" className="form-input" defaultValue="staff_console">
            <option value="staff_console">staff_console</option>
            <option value="wristband_reader">wristband_reader</option>
            <option value="system">system</option>
          </select>
          <input name="sourceReference" placeholder="source reference (optional)" className="form-input" />
          <input name="occurredAt" type="datetime-local" className="form-input" />
          <button disabled={logging} className="btn-primary">{logging ? '…' : 'Record Event'}</button>
        </form>
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border-subtle"><h2 className="text-sm font-semibold text-text-primary">Bookings ({bookings.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Member</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Window</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">No bookings for this room.</td></tr>
            ) : bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-2 text-xs"><Link href={`/members/${booking.memberId}`} className="text-accent-primary hover:text-accent-primary transition-colors font-mono">{booking.memberId.slice(0, 8)}…</Link></td>
                <td className="px-4 py-2 text-xs text-text-muted">{new Date(booking.startsAt).toLocaleString()} → {new Date(booking.endsAt).toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge status={booking.status} /></td>
                <td className="px-4 py-2 text-xs text-text-muted">{booking.bookingType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle"><h2 className="text-sm font-semibold text-text-primary">Access Events ({events.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Decision</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Reason</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Event</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-accent-primary uppercase tracking-wide">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">No access events.</td></tr>
            ) : events.map((event) => (
              <tr key={event.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-2 text-xs text-text-muted">{new Date(event.occurredAt).toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge status={event.decision} /></td>
                <td className="px-4 py-2 text-xs text-text-muted font-mono">{event.denialReasonCode ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-text-muted">{event.eventType}</td>
                <td className="px-4 py-2 text-xs text-text-muted">{event.sourceType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
