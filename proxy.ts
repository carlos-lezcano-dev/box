import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// La Proxy se ejecuta aislada: mantener la constante local, sin imports compartidos.
const SESSION_COOKIE = 'box_session'

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
}
