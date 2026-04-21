import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { LockerDetailClient } from './LockerDetailClient'

export default async function LockerDetailPage({
  params,
  searchParams,
}: {
  params: { lockerId: string }
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <LockerDetailClient token={session.accessToken} lockerId={params.lockerId} staffUserId={session.user?.id} okMessage={searchParams?.ok} errorMessage={searchParams?.error} />
}
