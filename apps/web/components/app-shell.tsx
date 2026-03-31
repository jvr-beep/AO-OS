import { SidebarNav } from './sidebar-nav'

interface AppShellProps {
  children: React.ReactNode
  role: string
  userLabel: string
}

export function AppShell({ children, role, userLabel }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <aside className="w-56 flex-shrink-0 bg-surface-1 border-r border-border-subtle">
        <SidebarNav role={role} userLabel={userLabel} />
      </aside>
      <main className="flex-1 overflow-y-auto bg-surface-0 p-8">{children}</main>
    </div>
  )
}
