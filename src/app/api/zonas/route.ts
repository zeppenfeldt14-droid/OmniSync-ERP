import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tenantIdParam = searchParams.get('tenantId')

    const where: any = {}
    if (tenantIdParam) {
      where.tenantId = parseInt(tenantIdParam)
    }

    const zonas = await prisma.zona.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json(zonas)
  } catch (error: any) {
    console.error('[API GET Zonas]', error)
    return NextResponse.json({ error: 'Error al listar zonas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requieren privilegios de Administrador.' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, tenantId } = body

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'Nombre es requerido.' }, { status: 400 })
    }

    const normalizedNombre = nombre.trim()
    const targetTenantId = tenantId ? parseInt(String(tenantId)) : (session.tenantId || null)

    // Check if duplicate in this tenant
    const exists = await prisma.zona.findFirst({
      where: { 
        tenantId: targetTenantId,
        nombre: normalizedNombre 
      }
    })

    if (exists) {
      return NextResponse.json({ error: 'Esta zona ya existe para este inquilino.' }, { status: 400 })
    }

    const zona = await prisma.zona.create({
      data: { 
        nombre: normalizedNombre,
        tenantId: targetTenantId
      }
    })

    return NextResponse.json({ success: true, zona })
  } catch (error: any) {
    console.error('[API POST Zona]', error)
    return NextResponse.json({ error: 'Error al crear zona.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requieren privilegios de Administrador.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, nombre } = body

    if (!id || !nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'ID y Nombre son requeridos.' }, { status: 400 })
    }

    const normalizedNombre = nombre.trim()

    // Find original zone
    const existing = await prisma.zona.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'No se encontró la zona.' }, { status: 404 })
    }

    // Check if new name already exists elsewhere within the same tenant
    const duplicate = await prisma.zona.findFirst({
      where: {
        tenantId: existing.tenantId,
        nombre: normalizedNombre,
        id: { not: id }
      }
    })

    if (duplicate) {
      return NextResponse.json({ error: 'Ya existe otra zona con ese nombre en este inquilino.' }, { status: 400 })
    }

    const oldName = existing.nombre

    // Update the zone name
    const updatedZona = await prisma.zona.update({
      where: { id },
      data: { nombre: normalizedNombre }
    })

    // Cascade update the zone field of all companies assigned to the old zone name
    await prisma.empresa.updateMany({
      where: { 
        zona: oldName,
        tenantId: existing.tenantId || undefined
      },
      data: { zona: normalizedNombre }
    })

    // Cascade update the sub-zones associated with the old zone name
    await prisma.subZona.updateMany({
      where: { zona: oldName },
      data: { zona: normalizedNombre }
    })

    return NextResponse.json({ success: true, zona: updatedZona })
  } catch (error: any) {
    console.error('[API PUT Zona]', error)
    return NextResponse.json({ error: 'Error al modificar zona.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requieren privilegios de Administrador.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get('id')

    if (!idStr) {
      return NextResponse.json({ error: 'ID es requerido.' }, { status: 400 })
    }

    const id = parseInt(idStr)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    }

    const existing = await prisma.zona.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'No se encontró la zona.' }, { status: 404 })
    }

    // Validate if any companies are currently assigned to this zone
    const hasCompanies = await prisma.empresa.findFirst({
      where: { 
        zona: existing.nombre,
        tenantId: existing.tenantId || undefined
      }
    })

    if (hasCompanies) {
      return NextResponse.json({ 
        error: `No se puede eliminar la zona '${existing.nombre}' porque tiene empresas asociadas. Reasigna o elimina las empresas primero.` 
      }, { status: 400 })
    }

    // Delete sub-zones associated with it
    await prisma.subZona.deleteMany({
      where: { zona: existing.nombre }
    })

    // Delete the zone
    await prisma.zona.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API DELETE Zona]', error)
    return NextResponse.json({ error: 'Error al eliminar zona.' }, { status: 500 })
  }
}
