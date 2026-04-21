import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { GuestDetailClient } from './GuestDetailClient'

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: { guestId: string }
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <GuestDetailClient token={session.accessToken} guestId={params.guestId} okMessage={searchParams?.ok} errorMessage={searchParams?.error} />
}
