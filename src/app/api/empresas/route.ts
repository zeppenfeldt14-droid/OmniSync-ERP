import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') // 'activo' | 'prospecto' | null (all)
    const zona   = searchParams.get('zona')
    const q      = searchParams.get('q')
    const queryVendedor = searchParams.get('vendedor')
    const limit  = parseInt(searchParams.get('limit') || '100')

    // Level 3 can only see their own zone and assigned, visible companies
    const isVendedor = session.nivel === 3
    const zonaFiltro = isVendedor
      ? session.zona
      : (zona && zona !== '' && zona !== 'todas' ? zona : undefined)
      
    const vendedorFiltro = isVendedor ? session.alias : queryVendedor

    const empresas = await prisma.empresa.findMany({
      where: {
        tenantId, // Forzado: siempre scoped al inquilino autenticado
        ...(estado ? { estado } : {}),
        ...(zonaFiltro ? { zona: { equals: zonaFiltro, mode: 'insensitive' } } : {}),
        ...(q ? { nombre: { contains: q, mode: 'insensitive' } } : {}),
        ...(isVendedor 
          ? { vendedorAsignado: { equals: session.alias, mode: 'insensitive' }, ocultarVendedor: false } 
          : vendedorFiltro ? { vendedorAsignado: { equals: vendedorFiltro, mode: 'insensitive' } } : {}
        ),
      },
      select: {
        id: true,
        nombre: true,
        cuit: true,
        zona: true,
        estado: true,
        responsable: true,
        direccion: true,
        telefono: true,
        email: true,
        vendedorAsignado: true,
        rubro: true,
        subZona: true,
        saldoDeudorARs: true,
        limiteCreditoARs: true,
      },
      orderBy: { nombre: 'asc' },
      take: limit,
    })

    return NextResponse.json(empresas)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
