import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppShell } from '@/components/app-shell'
import { BrowserSessionSync } from '@/components/browser-session-sync'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session.accessToken || !session.user) {
    redirect('/login')
  }

  const { fullName, email, role } = session.user

  return (
    <AppShell role={role} userLabel={`${fullName} (${email})`}>
      <BrowserSessionSync
        accessToken={session.accessToken}
        userId={session.user.id}
        userEmail={session.user.email}
        userFullName={session.user.fullName}
        userRole={session.user.role}
      />
      {children}
    </AppShell>
  )
}
