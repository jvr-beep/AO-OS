import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { CleaningClient } from './CleaningClient'

export default async function CleaningPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <CleaningClient token={session.accessToken} role={session.user?.role} staffUserId={session.user?.id} />
}
