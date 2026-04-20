'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/floor-plans', label: 'Floor Plans' },
  { href: '/map-studio', label: 'Map Studio' },
  { href: '/members', label: 'Members' },
  { href: '/guests', label: 'Guests' },
  { href: '/visits', label: 'Visits' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/cleaning', label: 'Cleaning' },
  { href: '/wristbands', label: 'Wristbands' },
  { href: '/lockers', label: 'Lockers' },
]

const ADMIN_ITEMS = [
  { href: '/staff', label: 'Staff' },
  { href: '/staff/audit', label: 'Audit Log' },
  { href: '/sandbox', label: 'Sandbox' },
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
        ? 'border-accent-primary text-text-primary font-medium bg-surface-2'
        : 'border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2'
    }`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border-subtle">
        <p className="font-heading text-sm text-text-primary uppercase tracking-widest">AO</p>
        <p className="text-text-muted text-xs mt-2 truncate font-sans">{userLabel}</p>
        <span className="mt-2 inline-block text-xs border border-accent-primary text-accent-primary px-2 py-0.5 rounded font-sans uppercase tracking-wider">
          {role}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}

        {(role === 'operations' || role === 'admin') && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs text-text-muted font-sans uppercase tracking-wider">
              Admin
            </div>
            {ADMIN_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-border-subtle">
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded text-sm text-text-muted hover:bg-surface-2 hover:text-accent-primary transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
