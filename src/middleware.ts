import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('neosol_session')

  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]

  const RESERVED_ROOT_PATHS = new Set([
    'super-admin', 'api', 'login', 'dashboard', 'empresas', 'pedidos', 'ventas',
    'cobranzas', 'facturacion', 'usuarios', 'zonas', 'configuracion', 'crm-web',
    'mensajes', 'planificador', 'visitas', 'visitas-hoy', 'precios-publicos',
    'reportes-publicos', 'visitas-hoy-caba', 'prospeccion-ia', 'leads', 'favicon.ico', '_next', 'static'
  ])

  const isTenantPrefix = Boolean(firstSegment && !RESERVED_ROOT_PATHS.has(firstSegment) && !firstSegment.includes('.'))
  const subPath = isTenantPrefix 
    ? (segments.slice(1).length === 0 ? '/dashboard' : '/' + segments.slice(1).join('/'))
    : pathname

  // Public paths that do not require authentication
  const isPublicPath = 
    pathname === '/' ||
    pathname === '/login' || 
    pathname === '/visitas-hoy-caba' ||
    pathname.startsWith('/visitas-hoy') ||
    pathname.startsWith('/precios-publicos') ||
    pathname.startsWith('/reportes-publicos') ||
    pathname.startsWith('/api/auth/login') ||
    subPath.startsWith('/visitas-hoy') ||
    subPath.startsWith('/precios-publicos') ||
    subPath.startsWith('/reportes-publicos') ||
    subPath === '/login'

  // Ignore static assets, next internals, and public logo assets
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')

  if (isStaticAsset) {
    return NextResponse.next()
  }

  // Extraer y validar el payload del token JWT en el Edge
  let tokenPayload: any = null
  if (sessionCookie?.value) {
    try {
      const payloadBase64 = sessionCookie.value.split('.')[1]
      if (payloadBase64) {
        tokenPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')))
      }
    } catch (e) {}
  }

  // If not authenticated and trying to access a secure path, redirect to login
  if (!tokenPayload && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    if (isTenantPrefix) {
      loginUrl.searchParams.set('tenant', firstSegment)
    }
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isSuperAdmin = tokenPayload?.rol === 'SUPER_ADMIN' || (tokenPayload?.nivel === 1 && !tokenPayload?.tenantId)
  const isSuperAdminPath = pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin')

  // 1. Bloqueo estricto: Operadores de inquilino no pueden acceder a /super-admin
  if (tokenPayload && !isSuperAdmin && isSuperAdminPath) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere Super Administrador Global.' }, { status: 403 })
    }
    const tenantTarget = tokenPayload.tenantSlug ? `/${tokenPayload.tenantSlug}/dashboard` : '/dashboard'
    return NextResponse.redirect(new URL(tenantTarget, request.url))
  }

  // 2. Aislamiento estricto de Inquilino: Un usuario de Tienda A no puede acceder a Tienda B
  if (tokenPayload && !isSuperAdmin && isTenantPrefix) {
    const requestedTenant = firstSegment.toLowerCase().trim()
    const userTenant = (tokenPayload.tenantSlug || '').toLowerCase().trim()

    // Manejo de alias si aplica
    const isVentasAlias = (requestedTenant === 'ventas-vs' && userTenant === 'ventas-vs') || 
                         (requestedTenant === 'ventas.vs' && userTenant === 'ventas-vs') ||
                         (requestedTenant === 'ventas' && userTenant === 'ventas-vs')

    if (userTenant && requestedTenant !== userTenant && !isVentasAlias) {
      // Redirigir inmediatamente a su propio panel sin contaminar datos
      const correctUrl = new URL(`/${userTenant}${subPath}`, request.url)
      return NextResponse.redirect(correctUrl)
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Inyectar el tenant activo en los headers de la petición
  if (isTenantPrefix) {
    requestHeaders.set('x-tenant-slug', firstSegment)
  } else if (tokenPayload?.tenantSlug) {
    requestHeaders.set('x-tenant-slug', tokenPayload.tenantSlug)
  }

  // Path-based tenant routing rewrite
  if (isTenantPrefix) {
    const tenantSlug = firstSegment
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = subPath

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
