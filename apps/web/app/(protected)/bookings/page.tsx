import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import {
  cancelBookingAction,
  checkInBookingAction,
  checkOutBookingAction,
  createBookingAction,
} from '@/app/actions/operators'
import type { RoomBooking, Room } from '@/types/api'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string }
}) {
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
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-6">Bookings</h1>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Create Booking</h2>
        <form action={createBookingAction} className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input type="hidden" name="redirectTo" value="/bookings" />
          <input name="memberId" placeholder="Member ID" className="rounded border px-2 py-1.5 text-sm font-mono" required />
          <input name="roomId" placeholder="Room ID" className="rounded border px-2 py-1.5 text-sm font-mono" required />
          <select name="bookingType" className="rounded border px-2 py-1.5 text-sm" defaultValue="restore">
            <option value="restore">restore</option>
            <option value="release">release</option>
            <option value="retreat">retreat</option>
          </select>
          <input name="startsAt" type="datetime-local" className="rounded border px-2 py-1.5 text-sm" required />
          <input name="endsAt" type="datetime-local" className="rounded border px-2 py-1.5 text-sm" required />
          <select name="sourceType" className="rounded border px-2 py-1.5 text-sm" defaultValue="manual_staff">
            <option value="manual_staff">manual_staff</option>
            <option value="membership_credit">membership_credit</option>
            <option value="upgrade_credit">upgrade_credit</option>
            <option value="one_time_purchase">one_time_purchase</option>
            <option value="package_credit">package_credit</option>
          </select>
          <input
            name="sourceReference"
            placeholder="Source reference (optional)"
            className="rounded border px-2 py-1.5 text-sm md:col-span-2"
          />
          <button className="rounded bg-blue-700 text-white text-sm px-3 py-1.5">Create Booking</button>
        </form>
      </div>

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
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orderedBookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
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
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {booking.status === 'reserved' && (
                          <>
                            <form action={checkInBookingAction}>
                              <input type="hidden" name="redirectTo" value="/bookings" />
                              <input type="hidden" name="bookingId" value={booking.id} />
                              <button className="rounded bg-blue-700 text-white text-xs px-2 py-1">
                                Check In
                              </button>
                            </form>
                            <form action={cancelBookingAction}>
                              <input type="hidden" name="redirectTo" value="/bookings" />
                              <input type="hidden" name="bookingId" value={booking.id} />
                              <input
                                type="text"
                                name="reason"
                                placeholder="cancel reason"
                                className="rounded border px-2 py-1 text-xs mb-1"
                              />
                              <button className="rounded bg-red-700 text-white text-xs px-2 py-1">
                                Cancel
                              </button>
                            </form>
                          </>
                        )}
                        {booking.status === 'checked_in' && (
                          <form action={checkOutBookingAction}>
                            <input type="hidden" name="redirectTo" value="/bookings" />
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button className="rounded bg-amber-700 text-white text-xs px-2 py-1">
                              Check Out
                            </button>
                          </form>
                        )}
                        {booking.status !== 'reserved' && booking.status !== 'checked_in' && (
                          <span className="text-xs text-gray-500">No actions</span>
                        )}
                      </div>
                    </td>
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
