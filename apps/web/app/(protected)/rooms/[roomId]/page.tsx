import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch, ApiError } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { Room, RoomBooking, RoomAccessEvent } from '@/types/api'

export default async function RoomDetailPage({
  params,
}: {
  params: { roomId: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const { roomId } = params

  const [roomResult, bookingsResult, eventsResult] = await Promise.allSettled([
    apiFetch<Room>(`/rooms/${roomId}`, token),
    apiFetch<RoomBooking[]>(`/rooms/${roomId}/bookings`, token),
    apiFetch<RoomAccessEvent[]>(`/rooms/${roomId}/access-events`, token),
  ])

  if (roomResult.status === 'rejected') {
    const err = roomResult.reason as ApiError
    if (err.status === 404) notFound()
    throw err
  }

  const room = roomResult.value
  const bookings =
    bookingsResult.status === 'fulfilled'
      ? [...bookingsResult.value].sort(
          (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        )
      : []
  const events =
    eventsResult.status === 'fulfilled'
      ? [...eventsResult.value].sort(
          (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )
      : []

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/rooms" className="text-sm text-blue-600 hover:underline">
          ← Rooms
        </Link>
        <h1 className="text-2xl font-semibold">{room.name}</h1>
        <StatusBadge status={room.status} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Room Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Code</dt>
          <dd className="font-mono text-xs">{room.code}</dd>
          <dt className="text-gray-500">Type</dt>
          <dd>{room.roomType}</dd>
          <dt className="text-gray-500">Privacy</dt>
          <dd>{room.privacyLevel}</dd>
          <dt className="text-gray-500">Bookable</dt>
          <dd>{room.bookable ? 'yes' : 'no'}</dd>
          <dt className="text-gray-500">Cleaning Required</dt>
          <dd>{room.cleaningRequired ? 'yes' : 'no'}</dd>
          <dt className="text-gray-500">Last Turned</dt>
          <dd>{room.lastTurnedAt ? new Date(room.lastTurnedAt).toLocaleString() : '—'}</dd>
          <dt className="text-gray-500">Floor Plan Area</dt>
          <dd className="font-mono text-xs break-all">{room.floorPlanAreaId}</dd>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-4">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Bookings ({bookings.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Member
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Window
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  No bookings for this room.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs">
                    <Link href={`/members/${booking.memberId}`} className="text-blue-600 hover:underline font-mono">
                      {booking.memberId.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(booking.startsAt).toLocaleString()} →{' '}
                    {new Date(booking.endsAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{booking.bookingType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Access Events ({events.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Time
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Decision
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Reason
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Event
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No access events.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(event.occurredAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={event.decision} />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600 font-mono">
                    {event.denialReasonCode ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{event.eventType}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{event.sourceType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
