import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// ─── GET: Detalle de un pedido ───────────────────────────────────────────────
export async function GET(_: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    const { id } = await params

    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      include: {
        empresa: true,
        detalles: { include: { producto: true } },
        facturas: true,
        cobranzas: { include: { pagos: true } },
      },
    })

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    // Zone access check for Level 3
    if (session.nivel === 3 && pedido.zona !== session.zona) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    return NextResponse.json(pedido)
  } catch (error: any) {
    console.error('[API GET Pedido]', error)
    return NextResponse.json({ error: 'Error al obtener el pedido.' }, { status: 500 })
  }
}

// ─── PATCH: Actualizar estado del pedido ─────────────────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    const { id } = await params

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    const body = await request.json()
    const { accion } = body // 'enviar' | 'aprobar' | 'cancelar'

    // ── Transiciones de estado permitidas por nivel ──────────────────────────
    // Nivel 3 puede: borrador → pendiente_supervisor
    // Nivel 1/2 pueden: pendiente_supervisor → aprobado | cancelado

    let nuevoEstado: string | null = null
    let aprobadoPor: Partial<typeof pedido> = {}

    if (accion === 'enviar') {
      if (pedido.estado !== 'borrador' && pedido.estado !== 'presupuesto')
        return NextResponse.json({ error: 'Solo se puede enviar un pedido en borrador o presupuesto.' }, { status: 400 })
      nuevoEstado = 'pendiente_supervisor'
    } else if (accion === 'aprobar_precio') {
      if (session.nivel !== 1)
        return NextResponse.json({ error: 'Solo Gerencia (Nivel 1) puede aprobar tarifas negociadas.' }, { status: 403 })
      if (pedido.estado !== 'pendiente_supervisor')
        return NextResponse.json({ error: 'El pedido no está pendiente.' }, { status: 400 })
      
      const updated = await prisma.pedido.update({
        where: { id: Number(id) },
        data: {
          tienePrecioNegociado: false,
          tieneTarifaNegociada: false
        }
      })
      await registrarAccion(
        session.id, session.alias,
        `PEDIDO_TARIFA_APROBADA`,
        `Tarifa negociada aprobada para el pedido ${pedido.numeroPedido}`
      )
      return NextResponse.json({ success: true, pedido: updated })
    } else if (accion === 'aprobar') {
      if (session.nivel > 2)
        return NextResponse.json({ error: 'Sin permisos para aprobar.' }, { status: 403 })
      if (pedido.estado !== 'pendiente_supervisor')
        return NextResponse.json({ error: 'Solo se puede aprobar un pedido pendiente.' }, { status: 400 })
      
      // Enforce Nivel 1 approval for negotiated prices or negotiated volume tariffs
      if ((pedido.tienePrecioNegociado || pedido.tieneTarifaNegociada) && session.nivel === 2) {
        return NextResponse.json({
          error: 'Este pedido contiene precios o tarifas negociadas y requiere aprobación de Gerencia (Nivel 1).'
        }, { status: 403 })
      }

      nuevoEstado = 'aprobado'
      aprobadoPor = {
        aprobadoPorId: session.id,
        aprobadoPorAlias: session.alias,
        aprobadoEn: new Date(),
        fechaEntrega: body.fechaEntrega || null,
        metodoPagoB: body.metodoPagoB || null,
      }

      // Guardar el desglose de cajasFacturaA y cajasFacturaX
      if (body.splits) {
        for (const detalle of (pedido as any).detalles) {
          const split = body.splits[detalle.productoId]
          if (split) {
            await prisma.detallePedido.update({
              where: { id: detalle.id },
              data: {
                cajasFacturaA: split.A,
                cajasFacturaX: split.X
              }
            })
          }
        }
      }
    } else if (accion === 'facturar') {
      if (session.nivel > 2)
        return NextResponse.json({ error: 'Sin permisos para facturar.' }, { status: 403 })
      if (pedido.estado !== 'aprobado')
        return NextResponse.json({ error: 'Solo se puede facturar un pedido aprobado.' }, { status: 400 })
      nuevoEstado = 'facturado'
    } else if (accion === 'cancelar') {
      if (pedido.estado === 'aprobado' && session.nivel > 1)
        return NextResponse.json({ error: 'Solo Nivel 1 puede cancelar un pedido aprobado.' }, { status: 403 })
      nuevoEstado = 'cancelado'
    } else {
      return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 })
    }

    // Calcula el recargo financiero B si corresponde, y actualiza el total.
    let updateData = { estado: nuevoEstado, ...aprobadoPor }
    
    if (nuevoEstado === 'aprobado' && body.metodoPagoB === 'transferencia' && (pedido.porcentajePagoB || 0) > 0) {
      const montoB = pedido.subtotalSinIVA * ((pedido.porcentajePagoB || 0) / 100)
      const recargoB = montoB * 0.03
      updateData = {
        ...updateData,
        montoFinanciera: recargoB,
        totalGeneral: pedido.subtotalSinIVA + (pedido.montoIVA || 0) + recargoB
      } as any
    }

    const updated = await prisma.pedido.update({
      where: { id: Number(id) },
      data: updateData,
    })

    // If approved → auto-generate Facturas and Cobranzas
    if (nuevoEstado === 'aprobado') {
      await generarFacturasYCobranzas(updated, session.alias)
    }

    await registrarAccion(
      session.id, session.alias,
      `PEDIDO_${accion.toUpperCase()}`,
      `Pedido ${pedido.numeroPedido} cambió a estado: ${nuevoEstado}`
    )

    return NextResponse.json({ success: true, pedido: updated })
  } catch (error: any) {
    console.error('[API PATCH Pedido]', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar el pedido.' }, { status: 500 })
  }
}

