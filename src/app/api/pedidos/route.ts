import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

// ─── GET: Listar pedidos (filtrado por zona/nivel) ───────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const zona = searchParams.get('zona')
    const queryVendedor = searchParams.get('vendedor')
    const estado = searchParams.get('estado')

    // Build zone filter based on user level
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
          : { zona: { in: habilitadas } }
      } else if (zona && zona !== 'todas') {
        zonaFilter = { zona }
      }
      
      if (queryVendedor) {
        zonaFilter.vendedorAlias = queryVendedor
      }
    }

    const pedidos = await prisma.pedido.findMany({
      where: {
        ...zonaFilter,
        ...(estado && estado !== 'todos' ? { estado } : {}),
      },
      include: {
        empresa: { select: { nombre: true, cuit: true } },
        detalles: { include: { producto: true } },
      },
      orderBy: { creadoEn: 'desc' },
    })

    return NextResponse.json(pedidos)
  } catch (error: any) {
    console.error('[API GET Pedidos]', error)
    return NextResponse.json({ error: 'Error al listar pedidos.' }, { status: 500 })
  }
}

// ─── POST: Crear nuevo pedido ────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const body = await request.json()
    const {
      empresaId,
      tieneTarifaNegociada: tieneTarifaNegociadaBody,
      detalles, // [{ productoId, cantidadCajas, cajasBonus, descripcionBonus }]
      condicionPago,
      porcentajePagoA,
      porcentajePagoB,
      aplicaFinanciera,
      plazosPago,
      observaciones,
      acuerdosComerciales,
      requierePresupuesto,
      turnoEntrega,
      metodoPagoA,
      fechaPagoA,
      listaPrecioId
    } = body

    if (!empresaId || !detalles?.length) {
      return NextResponse.json({ error: 'Empresa y al menos un producto son requeridos.' }, { status: 400 })
    }

    // Verify the company exists and is active
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada.' }, { status: 404 })

    // Find the requested price list or fallback to the latest active one
    let activeList = null
    if (listaPrecioId) {
      activeList = await prisma.listaPrecio.findUnique({
        where: { id: listaPrecioId },
        include: { precios: true }
      })
    }
    if (!activeList) {
      activeList = await prisma.listaPrecio.findFirst({
        where: {
          activa: true,
          vigenteDesde: { lte: new Date() }
        },
        orderBy: { vigenteDesde: 'desc' },
        include: { precios: true }
      })
    }

    let tieneTarifaNegociada = tieneTarifaNegociadaBody || false

    // Load configurable rules from the selected list (fallback to defaults if not set)
    const MINIMO_CAJAS = activeList?.minimoCajas ?? 300
    const LIMITE_LISTA_A = activeList?.limiteListaA ?? 60

    // Fetch the products related to detailsnapshots
    const productoIds = detalles.map((d: any) => d.productoId)
    const productos = await prisma.producto.findMany({ where: { id: { in: productoIds } } })
    const productoMap = Object.fromEntries(productos.map(p => [p.id, p]))

    // Check volume tier
    const totalCajas = detalles.reduce((sum: number, d: any) => sum + (d.cantidadCajas || 0), 0)
    const isVolume = totalCajas >= MINIMO_CAJAS || tieneTarifaNegociada
    
    let countListaA = 0
    let subtotalSinIVA = 0
    let tienePrecioNegociado = false
    
    const detallesConCalculo = detalles.map((d: any) => {
      const prod = productoMap[d.productoId]
      if (!prod) throw new Error(`Producto ${d.productoId} no encontrado`)
      
      const priceRecord = activeList?.precios.find(pr => pr.productoId === prod.id)
      const defaultCajaPrice = isVolume
        ? (priceRecord ? priceRecord.precioCajaMax : prod.precioCaja)
        : (priceRecord ? priceRecord.precioCajaMin : prod.precioCaja)

      const defaultPaqPrice = isVolume
        ? (priceRecord ? priceRecord.precioPaqueteMax : prod.precioPaquete)
        : (priceRecord ? priceRecord.precioPaqueteMin : prod.precioPaquete)

      const priceA = priceRecord ? priceRecord.precioCajaMax : prod.precioCaja
      const priceB = priceRecord ? priceRecord.precioCajaMin : prod.precioCaja

      const customPrice = parseFloat(d.precioCajaSnapshot)
      const isListA = Math.abs(customPrice - priceA) < 0.01
      const isListB = Math.abs(customPrice - priceB) < 0.01
      const hasCustomPrice = !isNaN(customPrice) && !isListA && !isListB
      
      if (isListA) countListaA++

      const priceToUse = (!isNaN(customPrice) && customPrice > 0) ? customPrice : defaultCajaPrice
      if (hasCustomPrice) {
        tienePrecioNegociado = true
      }
      
      const subtotal = priceToUse * (d.cantidadCajas || 0)
      subtotalSinIVA += subtotal
      return {
        productoId: prod.id,
        productoNombre: prod.nombre,
        precioCajaSnapshot: priceToUse,
        precioPaqSnapshot: defaultPaqPrice,
        paqPorCajaSnapshot: prod.paqPorCaja,
        precioCajaOriginal: defaultCajaPrice,
        cantidadCajas: d.cantidadCajas || 0,
        subtotal,
        cajasBonus: d.cajasBonus || 0,
        descripcionBonus: d.descripcionBonus || null,
        cajasFacturaA: d.cajasFacturaA || 0,
        cajasFacturaX: d.cajasFacturaX || 0,
      }
    })

    const totalProductos = detalles.length
    let flag60Rule = false
    if (totalCajas < MINIMO_CAJAS) {
      const porcentajeListaA = (countListaA / totalProductos) * 100
      if (porcentajeListaA >= LIMITE_LISTA_A) {
        tienePrecioNegociado = true
        flag60Rule = true
      } else if (porcentajeListaA > 0) {
        tieneTarifaNegociada = true
      }
    }

    // Auto-update observaciones con el total de cajas
    let cleanObs = observaciones || ''
    cleanObs = cleanObs.replace(/^TOTAL CAJAS=\d+( \| )?/, '')
    const finalObservaciones = `TOTAL CAJAS=${totalCajas}${cleanObs ? ' | ' + cleanObs : ''}`

    // Financial calculations
    const pctA = (porcentajePagoA ?? 20) / 100
    const montoIVA = subtotalSinIVA * pctA * 0.21   // 21% IVA sobre la parte A
    const montoFinanciera = aplicaFinanciera
      ? (subtotalSinIVA + montoIVA) * 0.03
      : 0
    const totalGeneral = subtotalSinIVA + montoIVA + montoFinanciera

    // Auto-generate order number with retry to avoid race conditions
    const currentYear = new Date().getFullYear();
    let nextNumber = 1;
    
    // Find highest order number for current year
    const lastPedido = await prisma.pedido.findFirst({
      where: { numeroPedido: { startsWith: `PED-${currentYear}-` } },
      orderBy: { id: 'desc' }
    });
    
    if (lastPedido) {
      const parts = lastPedido.numeroPedido.split('-');
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2], 10) + 1;
      }
    }

    let pedido = null;
    let attempts = 0;
    
    while (!pedido && attempts < 5) {
      const numeroPedido = `PED-${currentYear}-${String(nextNumber).padStart(4, '0')}`
      
      try {
        pedido = await prisma.pedido.create({
          data: {
            numeroPedido,
            empresaId,
            vendedorId: session.id,
            vendedorAlias: session.alias,
            zona: empresa.zona || session.zona || 'Sin Zona',
            estado: requierePresupuesto ? 'presupuesto' : 'borrador',
            tienePrecioNegociado,
            tieneTarifaNegociada: tieneTarifaNegociada || false,
            condicionPago: condicionPago || `${porcentajePagoA || 20}/${porcentajePagoB || 80}`,
            porcentajePagoA: porcentajePagoA ?? 20,
            porcentajePagoB: porcentajePagoB ?? 80,
            aplicaFinanciera: aplicaFinanciera || false,
            plazosPago: plazosPago || null,
            observaciones: finalObservaciones,
            acuerdosComerciales: acuerdosComerciales || null,
            requierePresupuesto: requierePresupuesto || false,
            turnoEntrega: turnoEntrega || null,
            metodoPagoA: metodoPagoA || null,
            fechaPagoA: fechaPagoA ? new Date(fechaPagoA).toISOString() : null,
            subtotalSinIVA,
            montoIVA,
            montoFinanciera,
            totalGeneral,
            detalles: { create: detallesConCalculo },
          },
          include: { detalles: true },
        })
      } catch (err: any) {
        if (err.code === 'P2002') { // Unique constraint failed
          nextNumber++;
          attempts++;
        } else {
          throw err;
        }
      }
    }

    if (!pedido) {
      throw new Error('No se pudo generar un número de pedido único. Intente nuevamente.');
    }

    await registrarAccion(session.id, session.alias, 'CREATE_PEDIDO', `Pedido ${pedido.numeroPedido} creado para empresa ID ${empresaId}`)

    return NextResponse.json({ success: true, pedido })
  } catch (error: any) {
    console.error('[API POST Pedidos]', error)
    return NextResponse.json({ error: error.message || 'Error al crear el pedido.' }, { status: 500 })
  }
}
