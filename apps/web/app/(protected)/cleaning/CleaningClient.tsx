'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet, apiPatch, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { CleaningTask, Room, RoomBooking } from '@/types/api'

// Returns a numeric urgency priority + secondary sort key (ms) for a cleaning task.
// Lower priority = more urgent (sort ascending).
// Priority 0: in_progress  → secondary: startedAt asc (longest running first)
// Priority 1: urgent open  → secondary: same booking sub-sort as below
// Priority 2: open, booking ended (checked_out / expired / no_show / cancelled) → secondary: endsAt asc
// Priority 3: open, booking still active (checked_in / reserved) → secondary: endsAt asc (soonest first)
// Priority 4: open, no booking context → secondary: createdAt asc
// Priority 5: completed / cancelled → secondary: completedAt desc (most recent first, so negate)
function urgencySort(task: CleaningTask, bookings: Map<string, RoomBooking>): [number, number] {
  if (task.status === 'in_progress') {
    return [0, new Date(task.startedAt ?? task.createdAt).getTime()]
  }
  if (task.status === 'open') {
    const booking = task.bookingId ? bookings.get(task.bookingId) : undefined
    const endsMs = booking ? new Date(booking.endsAt).getTime() : new Date(task.createdAt).getTime()
    const ended = booking ? ['checked_out', 'expired', 'no_show', 'cancelled'].includes(booking.status) : false
    if (task.isUrgent) return [1, endsMs]
    if (booking && ended) return [2, endsMs]
    if (booking && !ended) return [3, endsMs]
    return [4, new Date(task.createdAt).getTime()]
  }
  // completed / cancelled — push to bottom, most recent first
  return [5, -(new Date(task.completedAt ?? task.createdAt).getTime())]
}

