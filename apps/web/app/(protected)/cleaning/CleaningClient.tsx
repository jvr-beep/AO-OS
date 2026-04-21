'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet, apiPost } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { CleaningTask, Room } from '@/types/api'

export function CleaningClient({ token, role, staffUserId }: { token: string; role?: string; staffUserId?: string }) {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map())
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
    ]).then(([t, r]) => {
      setTasks([...t].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
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
      <h1 className="text-2xl font-semibold mb-2 text-gray-100">Cleaning</h1>
      <p className="text-sm text-gray-400 mb-2">Front desk can view queue status. Operations and admin can start and complete tasks.</p>
      <p className="text-xs text-gray-500 mb-6">Task actions (start/complete) allowed roles: operations, admin.</p>

      {message && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.ok ? 'border-green-700 bg-green-900 text-green-200' : 'border-red-700 bg-red-900 text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by room, task type, status, notes, or room ID" className="form-input flex-1" />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Created</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Room</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Task Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Notes</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No cleaning tasks.</td></tr>
            ) : filtered.map((task) => {
              const room = rooms.get(task.roomId)
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  room={room}
                  canManage={canManage}
                  busy={busyId === task.id}
                  onStart={startTask}
                  onComplete={completeTask}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TaskRow({ task, room, canManage, busy, onStart, onComplete }: {
  task: CleaningTask
  room: Room | undefined
  canManage: boolean
  busy: boolean
  onStart: (id: string, occurredAt: string) => void
  onComplete: (id: string, notes: string) => void
}) {
  const [occurredAt, setOccurredAt] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <tr className="hover:bg-gray-700/40 align-top">
      <td className="px-4 py-3 text-xs text-gray-400">{new Date(task.createdAt).toLocaleString()}</td>
      <td className="px-4 py-3 text-xs">
        <Link href={`/rooms/${task.roomId}`} className="text-accent-primary hover:text-accent-primary transition-colors">
          {room ? `${room.code} (${room.name})` : task.roomId.slice(0, 8)}
        </Link>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">{task.taskType}</td>
      <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs">{task.notes ?? '—'}</td>
      <td className="px-4 py-3">
        {canManage && task.status === 'open' && (
          <div className="flex items-center gap-2">
            <input type="text" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} placeholder="occurredAt (optional)" className="form-input h-8 text-xs w-36" />
            <button onClick={() => onStart(task.id, occurredAt)} disabled={busy} className="btn-primary h-8 px-3 text-xs">Start</button>
          </div>
        )}
        {canManage && task.status === 'in_progress' && (
          <div className="flex items-center gap-2">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="completion note" className="form-input h-8 text-xs w-36" />
            <button onClick={() => onComplete(task.id, notes)} disabled={busy} className="btn-primary h-8 px-3 text-xs">Complete</button>
          </div>
        )}
        {!canManage && <span className="text-xs text-gray-500">View only</span>}
        {canManage && task.status !== 'open' && task.status !== 'in_progress' && <span className="text-xs text-gray-500">No actions</span>}
      </td>
    </tr>
  )
}