// ─── Helper: Generar Facturas y Cobranzas al aprobar ────────────────────────
async function generarFacturasYCobranzas(pedido: any, alias: string) {
  const año = new Date().getFullYear()
  const baseNum = pedido.id

  const empresa = await prisma.empresa.findUnique({ where: { id: pedido.empresaId } })
  const empresaNombre = empresa?.nombre || ''

  // Factura A (con IVA 21%) → parte porcentajePagoA
  const pctA = (pedido.porcentajePagoA || 0) / 100
  const montoA = pedido.subtotalSinIVA * pctA
  if (montoA > 0) {
    const iva = montoA * 0.21
    const totalA = montoA + iva
    await prisma.factura.create({
      data: {
        pedidoId: pedido.id,
        numeroFactura: `FAC-A-${año}-${String(baseNum).padStart(4, '0')}`,
        tipo: 'A',
        subtotal: montoA,
        iva,
        recargo: 0,
        total: totalA,
        estado: 'pendiente',
      },
    })

    await prisma.cobranza.create({
      data: {
        pedidoId: pedido.id,
        empresaId: pedido.empresaId,
        empresaNombre,
        vendedorAlias: pedido.vendedorAlias,
        zona: pedido.zona,
        montoOriginal: totalA,
        saldoPendiente: totalA,
        cuota: 1,
        totalCuotas: 1,
        estado: 'pendiente',
        fechaVencimiento: pedido.fechaPagoA ? new Date(pedido.fechaPagoA) : null,
        tipoFactura: 'A',
        metodoPago: pedido.metodoPagoA,
      },
    })
  }

  // Factura B (sin IVA) → parte porcentajePagoB
  const pctB = (pedido.porcentajePagoB || 0) / 100
  const montoB = pedido.subtotalSinIVA * pctB
  if (montoB > 0) {
    const recargoB = pedido.metodoPagoB === 'transferencia' ? montoB * 0.03 : 0
    const totalB = montoB + recargoB
    await prisma.factura.create({
      data: {
        pedidoId: pedido.id,
        numeroFactura: `FAC-B-${año}-${String(baseNum).padStart(4, '0')}`,
        tipo: 'B',
        subtotal: montoB,
        iva: 0,
        recargo: recargoB,
        total: totalB,
        estado: 'pendiente',
      },
    })

    await prisma.cobranza.create({
      data: {
        pedidoId: pedido.id,
        empresaId: pedido.empresaId,
        empresaNombre,
        vendedorAlias: pedido.vendedorAlias,
        zona: pedido.zona,
        montoOriginal: totalB,
        saldoPendiente: totalB,
        cuota: 1,
        totalCuotas: 1,
        estado: 'pendiente',
        fechaVencimiento: pedido.fechaEntrega ? new Date(pedido.fechaEntrega) : null,
        tipoFactura: 'B',
        metodoPago: pedido.metodoPagoB,
      },
    })
  }
}


