import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1' }, { status: 403 })
    }

    const [
      totalTenants,
      activeTenants,
      totalEmpresas,
      totalUsuarios,
      totalProductos,
      totalZonas,
      tenantsList,
      recentLogs
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { activo: true } }),
      prisma.empresa.count(),
      prisma.usuario.count(),
      prisma.producto.count(),
      prisma.zona.count(),
      prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              empresas: true,
              usuarios: true,
              zonas: true,
              productos: true
            }
          }
        },
        orderBy: { id: 'asc' }
      }),
      prisma.logBitacora.findMany({
        take: 8,
        orderBy: { creadoEn: 'desc' }
      }).catch(() => [])
    ])

    // Modelo distribution
    const modeloStats: Record<string, number> = {
      FISICO_TERRENO: 0,
      SERVICIOS_DIGITALES: 0,
      ECOMMERCE: 0
    }

    tenantsList.forEach(t => {
      const mod = t.tipoModelo || 'SERVICIOS_DIGITALES'
      modeloStats[mod] = (modeloStats[mod] || 0) + 1
    })

    return NextResponse.json({
      kpis: {
        totalTenants,
        activeTenants,
        totalEmpresas,
        totalUsuarios,
        totalProductos,
        totalZonas
      },
      modeloStats,
      tenants: tenantsList,
      recentLogs
    })
  } catch (error: any) {
    console.error('Error en GET /api/super-admin/dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
