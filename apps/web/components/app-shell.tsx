import { SidebarNav } from './sidebar-nav'

interface AppShellProps {
  children: React.ReactNode
  role: string
  userLabel: string
}

export function AppShell({ children, role, userLabel }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 flex-shrink-0 bg-blue-800">
        <SidebarNav role={role} userLabel={userLabel} />
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
    </div>
  )
}
