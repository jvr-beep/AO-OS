import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths — no session required
  if (pathname.startsWith('/login') || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Check for session cookie existence (content validated in layout)
  const session = req.cookies.get('ao-os-session')
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
