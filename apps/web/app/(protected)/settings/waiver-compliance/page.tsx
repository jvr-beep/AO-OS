import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { WaiverComplianceClient } from './WaiverComplianceClient'

export default async function WaiverCompliancePage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  if (session.user?.role !== 'operations' && session.user?.role !== 'admin') {
    redirect('/dashboard')
  }
  return <WaiverComplianceClient token={session.accessToken} />
}
