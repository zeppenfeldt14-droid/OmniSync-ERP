import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, hashPassword, registrarAccion } from '@/lib/auth'

// GET: List all users (N1 only)
export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tenantParam = searchParams.get('tenantId')
    const tenantSlug = request.headers.get('x-tenant-slug')

    let targetTenantId = session.tenantId
    if (!targetTenantId) {
      if (tenantParam) {
        targetTenantId = parseInt(tenantParam)
      } else if (tenantSlug) {
        const t = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
        if (t) targetTenantId = t.id
      }
    }

    const where: any = {}
    if (targetTenantId) {
      where.tenantId = targetTenantId
    }

    const usuarios = await prisma.usuario.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        alias: true,
        email: true,
        nivel: true,
        rol: true,
        foto: true,
        activo: true,
        modulos: true,
        limitesEstado: true,
        loginCount: true,
        connectionLogs: true,
        mustChangePassword: true,
        zona: true,
        zonasHabilitadas: true,
        passwordUpdatedAt: true,
        isNivelTodo: true,
        unidadesNegocio: true,
        tenantId: true,
        creadoEn: true,
        actualizadoEn: true
      }
    })

    return NextResponse.json(usuarios)
  } catch (error: any) {
    console.error('[API GET Users] Error:', error)
    return NextResponse.json({ error: 'Error al listar usuarios.' }, { status: 500 })
  }
}

// POST: Create or Update User (N1 only)
export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      nombre,
      alias,
      email,
      password,
      nivel,
      rol,
      activo,
      foto,
      modulos,
      limitesEstado,
      mustChangePassword,
      zona,
      zonasHabilitadas,
      unidadesNegocio,
      isNivelTodo
    } = body

    if (!nombre || !alias || !email) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, alias, email).' }, { status: 400 })
    }

    const cleanAlias = alias.replace(/^@/, '').trim()

    // 1. UPDATE USER
    if (id) {
      const existingUser = await prisma.usuario.findUnique({
        where: { id: Number(id) }
      })

      if (!existingUser) {
        return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
      }

      // Check if alias or email is taken by another user
      const duplicateUser = await prisma.usuario.findFirst({
        where: {
          NOT: { id: Number(id) },
          OR: [
            { alias: { equals: cleanAlias, mode: 'insensitive' } },
            { email: { equals: email, mode: 'insensitive' } }
          ]
        }
      })

      if (duplicateUser) {
        return NextResponse.json({ error: 'El alias o correo ya está en uso por otro usuario.' }, { status: 400 })
      }

      const updateData: any = {
        nombre,
        alias: cleanAlias,
        email,
        nivel: Number(nivel) || 3,
        rol: rol || 'Vendedor',
        activo: activo !== false,
        foto: foto || null,
        modulos: modulos || {},
        limitesEstado: limitesEstado || {},
        mustChangePassword: mustChangePassword === true,
        zona: zona || 'CABA',
        zonasHabilitadas: zonasHabilitadas || [],
        unidadesNegocio: unidadesNegocio || ['Gerencia Comercial']
      }

      if ((session.alias === 'admin' || session.isNivelTodo) && isNivelTodo !== undefined) {
        updateData.isNivelTodo = isNivelTodo === true
      }

      if (password && password.trim() !== '') {
        updateData.passwordHash = await hashPassword(password)
        updateData.passwordUpdatedAt = new Date()
      }

      const updatedUser = await prisma.usuario.update({
        where: { id: Number(id) },
        data: updateData
      })

      await registrarAccion(
        session.id,
        session.alias,
        'UPDATE_USER',
        `Usuario modificado: ${updatedUser.nombre} (@${updatedUser.alias})`
      )

      return NextResponse.json({ success: true, user: updatedUser })
    }

    // 2. CREATE USER
    if (!password) {
      return NextResponse.json({ error: 'La contraseña es obligatoria para nuevos perfiles.' }, { status: 400 })
    }

    const duplicateUser = await prisma.usuario.findFirst({
      where: {
        OR: [
          { alias: { equals: cleanAlias, mode: 'insensitive' } },
          { email: { equals: email, mode: 'insensitive' } }
        ]
      }
    })

    if (duplicateUser) {
      return NextResponse.json({ error: 'El alias o correo ya está en uso.' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    let targetTenantId = session.tenantId || (body.tenantId ? parseInt(body.tenantId) : null)
    if (!targetTenantId) {
      const tenantSlug = request.headers.get('x-tenant-slug')
      if (tenantSlug) {
        const t = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
        if (t) targetTenantId = t.id
      }
    }

    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        alias: cleanAlias,
        email,
        passwordHash,
        nivel: Number(nivel) || 3,
        rol: rol || 'Vendedor',
        activo: activo !== false,
        foto: foto || null,
        modulos: modulos || {},
        limitesEstado: limitesEstado || {},
        mustChangePassword: mustChangePassword === true,
        zona: zona || 'CABA',
        zonasHabilitadas: zonasHabilitadas || [],
        unidadesNegocio: unidadesNegocio || ['Gerencia Comercial'],
        tenantId: targetTenantId || null,
        isNivelTodo: (session.alias === 'admin' || session.isNivelTodo) && isNivelTodo === true,
        passwordUpdatedAt: new Date()
      }
    })

    await registrarAccion(
      session.id,
      session.alias,
      'CREATE_USER',
      `Nuevo usuario creado: ${newUser.nombre} (@${newUser.alias})`
    )

    return NextResponse.json({ success: true, user: newUser })
  } catch (error: any) {
    console.error('[API POST Users] Error:', error)
    return NextResponse.json({ error: 'Error al procesar el usuario.' }, { status: 500 })
  }
}
