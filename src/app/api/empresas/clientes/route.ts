import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(req)

    const { searchParams } = new URL(req.url)
    const zonaParam = searchParams.get('zona')

    const filters: any = {
      tenantId, // Scoping estricto al inquilino autenticado
      estado: 'activo'
    }

    if (zonaParam && zonaParam !== 'todas') {
      filters.zona = zonaParam
    } else if (session.nivel === 3) {
      filters.zona = session.zona || 'CABA'
    } else if (session.nivel === 2) {
      const authZones = Array.isArray(session.zonasHabilitadas)
        ? session.zonasHabilitadas
        : typeof session.zonasHabilitadas === 'string'
        ? JSON.parse(session.zonasHabilitadas)
        : []
      if (authZones.length > 0) {
        filters.zona = { in: authZones }
      }
    }

    const empresas = await prisma.empresa.findMany({
      where: filters,
      select: {
        id: true,
        nombre: true,
        cuit: true,
        telefono: true,
        zona: true,
        vendedorAsignado: true,
        estado: true,
        barrio: true,
        direccion: true
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json(empresas)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
