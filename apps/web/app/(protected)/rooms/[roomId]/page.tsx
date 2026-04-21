import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { RoomDetailClient } from './RoomDetailClient'

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: { roomId: string }
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <RoomDetailClient token={session.accessToken} roomId={params.roomId} okMessage={searchParams?.ok} errorMessage={searchParams?.error} />
}
