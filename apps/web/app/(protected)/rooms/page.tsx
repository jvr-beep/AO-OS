import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Room } from '@/types/api'

export default async function RoomsPage() {
  const session = await getSession()
  const rooms = await apiFetch<Room[]>('/rooms', session.accessToken!)

  const orderedRooms = [...rooms].sort((a, b) => a.code.localeCompare(b.code))

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6">Rooms</h1>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Code
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Flags
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {orderedRooms.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No rooms found.
                </td>
              </tr>
            ) : (
              orderedRooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{room.code}</td>
                  <td className="px-4 py-3 font-medium">{room.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{room.roomType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={room.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div className="flex gap-1.5 flex-wrap">
                      {room.bookable ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          bookable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                          not-bookable
                        </span>
                      )}
                      {room.cleaningRequired && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          cleaning-required
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/rooms/${room.id}`} className="text-xs text-blue-600 hover:underline">
                      View →
                    </Link>
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