// ─── PUT: Actualizar un pedido completo (borrador) ──────────────────────────
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    const { id } = await params
    const pedidoId = Number(id)

    const existing = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: true }
    })
    if (!existing) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    // Check if the order is in borrador state
    if (existing.estado !== 'borrador' && existing.estado !== 'presupuesto') {
      return NextResponse.json({ error: 'Solo se pueden editar pedidos en estado borrador o presupuesto.' }, { status: 400 })
    }

    const body = await request.json()
    let {
      empresaId,
      tieneTarifaNegociada: tieneTarifaNegociadaBody,
      detalles,
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

    // Verify company exists
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

    // Fetch products
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

    let flag60Rule = false
    const totalProductos = detalles.length
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
    const pctA = (porcentajePagoA || 20) / 100
    const montoIVA = subtotalSinIVA * pctA * 0.21
    const montoFinanciera = aplicaFinanciera ? (subtotalSinIVA + montoIVA) * 0.03 : 0
    const totalGeneral = subtotalSinIVA + montoIVA + montoFinanciera

    // Delete old details and recreate
    await prisma.detallePedido.deleteMany({ where: { pedidoId } })

    const updated = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        empresaId,
        tienePrecioNegociado,
        tieneTarifaNegociada: tieneTarifaNegociada || false,
        condicionPago: condicionPago || `${porcentajePagoA || 20}/${porcentajePagoB || 80}`,
        porcentajePagoA: porcentajePagoA || 20,
        porcentajePagoB: porcentajePagoB || 80,
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
      include: { detalles: true }
    })

    await registrarAccion(session.id, session.alias, 'UPDATE_PEDIDO', `Pedido ${updated.numeroPedido} actualizado por vendedor`)

    return NextResponse.json({ success: true, pedido: updated })
  } catch (error: any) {
    console.error('[API PUT Pedido]', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar el pedido.' }, { status: 500 })
  }
}

// ─── DELETE: Eliminar un pedido ──────────────────────────────────────────────
export async function DELETE(_: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    const { id } = await params
    const pedidoId = Number(id)

    const existing = await prisma.pedido.findUnique({ where: { id: pedidoId } })
    if (!existing) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    // Only allow deletion if Nivel 1/2, or if it's the seller (Nivel 3) and it's a draft or cancelled
    if (session.nivel === 3 && existing.vendedorAlias !== session.alias) {
      return NextResponse.json({ error: 'No puedes borrar pedidos de otro vendedor.' }, { status: 403 })
    }
    if (session.nivel === 3 && !['borrador', 'cancelado'].includes(existing.estado)) {
      return NextResponse.json({ error: 'Solo puedes borrar pedidos en borrador o cancelados.' }, { status: 403 })
    }

    // Cascade delete is usually configured in Prisma for detalles, facturas, etc.
    // We will manually delete dependent records if not configured.
    await prisma.detallePedido.deleteMany({ where: { pedidoId } })
    await prisma.factura.deleteMany({ where: { pedidoId } })
    await prisma.cobranza.deleteMany({ where: { pedidoId } })
    
    await prisma.pedido.delete({ where: { id: pedidoId } })

    await registrarAccion(session.id, session.alias, 'DELETE_PEDIDO', `Pedido ${existing.numeroPedido} eliminado`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API DELETE Pedido]', error)
    return NextResponse.json({ error: 'Error al eliminar el pedido.' }, { status: 500 })
  }
}
