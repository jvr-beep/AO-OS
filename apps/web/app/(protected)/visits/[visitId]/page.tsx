import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { VisitDetailClient } from './VisitDetailClient'

export default async function VisitDetailPage({
  params,
  searchParams,
}: {
  params: { visitId: string }
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <VisitDetailClient token={session.accessToken} visitId={params.visitId} staffUserId={session.user?.id} okMessage={searchParams?.ok} errorMessage={searchParams?.error} />
}
