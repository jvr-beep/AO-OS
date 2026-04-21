import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { WristbandsClient } from './WristbandsClient'

export default async function WristbandsPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <WristbandsClient token={session.accessToken} role={session.user?.role} />
}
