'use client'

import { useState } from 'react'
import { SidebarNav } from './sidebar-nav'

interface AppShellProps {
  children: React.ReactNode
  role: string
  userLabel: string
}

export function AppShell({ children, role, userLabel }: AppShellProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-0">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-surface-1 border-r border-border-subtle
          transform transition-transform duration-200 ease-in-out
          md:relative md:w-56 md:translate-x-0 md:z-auto md:flex-shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarNav role={role} userLabel={userLabel} onClose={() => setOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-surface-1 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="font-heading text-sm text-text-primary uppercase tracking-widest">AO</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
