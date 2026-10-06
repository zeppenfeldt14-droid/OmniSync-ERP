import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getAuthenticatedTenant(request)

    const zonas = await prisma.zona.findMany({
      where: {
        tenantId
      },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json(zonas)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado. Se requieren privilegios de Administrador.' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre } = body

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'Nombre es requerido.' }, { status: 400 })
    }

    const normalizedNombre = nombre.trim()

    // Check if duplicate in this tenant
    const exists = await prisma.zona.findFirst({
      where: { 
        tenantId,
        nombre: normalizedNombre 
      }
    })

    if (exists) {
      return NextResponse.json({ error: 'Esta zona ya existe para este inquilino.' }, { status: 400 })
    }

    const zona = await prisma.zona.create({
      data: { 
        nombre: normalizedNombre,
        tenantId
      }
    })

    return NextResponse.json({ success: true, zona })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado. Se requieren privilegios de Administrador.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, nombre } = body

    if (!id || !nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'ID y Nombre son requeridos.' }, { status: 400 })
    }

    const normalizedNombre = nombre.trim()

    // Find original zone in this tenant
    const existing = await prisma.zona.findFirst({
      where: { id: Number(id), tenantId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'No se encontró la zona en este inquilino.' }, { status: 404 })
    }

    // Check if new name already exists elsewhere within the same tenant
    const duplicate = await prisma.zona.findFirst({
      where: {
        tenantId,
        nombre: normalizedNombre,
        id: { not: Number(id) }
      }
    })

    if (duplicate) {
      return NextResponse.json({ error: 'Ya existe otra zona con ese nombre en este inquilino.' }, { status: 400 })
    }

    const oldName = existing.nombre

    // Update the zone name
    const updatedZona = await prisma.zona.update({
      where: { id: Number(id) },
      data: { nombre: normalizedNombre }
    })

    // Cascade update the zone field of all companies assigned to the old zone name for this tenant
    await prisma.empresa.updateMany({
      where: { 
        zona: oldName,
        tenantId
      },
      data: { zona: normalizedNombre }
    })

    return NextResponse.json({ success: true, zona: updatedZona })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN') {
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

    const existing = await prisma.zona.findFirst({
      where: { id, tenantId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'No se encontró la zona en este inquilino.' }, { status: 404 })
    }

    // Validate if any companies are currently assigned to this zone in this tenant
    const hasCompanies = await prisma.empresa.findFirst({
      where: { 
        zona: existing.nombre,
        tenantId
      }
    })

    if (hasCompanies) {
      return NextResponse.json({ 
        error: `No se puede eliminar la zona '${existing.nombre}' porque tiene empresas asociadas. Reasigna o elimina las empresas primero.` 
      }, { status: 400 })
    }

    await prisma.zona.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
