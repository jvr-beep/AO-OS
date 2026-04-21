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
      <h1 className="text-2xl font-semibold mb-6 text-gray-100">Rooms</h1>
      {error && <div className="mb-4 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, name, type, or status" className="form-input flex-1" />
            {query && <button onClick={() => setQuery('')} className="btn-secondary">Clear</button>}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : ordered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No rooms found.</td></tr>
            ) : ordered.map((room) => (
              <tr key={room.id} className="hover:bg-gray-700/40">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{room.code}</td>
                <td className="px-4 py-3 font-medium text-gray-100">{room.name}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{room.roomType}</td>
                <td className="px-4 py-3"><StatusBadge status={room.status} /></td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex gap-1.5 flex-wrap">
                    {room.bookable
                      ? <span className="px-2 py-0.5 rounded bg-green-900 text-green-200 border border-green-700">bookable</span>
                      : <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 border border-gray-600">not-bookable</span>}
                    {room.cleaningRequired && <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-200 border border-amber-700">cleaning-required</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Link href={`/rooms/${room.id}`} className="text-accent-primary hover:text-accent-primary transition-colors">View</Link>
                    <span className="text-gray-600">|</span>
                    <Link href={`/bookings?roomId=${room.id}`} className="text-accent-primary hover:text-accent-primary transition-colors">Book</Link>
                    <span className="text-gray-600">|</span>
                    <Link href={`/rooms/${room.id}#log-access`} className="text-accent-primary hover:text-accent-primary transition-colors">Log Access</Link>
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
