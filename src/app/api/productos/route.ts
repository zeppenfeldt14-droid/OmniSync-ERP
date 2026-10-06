import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Listar productos activos del inquilino autenticado
export async function GET(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)

    // Find active price list (vigenteDesde <= hoy) for this tenant
    const activeList = await prisma.listaPrecio.findFirst({
      where: {
        tenantId,
        activa: true,
        vigenteDesde: { lte: new Date() }
      },
      orderBy: { vigenteDesde: 'desc' },
      include: { precios: true }
    })

    const productos = await prisma.producto.findMany({
      where: {
        tenantId, // Scoping estricto al inquilino
        activo: true
      },
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
    return authErrorResponse(error)
  }
}

// POST: Crear producto en el inquilino (Nivel 1 o Super Admin)
export async function POST(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const body = await request.json()
    const { codigoInterno, nombre, linea, precioPaquete, paqPorCaja, precioCaja, tipo } = body

    if (!codigoInterno || !nombre) {
      return NextResponse.json({ error: 'Faltan campos requeridos (código interno y nombre).' }, { status: 400 })
    }

    // Validar duplicado en este inquilino
    const existing = await prisma.producto.findFirst({
      where: {
        tenantId,
        codigoInterno: codigoInterno.trim()
      }
    })
    if (existing) {
      return NextResponse.json({ error: 'El código de producto ya existe para este inquilino.' }, { status: 400 })
    }

    const producto = await prisma.producto.create({
      data: { 
        codigoInterno: codigoInterno.trim(), 
        nombre: nombre.trim(), 
        linea: linea || null, 
        tipo: tipo || 'PRODUCTO',
        precioPaquete: Number(precioPaquete || 0), 
        paqPorCaja: Number(paqPorCaja || 1), 
        precioCaja: Number(precioCaja || precioPaquete || 0),
        precioUnitario: Number(precioPaquete || precioCaja || 0),
        tenantId // Forzado al inquilino autenticado
      },
    })

    return NextResponse.json({ success: true, producto })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
