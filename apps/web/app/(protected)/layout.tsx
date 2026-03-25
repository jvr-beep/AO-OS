import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppShell } from '@/components/app-shell'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session.accessToken || !session.user) {
    redirect('/login')
  }

  const { fullName, email, role } = session.user

  return (
    <AppShell role={role} userLabel={`${fullName} (${email})`}>
      {children}
    </AppShell>
  )
}
