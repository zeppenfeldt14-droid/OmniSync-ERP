import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signToken, registrarAccion } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { alias, password, callbackUrl } = body

    if (!alias || !password) {
      return NextResponse.json(
        { error: 'Por favor complete todos los campos.' },
        { status: 400 }
      )
    }

    // Clean @ prefix if entered
    const cleanAlias = alias.replace(/^@/, '').trim()

    // Find user with tenant relation
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { alias: { equals: cleanAlias, mode: 'insensitive' } },
          { email: { equals: alias, mode: 'insensitive' } }
        ]
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            nombre: true,
            tipoModelo: true
          }
        }
      }
    })

    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas o cuenta suspendida.' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, usuario.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas.' },
        { status: 401 }
      )
    }

    // Sign JWT Token
    const sessionUser = {
      id: usuario.id,
      alias: usuario.alias,
      email: usuario.email,
      nombre: usuario.nombre,
      nivel: usuario.nivel,
      rol: usuario.rol,
      modulos: usuario.modulos || {},
      zona: usuario.zona,
      zonasHabilitadas: usuario.zonasHabilitadas,
      unidadesNegocio: (usuario.unidadesNegocio as string[]) || [],
      isNivelTodo: usuario.isNivelTodo,
      tenantId: usuario.tenantId
    }
    const token = signToken(sessionUser)

    // Save session in Next cookieStore
    try {
      const cookieStore = await cookies()
      cookieStore.set('neosol_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      })
    } catch (e) {
      // Ignore if called in unsupported context
    }

    // Get IP and UserAgent
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Desconocido'

    // Update connection logs in database
    const rawLogs = usuario.connectionLogs
    const connectionLogs = Array.isArray(rawLogs) ? [...rawLogs] : []
    connectionLogs.unshift({
      date: new Date().toISOString(),
      ip,
      userAgent
    })

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        loginCount: (usuario.loginCount || 0) + 1,
        connectionLogs: connectionLogs.slice(0, 20)
      }
    })

    // Log connection in global audit trail (Bitacora)
    await registrarAccion(
      usuario.id,
      usuario.alias,
      'LOGIN',
      `Inicio de sesión exitoso - IP: ${ip}`
    )

    // Determine dynamic landing redirect
    let redirectUrl = '/'
    let tenantSlugToSet: string | null = null

    if (usuario.alias === 'Elarez' || (usuario.nivel === 1 && !usuario.tenantId)) {
      redirectUrl = '/super-admin'
    } else if (usuario.tenant?.slug === 'vinnaty' || usuario.alias === 'vinnaty') {
      redirectUrl = callbackUrl && callbackUrl.startsWith('/vinnaty') ? callbackUrl : '/vinnaty'
      tenantSlugToSet = 'vinnaty'
    } else if (usuario.tenant?.slug === 'golocinas' || usuario.alias === 'admin') {
      redirectUrl = callbackUrl && callbackUrl.startsWith('/golocinas') ? callbackUrl : '/golocinas'
      tenantSlugToSet = 'golocinas'
    } else if (usuario.tenant?.slug) {
      redirectUrl = callbackUrl && callbackUrl.startsWith(`/${usuario.tenant.slug}`) ? callbackUrl : `/${usuario.tenant.slug}`
      tenantSlugToSet = usuario.tenant.slug
    } else if (callbackUrl && !callbackUrl.startsWith('/login')) {
      redirectUrl = callbackUrl
    }

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        alias: usuario.alias,
        email: usuario.email,
        nivel: usuario.nivel,
        rol: usuario.rol,
        foto: usuario.foto,
        modulos: usuario.modulos,
        mustChangePassword: usuario.mustChangePassword,
        tenantId: usuario.tenantId,
        tenant: usuario.tenant
      }
    })

    // Explicitly set cookie on NextResponse headers to guarantee delivery
    response.cookies.set('neosol_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    if (tenantSlugToSet) {
      response.cookies.set('omnisync_active_tenant_slug', tenantSlugToSet, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax'
      })
    }

    return response
  } catch (error: any) {
    console.error('[API Login] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
