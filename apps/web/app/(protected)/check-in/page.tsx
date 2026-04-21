import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { CheckInClient } from './CheckInClient'

export default async function CheckInPage({
  searchParams,
}: {
  searchParams?: { guestId?: string; bookingCode?: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return (
    <CheckInClient
      token={session.accessToken}
      staffUserId={session.user?.id}
      prefilledGuestId={searchParams?.guestId}
      prefilledBookingCode={searchParams?.bookingCode}
    />
  )
}
