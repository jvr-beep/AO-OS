'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/cleaning', label: 'Cleaning' },
  { href: '/floor-plans', label: 'Floor Plans' },
  { href: '/wristbands', label: 'Wristbands' },
  { href: '/lockers', label: 'Lockers' },
]

const ADMIN_ITEMS = [
  { href: '/staff', label: 'Staff' },
  { href: '/staff/audit', label: 'Audit Log' },
]

interface SidebarNavProps {
  role: string
  userLabel: string
}

export function SidebarNav({ role, userLabel }: SidebarNavProps) {
  const pathname = usePathname()

  function linkClass(href: string) {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return `block px-3 py-2 rounded text-sm font-sans transition-colors border-l-2 ${
      active
        ? 'border-accent-primary text-text-primary font-medium bg-[rgba(47,143,131,0.10)] shadow-[inset_0_0_0_1px_rgba(47,143,131,0.12)]'
        : 'border-transparent text-text-muted hover:text-text-primary hover:bg-[rgba(255,255,255,0.03)]'
    }`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[rgba(237,233,227,0.06)] px-5 py-5">
        <p className="font-heading text-lg text-text-primary uppercase tracking-[0.42em]">AO</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-text-muted">Operations Console</p>
        <p className="text-text-muted text-xs mt-4 truncate font-sans">{userLabel}</p>
        <span className="mt-3 inline-block rounded-full border border-accent-primary/60 bg-[rgba(47,143,131,0.08)] px-2.5 py-1 text-[11px] font-sans uppercase tracking-[0.24em] text-accent-primary">
          {role}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}

        {(role === 'operations' || role === 'admin') && (
          <>
            <div className="px-3 pb-1 pt-5 text-[11px] font-sans uppercase tracking-[0.24em] text-text-muted">
              Staff Controls
            </div>
            {ADMIN_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-[rgba(237,233,227,0.06)] px-3 py-4">
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-[rgba(255,255,255,0.03)] hover:text-accent-primary"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
