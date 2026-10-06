import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, hashPassword, registrarAccion, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Listar usuarios del inquilino autenticado (N1/N2)
export async function GET(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere nivel de administración.' }, { status: 403 })
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        tenantId
      },
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
    return authErrorResponse(error)
  }
}

// POST: Crear o Modificar Usuario del Inquilino (N1 del inquilino o Super Admin)
export async function POST(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN') {
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

    // 1. ACTUALIZAR USUARIO EXISTENTE
    if (id) {
      const existingUser = await prisma.usuario.findFirst({
        where: { 
          id: Number(id),
          tenantId // Estricto: solo modificar usuarios de su propio inquilino
        }
      })

      if (!existingUser) {
        return NextResponse.json({ error: 'Usuario no encontrado en este inquilino.' }, { status: 404 })
      }

      // Validar que alias o email no colisionen con otro usuario
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
        `Usuario modificado: ${updatedUser.nombre} (@${updatedUser.alias}) [Tenant #${tenantId}]`
      )

      return NextResponse.json({ success: true, user: updatedUser })
    }

    // 2. CREAR NUEVO USUARIO EN EL INQUILINO
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
        tenantId, // Forzado al inquilino autenticado
        isNivelTodo: (session.alias === 'admin' || session.isNivelTodo) && isNivelTodo === true,
        passwordUpdatedAt: new Date()
      }
    })

    await registrarAccion(
      session.id,
      session.alias,
      'CREATE_USER',
      `Nuevo usuario creado en inquilino #${tenantId}: ${newUser.nombre} (@${newUser.alias})`
    )

    return NextResponse.json({ success: true, user: newUser })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
