'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiGet } from '@/lib/browser-api'
import { StatusBadge } from '@/components/status-badge'
import type { Room } from '@/types/api'

export function RoomsClient({ token }: { token: string }) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    apiGet<Room[]>('/rooms', token)
      .then(setRooms)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = query
    ? rooms.filter((r) => {
        const q = query.toLowerCase()
        return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.roomType.toLowerCase().includes(q) || r.status.toLowerCase().includes(q)
      })
    : rooms
  const ordered = [...filtered].sort((a, b) => a.code.localeCompare(b.code))

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6 text-text-primary">Rooms</h1>
      {error && <div className="mb-4 rounded border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-critical">{error}</div>}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, name, type, or status" className="form-input flex-1" />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[580px]">
          <thead className="bg-surface-0 border-b border-border-subtle">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            ) : ordered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">No rooms found.</td></tr>
            ) : ordered.map((room) => (
              <tr key={room.id} className="hover:bg-surface-1/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-text-muted">{room.code}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{room.name}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{room.roomType}</td>
                <td className="px-4 py-3"><StatusBadge status={room.status} /></td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex gap-1.5 flex-wrap">
                    {room.bookable
                      ? <span className="px-2 py-0.5 rounded bg-success/20 text-success border border-success/40">bookable</span>
                      : <span className="px-2 py-0.5 rounded bg-surface-2 text-text-muted border border-border-subtle">not-bookable</span>}
                    {room.cleaningRequired && <span className="px-2 py-0.5 rounded bg-warning/20 text-warning border border-warning/40">cleaning-required</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Link href={`/rooms/${room.id}`} className="text-accent-primary hover:underline">View</Link>
                    <span className="text-border-subtle">|</span>
                    <Link href={`/bookings?roomId=${room.id}`} className="text-accent-primary hover:underline">Book</Link>
                    <span className="text-border-subtle">|</span>
                    <Link href={`/rooms/${room.id}#log-access`} className="text-accent-primary hover:underline">Log Access</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
