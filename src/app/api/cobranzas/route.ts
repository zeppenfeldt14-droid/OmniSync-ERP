import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ─── GET: Listar cobranzas filtradas por tenant/zona/nivel ───────────────────
export async function GET(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)

    const { searchParams } = new URL(request.url)
    const zona   = searchParams.get('zona')
    const queryVendedor = searchParams.get('vendedor')
    const estado = searchParams.get('estado')

    let zonaFilter: any = {}
    if (session.nivel === 3) {
      zonaFilter = { zona: session.zona, vendedorAlias: session.alias }
    } else {
      if (session.nivel === 2 || session.nivel === 4) {
        const habilitadas = Array.isArray(session.zonasHabilitadas)
          ? session.zonasHabilitadas
          : JSON.parse(session.zonasHabilitadas || '[]')
        zonaFilter = zona && zona !== 'todas'
          ? { zona }
          : (habilitadas.length > 0 ? { zona: { in: habilitadas } } : {})
      } else if (zona && zona !== 'todas') {
        zonaFilter = { zona }
      }
      
      if (queryVendedor) {
        zonaFilter.vendedorAlias = queryVendedor
      }
    }

    const cobranzas = await prisma.cobranza.findMany({
      where: {
        pedido: {
          tenantId // Forzado: siempre scoped al inquilino autenticado
        },
        ...zonaFilter,
        ...(estado && estado !== 'todos' ? { estado } : {}),
      },
      include: {
        pedido: {
          select: {
            numeroPedido: true,
            condicionPago: true,
            plazosPago: true,
            tenantId: true
          }
        },
        pagos: {
          orderBy: { creadoEn: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { estado: 'asc' },
        { fechaVencimiento: 'asc' },
      ],
    })

    // Enrich with days overdue
    const today = new Date()
    const enriched = cobranzas.map(c => {
      const venc = c.fechaVencimiento ? new Date(c.fechaVencimiento) : null
      const diasAtraso = venc
        ? Math.floor((today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
        : null
      return { ...c, diasAtraso }
    })

    return NextResponse.json(enriched)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
