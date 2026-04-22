import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  if (session.user?.role !== 'operations' && session.user?.role !== 'admin') {
    redirect('/dashboard')
  }
  return <SettingsClient token={session.accessToken} />
}
