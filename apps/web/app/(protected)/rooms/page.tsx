'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { getBrowserApiBase, readBrowserAccessToken } from '@/lib/browser-auth'
import type { Room } from '@/types/api'

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [query, setQuery] = useState('')
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const accessToken = readBrowserAccessToken()

    if (!accessToken) {
      window.location.assign('/login')
      return
    }

    let isCancelled = false

    async function loadRooms() {
      try {
        const response = await fetch(`${getBrowserApiBase()}/rooms`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            window.location.assign('/login')
            return
          }

          setPageErrorMessage('Could not load rooms right now.')
          return
        }

        const data = await response.json() as Room[]
        if (!isCancelled) {
          setRooms(data)
          setPageErrorMessage(null)
        }
      } catch {
        if (!isCancelled) {
          setPageErrorMessage('Could not load rooms right now.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadRooms()

    return () => {
      isCancelled = true
    }
  }, [])

  const filteredRooms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return rooms
    }

    return rooms.filter((room) => {
      const code = room.code.toLowerCase()
      const name = room.name.toLowerCase()
      const roomType = room.roomType.toLowerCase()
      const status = room.status.toLowerCase()
      return (
        code.includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        roomType.includes(normalizedQuery) ||
        status.includes(normalizedQuery)
      )
    })
  }, [query, rooms])

  const orderedRooms = useMemo(
    () => [...filteredRooms].sort((a, b) => a.code.localeCompare(b.code)),
    [filteredRooms],
  )

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6 text-gray-100">Rooms</h1>

      {pageErrorMessage && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900 px-4 py-3 text-sm text-red-200">
          {pageErrorMessage}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(event) => {
              event.preventDefault()
            }}
          >
            <input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code, name, type, or status"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {query && (
              <Link href="/rooms" className="btn-secondary text-center" onClick={() => setQuery('')}>
                Clear Search
              </Link>
            )}
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ao-dark border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Code
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Flags
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  Loading rooms...
                </td>
              </tr>
            ) : orderedRooms.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No rooms found.
                </td>
              </tr>
            ) : (
              orderedRooms.map((room) => (
              <tr key={room.id} className="hover:bg-gray-700/40">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{room.code}</td>
                <td className="px-4 py-3 font-medium text-gray-100">{room.name}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{room.roomType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={room.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div className="flex gap-1.5 flex-wrap">
                      {room.bookable ? (
                        <span className="px-2 py-0.5 rounded bg-green-900 text-green-200 border border-green-700">
                          bookable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 border border-gray-600">
                          not-bookable
                        </span>
                      )}
                      {room.cleaningRequired && (
                        <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-200 border border-amber-700">
                          cleaning-required
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Link href={`/rooms/${room.id}`} className="text-ao-teal hover:text-ao-primary transition-colors">
                        View
                      </Link>
                      <span className="text-gray-600">|</span>
                      <Link href={`/bookings?roomId=${room.id}`} className="text-ao-teal hover:text-ao-primary transition-colors">
                        Book
                      </Link>
                      <span className="text-gray-600">|</span>
                      <Link href={`/rooms/${room.id}#log-access`} className="text-ao-teal hover:text-ao-primary transition-colors">
                        Log Access
                      </Link>
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
