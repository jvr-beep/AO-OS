import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { RoomsClient } from './RoomsClient'

export default async function RoomsPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <RoomsClient token={session.accessToken} />
}
