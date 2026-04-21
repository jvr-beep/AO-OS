import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { AccountClient } from './AccountClient'

export default async function AccountPage({ params }: { params: { memberId: string } }) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <AccountClient token={session.accessToken} memberId={params.memberId} />
}
