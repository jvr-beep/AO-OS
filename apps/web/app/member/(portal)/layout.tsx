import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMemberSession } from '@/lib/member-session'
import { memberLogoutAction } from '../actions/auth'

const NAV_LINKS = [
  { href: '/member', label: 'Home' },
  { href: '/member/book', label: 'Book' },
  { href: '/member/bookings', label: 'Bookings' },
  { href: '/member/visits', label: 'Visits' },
  { href: '/member/account', label: 'Account' },
]

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getMemberSession()
  if (!session.sessionId) redirect('/member/login')

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border-subtle bg-surface-0 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/member" className="text-xl font-heading tracking-[0.25em] text-text-primary no-underline">
            ΑΩ
          </Link>
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors no-underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={memberLogoutAction}>
            <button
              type="submit"
              className="text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors"
            >
              Exit
            </button>
          </form>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer inscription */}
      <footer className="text-center py-6 border-t border-border-subtle">
        <p className="text-xs text-text-muted tracking-widest uppercase">
          Ancient Ritual. Modern Men.
        </p>
      </footer>
    </div>
  )
}
