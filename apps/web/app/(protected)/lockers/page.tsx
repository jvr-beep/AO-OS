import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { LockersClient } from './LockersClient'

export default async function LockersPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <LockersClient token={session.accessToken} role={session.user?.role} staffUserId={session.user?.id} />
}
