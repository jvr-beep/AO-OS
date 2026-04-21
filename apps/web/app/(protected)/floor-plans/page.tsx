import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { FloorPlansClient } from './FloorPlansClient'

export default async function FloorPlansPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return <FloorPlansClient token={session.accessToken} />
}
