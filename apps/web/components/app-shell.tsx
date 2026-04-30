'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SidebarNav } from './sidebar-nav'

interface AppShellProps {
  children: React.ReactNode
  role: string
  userLabel: string
}

export function AppShell({ children, role, userLabel }: AppShellProps) {
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const trigger = triggerRef.current

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !drawerRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)

    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled])'
    )
    firstFocusable?.focus()

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [open])

  function handleDrawerClick(e: React.MouseEvent<HTMLElement>) {
    const target = e.target as HTMLElement
    if (target.closest('a')) {
      setOpen(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <aside className="hidden md:flex md:w-56 md:flex-shrink-0 md:bg-surface-1 md:border-r md:border-border-subtle">
        <SidebarNav role={role} userLabel={userLabel} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex md:hidden items-center justify-between border-b border-border-subtle bg-surface-1 px-4 py-3"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
            className="-ml-2 p-2 rounded text-text-primary hover:bg-surface-2 transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <p className="font-heading text-sm text-text-primary uppercase tracking-widest">AO</p>
          <span className="text-xs border border-accent-primary text-accent-primary px-2 py-0.5 rounded font-sans uppercase tracking-wider">
            {role}
          </span>
        </header>

        {open && (
          <>
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              onClick={close}
              aria-hidden="true"
            />
            <aside
              ref={drawerRef}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation"
              onClick={handleDrawerClick}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-surface-1 border-r border-border-subtle shadow-xl"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
              }}
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation"
                className="absolute top-3 right-3 p-1 rounded text-text-muted hover:text-text-primary z-10"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <SidebarNav role={role} userLabel={userLabel} />
            </aside>
          </>
        )}

        <main
          className="flex-1 overflow-y-auto bg-surface-0 p-4 md:p-8"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
