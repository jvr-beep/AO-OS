import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static assets — always pass through
  if (pathname.startsWith('/_next')) return NextResponse.next()

  // ── Member portal ────────────────────────────────────────────────────────
  if (pathname === '/member' || pathname.startsWith('/member/')) {
    // Login page is public
    if (pathname === '/member/login') return NextResponse.next()

    const memberSession = req.cookies.get('ao-member-session')
    if (!memberSession) {
      return NextResponse.redirect(new URL('/member/login', req.url))
    }
    return NextResponse.next()
  }

  // ── Guest kiosk ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/kiosk')) {
    return NextResponse.next() // kiosk is fully public — auth handled per-step
  }

  // ── Staff portal ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/login')) return NextResponse.next()

  const staffSession = req.cookies.get('ao-os-session')
  if (!staffSession) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
