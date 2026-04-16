import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Room } from '@/types/api'

export default async function RoomsPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const session = await getSession()
  const rooms = await apiFetch<Room[]>('/rooms', session.accessToken!)
  const query = searchParams?.q?.trim().toLowerCase() ?? ''

  const filteredRooms = query
    ? rooms.filter((room) => {
        const code = room.code.toLowerCase()
        const name = room.name.toLowerCase()
        const roomType = room.roomType.toLowerCase()
        const status = room.status.toLowerCase()
        return (
          code.includes(query) ||
          name.includes(query) ||
          roomType.includes(query) ||
          status.includes(query)
        )
      })
    : rooms

  const orderedRooms = [...filteredRooms].sort((a, b) => a.code.localeCompare(b.code))

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6 text-gray-100">Rooms</h1>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col sm:flex-row gap-2">
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search by code, name, type, or status"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {searchParams?.q && (
              <Link href="/rooms" className="btn-secondary text-center">
                Clear Search
              </Link>
            )}
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-0 border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Code
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wide">
                Flags
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {orderedRooms.length === 0 ? (
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
                      <Link href={`/rooms/${room.id}`} className="text-accent-primary hover:text-accent-primary transition-colors">
                        View
                      </Link>
                      <span className="text-gray-600">|</span>
                      <Link href={`/bookings?roomId=${room.id}`} className="text-accent-primary hover:text-accent-primary transition-colors">
                        Book
                      </Link>
                      <span className="text-gray-600">|</span>
                      <Link href={`/rooms/${room.id}#log-access`} className="text-accent-primary hover:text-accent-primary transition-colors">
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
