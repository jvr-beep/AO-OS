import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { VisitsClient } from './VisitsClient'

export default async function VisitsPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <VisitsClient token={session.accessToken} staffUserId={session.user?.id} />
}
