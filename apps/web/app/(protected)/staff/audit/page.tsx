import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { AuditClient } from './AuditClient'

export default async function StaffAuditPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  if (session.user?.role !== 'admin') redirect('/dashboard')
  return <AuditClient token={session.accessToken} />
}
