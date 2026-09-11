import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Listar productos activos (filtrados opcionalmente por inquilino)
export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tenantIdParam = searchParams.get('tenantId')
    const targetTenantId = tenantIdParam ? parseInt(tenantIdParam) : (session.tenantId || null)

    const where: any = { activo: true }
    if (targetTenantId) {
      where.tenantId = targetTenantId
    }

    // Find active price list (vigenteDesde <= hoy)
    const activeList = await prisma.listaPrecio.findFirst({
      where: {
        activa: true,
        vigenteDesde: { lte: new Date() },
        tenantId: targetTenantId || undefined
      },
      orderBy: { vigenteDesde: 'desc' },
      include: { precios: true }
    })

    const productos = await prisma.producto.findMany({
      where,
      orderBy: [{ linea: 'asc' }, { nombre: 'asc' }],
    })

    const mapped = productos.map(p => {
      const priceRecord = activeList?.precios.find(pr => pr.productoId === p.id)
      return {
        ...p,
        // Standard / < 300 boxes
        precioPaqueteMin: priceRecord ? priceRecord.precioPaqueteMin : p.precioPaquete,
        precioCajaMin: priceRecord ? priceRecord.precioCajaMin : p.precioCaja,
        // Volume / >= 300 boxes
        precioPaqueteMax: priceRecord ? priceRecord.precioPaqueteMax : p.precioPaquete,
        precioCajaMax: priceRecord ? priceRecord.precioCajaMax : p.precioCaja,
      }
    })

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('[API GET Productos]', error)
    return NextResponse.json({ error: 'Error al listar productos.' }, { status: 500 })
  }
}

// POST: Crear producto (Nivel 1 only)
export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1)
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    const body = await request.json()
    const { codigoInterno, nombre, linea, precioPaquete, paqPorCaja, precioCaja, tipo, tenantId } = body

    if (!codigoInterno || !nombre) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
    }

    const targetTenantId = tenantId ? parseInt(String(tenantId)) : (session.tenantId || null)

    const producto = await prisma.producto.create({
      data: { 
        codigoInterno, 
        nombre, 
        linea: linea || null, 
        tipo: tipo || 'PRODUCTO',
        precioPaquete: Number(precioPaquete || 0), 
        paqPorCaja: Number(paqPorCaja || 1), 
        precioCaja: Number(precioCaja || precioPaquete || 0),
        precioUnitario: Number(precioPaquete || precioCaja || 0),
        tenantId: targetTenantId
      },
    })

    return NextResponse.json({ success: true, producto })
  } catch (error: any) {
    if (error.code === 'P2002')
      return NextResponse.json({ error: 'El código de producto ya existe.' }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear el producto.' }, { status: 500 })
  }
}
