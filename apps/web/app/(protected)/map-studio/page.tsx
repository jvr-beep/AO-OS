import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { MapStudioClient } from './MapStudioClient'

export default async function MapStudioPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <MapStudioClient token={session.accessToken} />
}
