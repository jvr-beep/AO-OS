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
  searchParams?: { ok?: string; error?: string; roomId?: string; memberId?: string; q?: string }
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
  const prefilledRoomId = searchParams?.roomId
  const prefilledMemberId = searchParams?.memberId
  const query = searchParams?.q?.trim().toLowerCase() ?? ''

  const filteredBookings = query
    ? orderedBookings.filter((booking) => {
        const room = roomById.get(booking.roomId)
        const roomCode = room?.code.toLowerCase() ?? ''
        const bookingType = booking.bookingType.toLowerCase()
        const status = booking.status.toLowerCase()
        const roomId = booking.roomId.toLowerCase()
        const memberId = booking.memberId.toLowerCase()
        return (
          roomCode.includes(query) ||
          bookingType.includes(query) ||
          status.includes(query) ||
          roomId.includes(query) ||
          memberId.includes(query)
        )
      })
    : orderedBookings

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-6 text-gray-100">Bookings</h1>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-700 bg-red-900 text-red-200'
              : 'border-green-700 bg-green-900 text-green-200'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-200 mb-3">Create Booking</h2>
        <p className="text-xs text-gray-400 mb-3">
          Allowed roles: front_desk, operations, admin.
        </p>
        <form action={createBookingAction} className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input type="hidden" name="redirectTo" value="/bookings" />
          <input
            name="memberId"
            placeholder="Member ID"
            defaultValue={prefilledMemberId}
            className="form-input"
            required
          />
          <input
            name="roomId"
            placeholder="Room ID"
            defaultValue={prefilledRoomId}
            className="form-input"
            required
          />
          <select name="bookingType" className="form-input" defaultValue="restore">
            <option value="restore">restore</option>
            <option value="release">release</option>
            <option value="retreat">retreat</option>
          </select>
          <input name="startsAt" type="datetime-local" className="form-input" required />
          <input name="endsAt" type="datetime-local" className="form-input" required />
          <select name="sourceType" className="form-input" defaultValue="manual_staff">
            <option value="manual_staff">manual_staff</option>
            <option value="membership_credit">membership_credit</option>
            <option value="upgrade_credit">upgrade_credit</option>
            <option value="one_time_purchase">one_time_purchase</option>
            <option value="package_credit">package_credit</option>
          </select>
          <input
            name="sourceReference"
            placeholder="Source reference (optional)"
            className="form-input md:col-span-2"
          />
          <button className="btn-primary">Create Booking</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="roomId" value={prefilledRoomId ?? ''} />
            <input type="hidden" name="memberId" value={prefilledMemberId ?? ''} />
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search by room code/ID, member ID, type, or status"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {searchParams?.q && (
              <Link
                href={`/bookings${prefilledRoomId || prefilledMemberId ? `?${new URLSearchParams({
                  ...(prefilledRoomId ? { roomId: prefilledRoomId } : {}),
                  ...(prefilledMemberId ? { memberId: prefilledMemberId } : {}),
                }).toString()}` : ''}`}
                className="btn-secondary text-center"
              >
                Clear Search
              </Link>
            )}
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ao-dark border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Start
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                End
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Room
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Member
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No bookings found.
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => {
                const room = roomById.get(booking.roomId)

                return (
                  <tr key={booking.id} className="hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(booking.startsAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(booking.endsAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/rooms/${booking.roomId}`} className="text-ao-teal hover:text-ao-primary transition-colors">
                        {room?.code ?? booking.roomId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/members/${booking.memberId}`} className="text-ao-teal hover:text-ao-primary transition-colors font-mono">
                        {booking.memberId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{booking.bookingType}</td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-gray-500 mb-1">Check-in/check-out/cancel: front_desk, operations, admin.</p>
                      <div className="flex flex-col gap-1">
                        {booking.status === 'reserved' && (
                          <>
                            <form action={checkInBookingAction}>
                              <input type="hidden" name="redirectTo" value="/bookings" />
                              <input type="hidden" name="bookingId" value={booking.id} />
                              <button className="btn-primary text-xs px-2 py-1">
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
                                className="form-input text-xs mb-1"
                              />
                              <button className="btn-secondary text-xs px-2 py-1">
                                Cancel
                              </button>
                            </form>
                          </>
                        )}
                        {booking.status === 'checked_in' && (
                          <form action={checkOutBookingAction}>
                            <input type="hidden" name="redirectTo" value="/bookings" />
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button className="btn-secondary text-xs px-2 py-1">
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
