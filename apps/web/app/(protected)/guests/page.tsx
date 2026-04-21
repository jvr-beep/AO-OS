import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { GuestsClient } from './GuestsClient'

export default async function GuestsPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <GuestsClient token={session.accessToken} />
}
