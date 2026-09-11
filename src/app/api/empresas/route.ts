import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') // 'activo' | 'prospecto' | null (all)
    const zona   = searchParams.get('zona')
    const q      = searchParams.get('q')
    const queryVendedor = searchParams.get('vendedor')
    const limit  = parseInt(searchParams.get('limit') || '50')

    // Level 3 can only see their own zone and assigned, visible companies
    const isVendedor = session.nivel === 3
    const zonaFiltro = isVendedor
      ? session.zona
      : (zona && zona !== '' ? zona : undefined)
      
    const vendedorFiltro = isVendedor ? session.alias : queryVendedor

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

    const empresas = await prisma.empresa.findMany({
      where: {
        ...(targetTenantId ? { tenantId: targetTenantId } : {}),
        ...(estado ? { estado } : {}),
        ...(zonaFiltro ? { zona: { equals: zonaFiltro, mode: 'insensitive' } } : {}),
        ...(q ? { nombre: { contains: q, mode: 'insensitive' } } : {}),
        ...(isVendedor ? { vendedorAsignado: { equals: session.alias, mode: 'insensitive' }, ocultarVendedor: false } : vendedorFiltro ? { vendedorAsignado: { equals: vendedorFiltro, mode: 'insensitive' } } : {}),
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
      },
      orderBy: { nombre: 'asc' },
      take: limit,
    })

    return NextResponse.json(empresas)
  } catch (error: any) {
    console.error('[API GET Empresas]', error)
    return NextResponse.json({ error: 'Error al listar empresas.' }, { status: 500 })
  }
}
