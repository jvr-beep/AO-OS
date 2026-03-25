'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
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
    return `block px-3 py-2 rounded text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-900 text-white'
        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
    }`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-blue-700">
        <p className="text-white font-semibold text-sm">AO OS</p>
        <p className="text-blue-200 text-xs mt-1 truncate">{userLabel}</p>
        <span className="mt-1 inline-block text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">
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
            <div className="pt-4 pb-1 px-3 text-xs text-blue-400 font-medium uppercase tracking-wider">
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

      <div className="px-3 py-4 border-t border-blue-700">
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded text-sm text-blue-200 hover:bg-blue-700 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
