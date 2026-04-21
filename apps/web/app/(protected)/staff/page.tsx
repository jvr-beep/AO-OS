import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { StaffClient } from './StaffClient'

export default async function StaffPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  if (session.user?.role !== 'admin') redirect('/dashboard')
  return <StaffClient token={session.accessToken} />
}
