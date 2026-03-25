import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { RoomBooking, Room } from '@/types/api'

export default async function BookingsPage() {
  const session = await getSession()
  const token = session.accessToken!

  const [bookings, rooms] = await Promise.all([
    apiFetch<RoomBooking[]>('/bookings', token),
    apiFetch<Room[]>('/rooms', token),
  ])

  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const orderedBookings = [...bookings].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  )

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-6">Bookings</h1>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Start
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                End
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Room
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Member
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orderedBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              orderedBookings.map((booking) => {
                const room = roomById.get(booking.roomId)

                return (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(booking.startsAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(booking.endsAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/rooms/${booking.roomId}`} className="text-blue-600 hover:underline">
                        {room?.code ?? booking.roomId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/members/${booking.memberId}`} className="text-blue-600 hover:underline font-mono">
                        {booking.memberId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{booking.bookingType}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
