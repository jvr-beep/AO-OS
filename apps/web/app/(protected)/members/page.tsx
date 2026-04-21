import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { MembersClient } from './MembersClient'

export default async function MembersPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <MembersClient token={session.accessToken} />
}
