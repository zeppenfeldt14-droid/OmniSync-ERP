import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('neosol_session')

  // Public paths that do not require authentication
  const isPublicPath = 
    pathname === '/' ||
    pathname === '/login' || 
    pathname === '/visitas-hoy-caba' ||
    pathname.startsWith('/visitas-hoy') ||
    pathname.startsWith('/precios-publicos') ||
    pathname.startsWith('/reportes-publicos') ||
    pathname.startsWith('/api/auth/login')

  // Ignore static assets, next internals, and public logo assets
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')

  if (isStaticAsset) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // If not authenticated and trying to access a secure path, redirect to login
  if (!sessionCookie && !isPublicPath) {
    const segments = pathname.split('/').filter(Boolean)
    const firstSegment = segments[0]?.toLowerCase()
    const loginUrl = new URL('/login', request.url)
    if (firstSegment === 'golocinas' || firstSegment === 'vinnaty') {
      loginUrl.searchParams.set('tenant', firstSegment)
    }
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Path-based tenant routing: e.g. /golocinas or /vinnaty
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]?.toLowerCase()

  if (firstSegment === 'golocinas' || firstSegment === 'vinnaty') {
    const tenantSlug = firstSegment
    requestHeaders.set('x-tenant-slug', tenantSlug)

    // Internal rewritten subpath (e.g. /golocinas -> /dashboard, /golocinas/pedidos -> /pedidos)
    const remainingSegments = segments.slice(1)
    const subPath = remainingSegments.length === 0 ? '/dashboard' : '/' + remainingSegments.join('/')
    const rewriteUrl = new URL(subPath + request.nextUrl.search, request.url)

    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    })
    response.cookies.set('omnisync_active_tenant_slug', tenantSlug, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    })
    return response
  }

  // If not in a path prefix, preserve active tenant from cookie or header
  const cookieTenant = request.cookies.get('omnisync_active_tenant_slug')?.value
  if (cookieTenant) {
    requestHeaders.set('x-tenant-slug', cookieTenant)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// Limit the middleware to page routes and API routes
export const config = {
  matcher: [
    '/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)',
  ],
}
