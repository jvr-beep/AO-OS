import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { MemberDetailClient } from './MemberDetailClient'

export default async function MemberDetailPage({ params }: { params: { memberId: string } }) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <MemberDetailClient token={session.accessToken} memberId={params.memberId} />
}