export function CleaningClient({ token, role, staffUserId }: { token: string; role?: string; staffUserId?: string }) {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map())
  const [bookings, setBookings] = useState<Map<string, RoomBooking>>(new Map())
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const canManage = role === 'operations' || role === 'admin'

  const load = () => {
    setLoading(true)
    Promise.all([
      apiGet<CleaningTask[]>('/cleaning/tasks', token),
      apiGet<Room[]>('/rooms', token),
      apiGet<RoomBooking[]>('/bookings', token).catch(() => [] as RoomBooking[]),
    ]).then(([t, r, b]) => {
      const bookingMap = new Map(b.map((bk) => [bk.id, bk]))
      setBookings(bookingMap)
      setTasks([...t].sort((a, z) => {
        const [ap, as_] = urgencySort(a, bookingMap)
        const [zp, zs] = urgencySort(z, bookingMap)
        return ap !== zp ? ap - zp : as_ - zs
      }))
      setRooms(new Map(r.map((room) => [room.id, room])))
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const startTask = async (taskId: string, occurredAt: string) => {
    setBusyId(taskId)
    setMessage(null)
    try {
      await apiPost(`/cleaning/tasks/${taskId}/start`, { occurredAt: occurredAt || new Date().toISOString(), assignedToStaffUserId: staffUserId }, token)
      setMessage({ text: 'Cleaning task started', ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Task start failed', ok: false })
    } finally {
      setBusyId(null)
    }
  }

  const flagTask = async (taskId: string, isUrgent: boolean) => {
    setBusyId(taskId)
    setMessage(null)
    try {
      await apiPatch(`/cleaning/tasks/${taskId}/urgent`, { isUrgent }, token)
      setMessage({ text: isUrgent ? 'Task flagged as urgent' : 'Urgent flag cleared', ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Flag update failed', ok: false })
    } finally {
      setBusyId(null)
    }
  }

  const completeTask = async (taskId: string, notes: string) => {
    setBusyId(taskId)
    setMessage(null)
    try {
      await apiPost(`/cleaning/tasks/${taskId}/complete`, { occurredAt: new Date().toISOString(), notes: notes || undefined }, token)
      setMessage({ text: 'Cleaning task completed', ok: true })
      load()
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : 'Task complete failed', ok: false })
    } finally {
      setBusyId(null)
    }
  }

  const filtered = query
    ? tasks.filter((task) => {
        const room = rooms.get(task.roomId)
        const q = query.toLowerCase()
        return (
          (room?.code.toLowerCase() ?? '').includes(q) ||
          (room?.name.toLowerCase() ?? '').includes(q) ||
          task.taskType.toLowerCase().includes(q) ||
          task.status.toLowerCase().includes(q) ||
          (task.notes?.toLowerCase() ?? '').includes(q) ||
          task.roomId.toLowerCase().includes(q)
        )
      })
    : tasks

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-2 text-text-primary">Cleaning</h1>
      <p className="text-sm text-text-muted mb-2">Sorted by urgency: active cleaning → urgent → room empty → soonest expiring booking.</p>
      <p className="text-xs text-text-muted mb-6">Task actions (start/complete) allowed roles: operations, admin.</p>

      {message && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.ok ? 'border-success/40 bg-success/10 text-success' : 'border-critical/40 bg-critical/10 text-critical'}`}>
          {message.text}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by room, task type, status, notes, or room ID" className="form-input flex-1" />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Created</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Room</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Task Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Notes</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">No cleaning tasks.</td></tr>
            ) : filtered.map((task) => {
              const room = rooms.get(task.roomId)
              const booking = task.bookingId ? bookings.get(task.bookingId) : undefined
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  room={room}
                  booking={booking}
                  canManage={canManage}
                  busy={busyId === task.id}
                  onStart={startTask}
                  onComplete={completeTask}
                  onFlag={flagTask}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UrgencyChip({ task, booking }: { task: CleaningTask; booking: RoomBooking | undefined }) {
  if (task.status === 'in_progress') {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-critical/20 text-critical border border-critical/30">Cleaning now</span>
  }
  if (task.status !== 'open') return null
  if (task.isUrgent) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-critical/20 text-critical border border-critical/30">⚑ Urgent</span>
  }
  if (!booking) return null
  const ended = ['checked_out', 'expired', 'no_show', 'cancelled'].includes(booking.status)
  if (ended) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/20 text-warning border border-warning/30">Room empty</span>
  }
  const minsLeft = Math.round((new Date(booking.endsAt).getTime() - Date.now()) / 60000)
  if (minsLeft <= 0) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/20 text-warning border border-warning/30">Ending now</span>
  }
  if (minsLeft <= 30) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-primary/20 text-accent-primary border border-accent-primary/30">{minsLeft}m left</span>
  }
  const hrs = Math.floor(minsLeft / 60)
  const mins = minsLeft % 60
  const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] text-text-muted border border-border-subtle">{label} left</span>
}

function TaskRow({ task, room, booking, canManage, busy, onStart, onComplete, onFlag }: {
  task: CleaningTask
  room: Room | undefined
  booking: RoomBooking | undefined
  canManage: boolean
  busy: boolean
  onStart: (id: string, occurredAt: string) => void
  onComplete: (id: string, notes: string) => void
  onFlag: (id: string, isUrgent: boolean) => void
}) {
  const [notes, setNotes] = useState('')

  return (
    <tr className="hover:bg-surface-1/50 transition-colors align-top">
      <td className="px-4 py-3 text-xs text-text-muted">{new Date(task.createdAt).toLocaleString()}</td>
      <td className="px-4 py-3 text-xs">
        <Link href={`/rooms/${task.roomId}`} className="text-accent-primary hover:underline">
          {room ? `${room.code} (${room.name})` : task.roomId.slice(0, 8)}
        </Link>
        <div className="mt-1"><UrgencyChip task={task} booking={booking} /></div>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{task.taskType}</td>
      <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
      <td className="px-4 py-3 text-xs text-text-muted max-w-xs">{task.notes ?? '—'}</td>
      <td className="px-4 py-3">
        {canManage && task.status === 'open' && (
          <div className="flex items-center gap-2">
            <button onClick={() => onStart(task.id, new Date().toISOString())} disabled={busy} className="btn-primary h-8 px-3 text-xs">Start</button>
            <button
              onClick={() => onFlag(task.id, !task.isUrgent)}
              disabled={busy}
              className={`h-8 px-2 text-xs rounded font-medium transition-colors disabled:opacity-40 ${task.isUrgent ? 'bg-critical/20 text-critical hover:bg-critical/30 border border-critical/30' : 'bg-surface-2 text-text-muted hover:text-text-primary border border-border-subtle'}`}
              title={task.isUrgent ? 'Clear urgent flag' : 'Flag as urgent'}
            >
              ⚑
            </button>
          </div>
        )}
        {canManage && task.status === 'in_progress' && (
          <div className="flex items-center gap-2">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="completion note" className="form-input h-8 text-xs w-36" />
            <button onClick={() => onComplete(task.id, notes)} disabled={busy} className="btn-primary h-8 px-3 text-xs">Complete</button>
          </div>
        )}
        {!canManage && <span className="text-xs text-text-muted">View only</span>}
        {canManage && task.status !== 'open' && task.status !== 'in_progress' && <span className="text-xs text-text-muted">—</span>}
      </td>
    </tr>
  )
}
