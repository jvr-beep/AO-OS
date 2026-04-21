import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { BookingsClient } from './BookingsClient'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: { roomId?: string; memberId?: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <BookingsClient token={session.accessToken} prefilledRoomId={searchParams?.roomId} prefilledMemberId={searchParams?.memberId} />
}
