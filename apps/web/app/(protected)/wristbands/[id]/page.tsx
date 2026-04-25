import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { WristbandDetailClient } from './WristbandDetailClient'

export default async function WristbandDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <WristbandDetailClient id={params.id} token={session.accessToken} role={session.user?.role} />
}
