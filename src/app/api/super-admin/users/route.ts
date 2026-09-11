import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const tenantIdParam = searchParams.get('tenantId')
    const search = searchParams.get('search') || ''

    const whereClause: any = {}

    if (tenantIdParam && tenantIdParam !== 'all') {
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
    console.error('Error en GET /api/super-admin/users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, activo, newPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    const dataToUpdate: any = {}

    if (typeof activo === 'boolean') {
      dataToUpdate.activo = activo
    }

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
        activo: true
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('Error en PUT /api/super-admin/users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
