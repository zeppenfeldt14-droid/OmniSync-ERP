import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, authErrorResponse } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(req.url)
    const tenantIdParam = searchParams.get('tenantId') || 'superadmin'
    const search = searchParams.get('search') || ''

    const whereClause: any = {}

    if (tenantIdParam === 'superadmin' || tenantIdParam === 'null') {
      whereClause.tenantId = null
    } else if (tenantIdParam !== 'all') {
      whereClause.tenantId = Number(tenantIdParam)
    }

    if (search.trim()) {
      whereClause.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { alias: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rol: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [users, tenants] = await Promise.all([
      prisma.usuario.findMany({
        where: whereClause,
        select: {
          id: true,
          nombre: true,
          alias: true,
          email: true,
          rol: true,
          nivel: true,
          zona: true,
          activo: true,
          loginCount: true,
          creadoEn: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              nombre: true,
              slug: true,
              colorPrimario: true,
              tipoModelo: true
            }
          }
        },
        orderBy: [
          { tenantId: 'asc' },
          { nivel: 'asc' }
        ]
      }),
      prisma.tenant.findMany({
        select: {
          id: true,
          nombre: true,
          slug: true,
          colorPrimario: true,
          tipoModelo: true,
          _count: {
            select: { usuarios: true }
          }
        },
        orderBy: { id: 'asc' }
      })
    ])

    return NextResponse.json({ users, tenants })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function PUT(req: Request) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const { userId, activo, newPassword, rol, nivel, tenantId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    const dataToUpdate: any = {}

    if (typeof activo === 'boolean') {
      dataToUpdate.activo = activo
    }

    if (rol) dataToUpdate.rol = rol
    if (nivel) dataToUpdate.nivel = Number(nivel)
    if (tenantId !== undefined) dataToUpdate.tenantId = tenantId ? Number(tenantId) : null

    if (newPassword && newPassword.trim()) {
      dataToUpdate.passwordHash = await bcrypt.hash(newPassword.trim(), 10)
      dataToUpdate.mustChangePassword = true
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: Number(userId) },
      data: dataToUpdate,
      select: {
        id: true,
        nombre: true,
        alias: true,
        activo: true,
        tenantId: true
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const { nombre, alias, email, password, rol = 'SUPER_ADMIN', nivel = 1, tenantId = null, zona = 'Todas' } = body

    if (!nombre || !alias || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos obligatorios deben ser completados' }, { status: 400 })
    }

    const cleanAlias = alias.replace(/^@/, '').trim()

    // Verificar alias o email duplicado
    const existe = await prisma.usuario.findFirst({
      where: {
        OR: [
          { alias: { equals: cleanAlias, mode: 'insensitive' } },
          { email: { equals: email.trim(), mode: 'insensitive' } }
        ]
      }
    })

    if (existe) {
      return NextResponse.json({ error: 'El alias o correo electrónico ya está en uso' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        alias: cleanAlias,
        email: email.trim().toLowerCase(),
        passwordHash,
        rol,
        nivel: Number(nivel) || 1,
        tenantId: tenantId ? Number(tenantId) : null,
        zona: zona || null,
        isNivelTodo: nivel === 1,
        activo: true,
        modulos: {
          inicio: true,
          empresas: true,
          pedidos: true,
          visitas: true,
          planificador: true,
          reportes: true,
          ventas: true,
          cobranzas: true,
          usuarios: true,
          configuracion: true,
          zonas: true
        }
      }
    })

    return NextResponse.json({ success: true, user: nuevoUsuario })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSuperAdmin()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    const user = await prisma.usuario.findUnique({ where: { id: Number(id) } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    if (user.alias === 'Elarez' || user.alias === 'superadmin') {
      return NextResponse.json({ error: 'No se puede eliminar la cuenta principal de Super Admin.' }, { status: 403 })
    }

    await prisma.usuario.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true, message: 'Usuario eliminado' })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
