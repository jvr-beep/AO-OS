import { SidebarNav } from './sidebar-nav'

interface AppShellProps {
  children: React.ReactNode
  role: string
  userLabel: string
}

export function AppShell({ children, role, userLabel }: AppShellProps) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-surface-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,143,131,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(245,158,66,0.06),transparent_20%)]" />
      <aside className="relative z-10 w-64 flex-shrink-0 border-r border-[rgba(237,233,227,0.06)] bg-[linear-gradient(180deg,rgba(15,22,32,0.98),rgba(11,14,17,0.98))]">
        <SidebarNav role={role} userLabel={userLabel} />
      </aside>
      <main className="relative z-10 flex-1 overflow-y-auto bg-transparent p-5 md:p-8">{children}</main>
    </div>
  )
}
