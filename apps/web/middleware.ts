import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_FILE_PATH = /\.[^/]+$/

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths and static assets do not require a session.
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth/reset-password') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images/') ||
    PUBLIC_FILE_PATH.test(pathname)
  ) {
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
