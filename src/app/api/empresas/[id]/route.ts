import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, registrarAccion, authErrorResponse } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getAuthenticatedTenant(request)

    const { id } = await params
    const empresaId = parseInt(id)
    if (isNaN(empresaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const empresa = await prisma.empresa.findFirst({
      where: { 
        id: empresaId,
        tenantId // Scoping estricto al inquilino
      },
      include: {
        visitas: { orderBy: { fecha: 'desc' }, take: 10 }
      }
    })

    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada en este inquilino' }, { status: 404 })

    return NextResponse.json(empresa)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)

    const { id } = await params
    const empresaId = parseInt(id)
    if (isNaN(empresaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const { zona, subZona, vendedorAsignado } = body

    const currentEmpresa = await prisma.empresa.findFirst({ 
      where: { 
        id: empresaId,
        tenantId // Scoping estricto al inquilino
      } 
    })
    if (!currentEmpresa) return NextResponse.json({ error: 'Empresa no encontrada en este inquilino' }, { status: 404 })

    const updateData: any = {}

    if (zona && zona.trim().toUpperCase() !== (currentEmpresa.zona || '').trim().toUpperCase()) {
      const normalizedZona = zona.trim().toUpperCase()

      // If user is Level 2 and tries to assign to a DIFFERENT zone, they can't do it directly.
      if (session.nivel === 2) {
        return NextResponse.json({ error: 'Nivel 2 no puede reasignar a otra zona directamente. Debe crear una Solicitud de Reasignación.' }, { status: 403 })
      }

      updateData.zona = normalizedZona
      updateData.subZona = subZona || 'SIN ASIGNAR'

      // Auto-assign salesperson of the new zone within this tenant
      const vendorZona = await prisma.usuario.findFirst({
        where: {
          tenantId,
          zona: { equals: normalizedZona, mode: 'insensitive' },
          activo: true,
          NOT: { alias: 'admin' }
        }
      })
      if (vendorZona) {
        updateData.vendedorAsignado = vendorZona.alias
      }
    } else {
      if (subZona !== undefined) updateData.subZona = subZona
      if (vendedorAsignado !== undefined) updateData.vendedorAsignado = vendedorAsignado
    }

    const updatedEmpresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: updateData
    })

    await registrarAccion(
      session.id,
      session.alias,
      'UPDATE_EMPRESA_ZONA',
      `Empresa ID ${empresaId} reasignada a zona: ${updatedEmpresa.zona} [Tenant #${tenantId}]`
    )

    return NextResponse.json({ success: true, empresa: updatedEmpresa })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
