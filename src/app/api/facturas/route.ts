import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ─── GET: Listar facturas del inquilino autenticado ──────────────────────────
export async function GET(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)

    const { searchParams } = new URL(request.url)
    const zona = searchParams.get('zona')
    const queryVendedor = searchParams.get('vendedor')

    // Build zone filter via Pedido relation
    let pedidoFilter: any = {
      tenantId // Forzado: solo facturas de pedidos de este inquilino
    }

    if (session.nivel === 3) {
      pedidoFilter.zona = session.zona
      pedidoFilter.vendedorAlias = session.alias
    } else {
      if (zona && zona !== 'todas') {
        pedidoFilter.zona = zona
      }
      if (queryVendedor) {
        pedidoFilter.vendedorAlias = queryVendedor
      }
    }

    const facturas = await prisma.factura.findMany({
      where: {
        pedido: pedidoFilter
      },
      include: {
        pedido: {
          select: {
            numeroPedido: true,
            zona: true,
            vendedorAlias: true,
            estado: true,
            empresa: { select: { nombre: true, cuit: true } },
          }
        },
        pagos: true,
      },
      orderBy: { creadoEn: 'desc' },
    })

    return NextResponse.json(facturas)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
