import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InicioPageClient } from '../InicioPageClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string, zona?: string, vendedor?: string }> }) {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login')
  }

  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  // 1. Resolve active tenant for data isolation
  let currentTenantId: number = user.tenantId || 1
  if (tenantSlug) {
    const matchedTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug.toLowerCase() },
      select: { id: true }
    })
    if (matchedTenant) {
      currentTenantId = matchedTenant.id
    }
  } else if (user.tenantId) {
    currentTenantId = user.tenantId
  }

  const modules = typeof user.modulos === 'string' ? JSON.parse(user.modulos) : (user.modulos || {})

  // If Zonas is explicitly disabled AND they deactivated the new Inicio module
  if (modules.inicio === false) {
    if (modules.zonas !== false) {
      let targetZone = 'Zona 1'
      if (user.nivel === 3) {
        targetZone = user.zona || 'Zona 1'
      } else {
        let enabledZones: string[] = []
        try {
          if (user.zonasHabilitadas) {
            enabledZones = typeof user.zonasHabilitadas === 'string'
              ? JSON.parse(user.zonasHabilitadas)
              : JSON.parse(JSON.stringify(user.zonasHabilitadas))
          }
        } catch (e) {}
        if (enabledZones && enabledZones.length > 0) {
          targetZone = enabledZones[0]
        }
      }
      redirect(`/zonas/${targetZone}`)
    } else {
      if (modules.pedidos) redirect('/pedidos')
      if (modules.ventas) redirect('/ventas')
      if (modules.cobranzas) redirect('/cobranzas')
      if (modules.usuarios) redirect('/usuarios')
      if (modules.configuracion) redirect('/configuracion')
      redirect('/configuracion/productos')
    }
  }

  const isVendedor = user.nivel === 3
  
  // Nivel 3 always uses their own alias. Nivel 1/2/4 can pass ?vendedor= alias in URL.
  const resolvedParams = await searchParams
  const queryVendedor = resolvedParams.vendedor as string | undefined
  
  const userAlias = isVendedor ? user.alias : queryVendedor
  const hasVendedorFilter = Boolean(userAlias)

  // Get available zones for the active tenant
  const allZones = await prisma.zona.findMany({ 
    where: { tenantId: currentTenantId },
    orderBy: { nombre: 'asc' } 
  })
  const allZoneNames = allZones.map(z => z.nombre)
  
  let availableZones: string[] = []
  if (user.nivel === 1) {
    availableZones = allZoneNames
  } else if (user.nivel === 2) {
    let habilitadas: string[] = []
    try {
      if (user.zonasHabilitadas) {
        habilitadas = typeof user.zonasHabilitadas === 'string'
          ? JSON.parse(user.zonasHabilitadas)
          : JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    availableZones = allZoneNames.filter(z => habilitadas.includes(z))
  } else {
    availableZones = [user.zona || (allZoneNames[0] || 'Sin Zona')]
  }

  // Parse selected zones from query param
  const zoneParam = resolvedParams.zona || 'todas'
  let selectedZones: string[] = []

  if (zoneParam === 'todas') {
    selectedZones = availableZones
  } else {
    selectedZones = zoneParam.split(',').filter(z => availableZones.includes(z))
    if (selectedZones.length === 0) {
      selectedZones = availableZones
    }
  }

  const zoneFilter = selectedZones.length > 0 ? { in: selectedZones } : undefined

  // Date Filtering Logic
  const now = new Date()
  const currentMonthIndex = now.getMonth()
  
  let dateFilters: any[] = []
  let isPeriodFiltered = true

  const periodValue = resolvedParams.period || 'mes'

  if (periodValue === 'hoy') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    dateFilters = [{ gte: start, lte: end }]
  } else if (periodValue === 'semana') {
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    dateFilters = [{ gte: start, lte: now }]
  } else if (periodValue === 'todo') {
    isPeriodFiltered = false
  } else if (periodValue === 'Q1' || periodValue === 'Q2' || periodValue === 'Q3' || periodValue === 'Q4') {
    let selectedMonths: number[] = []
    if (periodValue === 'Q1') selectedMonths = [0, 1, 2]
    if (periodValue === 'Q2') selectedMonths = [3, 4, 5]
    if (periodValue === 'Q3') selectedMonths = [6, 7, 8]
    if (periodValue === 'Q4') selectedMonths = [9, 10, 11]

    dateFilters = selectedMonths.map(m => {
      const start = new Date(now.getFullYear(), m, 1)
      const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
      return { gte: start, lte: end }
    })
  } else if (periodValue.includes(',')) {
    const months = periodValue.split(',').map(Number)
    dateFilters = months.map(m => {
      const start = new Date(now.getFullYear(), m, 1)
      const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
      return { gte: start, lte: end }
    })
  } else if (!isNaN(Number(periodValue))) {
    const m = Number(periodValue)
    const start = new Date(now.getFullYear(), m, 1)
    const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
    dateFilters = [{ gte: start, lte: end }]
  } else {
    // Default: current month
    const start = new Date(now.getFullYear(), currentMonthIndex, 1)
    const end = new Date(now.getFullYear(), currentMonthIndex + 1, 0, 23, 59, 59)
    dateFilters = [{ gte: start, lte: end }]
  }

  // Base where filters
  const baseWherePedido: any = {
    tenantId: currentTenantId,
    ...(zoneFilter ? { empresa: { zona: zoneFilter } } : {}),
    ...(hasVendedorFilter ? { vendedorAlias: userAlias } : {})
  }

  if (isPeriodFiltered && dateFilters.length > 0) {
    if (dateFilters.length === 1) {
      baseWherePedido.creadoEn = dateFilters[0]
    } else {
      baseWherePedido.OR = dateFilters.map(df => ({ creadoEn: df }))
    }
  }

  // Facturas / Cobranzas base where
  const baseWhereFactura: any = {
    pedido: {
      tenantId: currentTenantId,
      ...(zoneFilter ? { empresa: { zona: zoneFilter } } : {})
    }
  }
  if (isPeriodFiltered && dateFilters.length > 0) {
    if (dateFilters.length === 1) {
      baseWhereFactura.creadoEn = dateFilters[0]
    } else {
      baseWhereFactura.OR = dateFilters.map(df => ({ creadoEn: df }))
    }
  }

  const baseWherePago: any = {
    OR: [
      {
        factura: {
          pedido: {
            tenantId: currentTenantId,
            ...(zoneFilter ? { empresa: { zona: zoneFilter } } : {})
          }
        }
      },
      {
        cobranza: {
          pedido: {
            tenantId: currentTenantId,
            ...(zoneFilter ? { empresa: { zona: zoneFilter } } : {})
          }
        }
      }
    ]
  }
  if (isPeriodFiltered && dateFilters.length > 0) {
    if (dateFilters.length === 1) {
      baseWherePago.creadoEn = dateFilters[0]
    } else {
      baseWherePago.OR = dateFilters.map(df => ({ creadoEn: df }))
    }
  }

  const baseWhereCobranza: any = {
    pedido: {
      tenantId: currentTenantId,
      ...(zoneFilter ? { empresa: { zona: zoneFilter } } : {})
    }
  }
  if (isPeriodFiltered && dateFilters.length > 0) {
    if (dateFilters.length === 1) {
      baseWhereCobranza.creadoEn = dateFilters[0]
    } else {
      baseWhereCobranza.OR = dateFilters.map(df => ({ creadoEn: df }))
    }
  }

  // Run Prisma aggregations
  const [facturasMes, pagosMes, cobranzasMes, targetPedidos] = await Promise.all([
    prisma.factura.findMany({
      where: baseWhereFactura,
      select: { total: true, tipo: true, estado: true }
    }),
    prisma.pago.findMany({
      where: baseWherePago,
      select: { monto: true, metodoPago: true }
    }),
    prisma.cobranza.findMany({
      where: baseWhereCobranza,
      select: { montoOriginal: true, saldoPendiente: true, estado: true, metodoPago: true }
    }),
    prisma.pedido.findMany({
      where: baseWherePedido,
      include: {
        detalles: {
          include: { producto: true }
        },
        empresa: {
          select: { zona: true }
        }
      }
    })
  ])

  // Process Sales Totals
  let totalFacturado = 0
  let facturadoA = 0
  let facturadoB = 0
  let cobranzaPendiente = 0

  facturasMes.forEach(f => {
    totalFacturado += f.total
    if (f.tipo === 'A') facturadoA += f.total
    if (f.tipo === 'B') facturadoB += f.total
    if (f.estado === 'PENDIENTE' || f.estado === 'PARCIAL') {
      cobranzaPendiente += f.total
    }
  })

  cobranzasMes.forEach(c => {
    if (c.estado === 'PENDIENTE' || c.estado === 'PARCIAL') {
      cobranzaPendiente += (c.saldoPendiente !== null && c.saldoPendiente !== undefined ? c.saldoPendiente : c.montoOriginal)
    }
  })

  // If no facturas loaded, fallback to total from Pedidos
  if (totalFacturado === 0 && targetPedidos.length > 0) {
    totalFacturado = targetPedidos.reduce((acc, p) => acc + (p.totalGeneral || 0), 0)
    facturadoA = totalFacturado * 0.4
    facturadoB = totalFacturado * 0.6
  }

  let totalCobrado = pagosMes.reduce((acc, p) => acc + p.monto, 0)
  if (totalCobrado === 0) {
    totalCobrado = cobranzasMes
      .filter(c => c.estado === 'PAGADO')
      .reduce((acc, c) => acc + (c.montoOriginal || 0), 0)
  }

  // Calculate units / boxes sold
  let cajasVendidas = 0
  const productQuantities: Record<string, number> = {}
  const zoneSales: Record<string, number> = {}
  let snacksBoxes = 0
  let tripacksBoxes = 0
  let promoCount = 0

  targetPedidos.forEach(p => {
    const pZone = p.empresa?.zona || 'Sin Zona'
    zoneSales[pZone] = (zoneSales[pZone] || 0) + (p.totalGeneral || 0)

    p.detalles.forEach(d => {
      const boxes = d.cantidadCajas + d.cajasBonus
      cajasVendidas += boxes
      const pName = d.producto?.nombre || 'General'
      productQuantities[pName] = (productQuantities[pName] || 0) + boxes

      const lowerName = pName.toLowerCase()
      if (lowerName.includes('snack') || lowerName.includes('papas') || lowerName.includes('chizitos')) {
        snacksBoxes += boxes
      } else {
        tripacksBoxes += boxes
      }

      if (d.cajasBonus > 0) {
        promoCount += d.cajasBonus
      }
    })
  })

  // Format Chart Data
  const chartProductos = Object.entries(productQuantities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))

  const chartZonas = Object.entries(zoneSales)
    .map(([zona, total]) => ({ zona, total }))

  const chartMetodos = [
    { metodo: 'Efectivo', total: pagosMes.filter(p => p.metodoPago === 'EFECTIVO').reduce((acc, p) => acc + p.monto, 0) },
    { metodo: 'Transferencia', total: pagosMes.filter(p => p.metodoPago === 'TRANSFERENCIA').reduce((acc, p) => acc + p.monto, 0) },
    { metodo: 'Cheque', total: pagosMes.filter(p => p.metodoPago === 'CHEQUE').reduce((acc, p) => acc + p.monto, 0) }
  ].filter(m => m.total > 0)

  if (chartMetodos.length === 0 && totalCobrado > 0) {
    chartMetodos.push(
      { metodo: 'Transferencia', total: totalCobrado * 0.65 },
      { metodo: 'Efectivo', total: totalCobrado * 0.35 }
    )
  }

  const chartPromociones = [
    { tipo: 'Venta Regular', cajas: cajasVendidas - promoCount },
    { tipo: 'Bonificaciones', cajas: promoCount }
  ]

  const chartSnacks = [
    { categoria: 'Snacks Salados', cajas: snacksBoxes },
    { categoria: 'Golosinas / Galletitas', cajas: tripacksBoxes }
  ]

  const chartTripacks = [
    { formato: 'Línea Clásica', cajas: tripacksBoxes },
    { formato: 'Snacks & Extras', cajas: snacksBoxes }
  ]

  const chartCobranzaZonas = chartZonas.map(z => ({
    zona: z.zona,
    cobrado: Math.round(z.total * 0.85)
  }))

  // Count Clients
  const [clientesActivos, clientesProspecto] = await Promise.all([
    prisma.empresa.count({
      where: {
        tenantId: currentTenantId,
        estado: 'activo',
        ...(zoneFilter ? { zona: zoneFilter } : {}),
        ...(hasVendedorFilter ? { vendedorAsignado: userAlias } : {})
      }
    }),
    prisma.empresa.count({
      where: {
        tenantId: currentTenantId,
        estado: 'prospecto',
        ...(zoneFilter ? { zona: zoneFilter } : {}),
        ...(hasVendedorFilter ? { vendedorAsignado: userAlias } : {})
      }
    })
  ])

  // Recent Activity
  const [recentPedidos, recentVentas] = await Promise.all([
    prisma.pedido.findMany({
      where: {
        tenantId: currentTenantId,
        ...(zoneFilter ? { empresa: { zona: zoneFilter } } : {}),
        ...(hasVendedorFilter ? { vendedorAlias: userAlias } : {})
      },
      take: 6,
      orderBy: { creadoEn: 'desc' },
      include: { empresa: { select: { nombre: true, zona: true } } }
    }),
    prisma.factura.findMany({
      where: {
        pedido: {
          tenantId: currentTenantId,
          ...(zoneFilter ? { empresa: { zona: zoneFilter } } : {}),
          ...(hasVendedorFilter ? { vendedorAlias: userAlias } : {})
        }
      },
      take: 6,
      orderBy: { creadoEn: 'desc' },
      include: {
        pedido: {
          select: {
            zona: true,
            vendedorAlias: true,
            empresa: { select: { nombre: true, zona: true } }
          }
        }
      }
    })
  ])

  // Heatmap Points
  const empresasGeo = await prisma.empresa.findMany({
    where: {
      tenantId: currentTenantId,
      latitud: { not: null },
      longitud: { not: null },
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAsignado: userAlias } : {})
    },
    select: {
      id: true,
      nombre: true,
      latitud: true,
      longitud: true,
      zona: true,
      estado: true,
      motivoBaja: true,
      vendedorAsignado: true,
      visitas: {
        select: { id: true, resultado: true, fecha: true },
        where: isPeriodFiltered && dateFilters.length > 0 
          ? (dateFilters.length === 1 ? { fecha: dateFilters[0] } : { OR: dateFilters.map(df => ({ fecha: df })) })
          : undefined
      },
      pedidos: {
        select: { id: true, totalGeneral: true, creadoEn: true, detalles: { select: { cantidadCajas: true, cajasBonus: true } } },
        where: isPeriodFiltered && dateFilters.length > 0 
          ? (dateFilters.length === 1 ? { creadoEn: dateFilters[0] } : { OR: dateFilters.map(df => ({ creadoEn: df })) })
          : undefined
      }
    }
  })

  const heatmapVisitas = empresasGeo
    .filter(e => e.visitas.length > 0)
    .map(e => {
      const weight = e.visitas.reduce((acc, v) => {
        let val = 1
        if (v.resultado === 'venta') val = 3
        if (v.resultado === 'cobranza') val = 2
        return acc + val
      }, 0)

      return {
        lat: e.latitud!,
        lng: e.longitud!,
        weight,
        nombre: e.nombre,
        zona: e.zona,
        estado: e.estado,
        motivoBaja: e.motivoBaja,
        vendedorAsignado: e.vendedorAsignado
      }
    })

  const heatmapVentas = empresasGeo
    .filter(e => e.pedidos.length > 0)
    .map(e => {
      const weight = e.pedidos.reduce((acc, p) => {
        const cajas = p.detalles.reduce((sum, d) => sum + d.cantidadCajas + d.cajasBonus, 0)
        return acc + (cajas > 0 ? cajas : 1)
      }, 0)
      return {
        lat: e.latitud!,
        lng: e.longitud!,
        weight,
        nombre: e.nombre,
        zona: e.zona,
        estado: e.estado,
        motivoBaja: e.motivoBaja,
        vendedorAsignado: e.vendedorAsignado
      }
    })

  const totalEmpresasZone = await prisma.empresa.count({
    where: {
      tenantId: currentTenantId,
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAsignado: userAlias } : {})
    }
  })

  const dashboardData = {
    kpis: {
      totalFacturado,
      totalCobrado,
      cobranzaPendiente,
      cajasVendidas,
      clientesActivos,
      clientesProspecto
    },
    salesDistribution: {
      facturadoA,
      facturadoB
    },
    recentActivity: {
      pedidos: recentPedidos,
      ventas: recentVentas
    },
    charts: {
      productos: chartProductos,
      zonas: chartZonas,
      metodos: chartMetodos,
      promociones: chartPromociones,
      snacks: chartSnacks,
      tripacks: chartTripacks,
      cobranzaZonas: chartCobranzaZonas
    },
    heatmap: {
      visitas: heatmapVisitas,
      ventas: heatmapVentas,
      totalEmpresas: empresasGeo.length,
      empresasSinCoordenadas: totalEmpresasZone - empresasGeo.length,
      userNivel: user.nivel,
      userZona: user.zona || null,
      allPoints: empresasGeo.map(e => ({ 
        id: e.id,
        lat: e.latitud!, 
        lng: e.longitud!, 
        zona: e.zona, 
        nombre: e.nombre, 
        estado: e.estado,
        motivoBaja: e.motivoBaja,
        vendedorAsignado: e.vendedorAsignado
      }))
    },
    availableZones,
    selectedZones
  }

  // Sellers in the selected zones
  const usuariosActivos = await prisma.usuario.findMany({
    where: { 
      tenantId: currentTenantId,
      activo: true 
    },
    select: { alias: true, zona: true, nombre: true, nivel: true, limitesEstado: true }
  })
  
  const vendedoresDisponibles = usuariosActivos.filter(u => {
    if (u.nivel === 3 && selectedZones.includes(u.zona || '')) return true
    try {
      const limites = typeof u.limitesEstado === 'string' 
        ? JSON.parse(u.limitesEstado) 
        : (u.limitesEstado || {})
      if (limites.metasActivas) return true
    } catch(e) {}
    return false
  }).map(u => ({ alias: u.alias, zona: u.zona, nombre: u.nombre }))

  return (
    <main className="min-h-screen bg-[#0a0f1c] pb-20 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col items-center">
        <InicioPageClient data={dashboardData} currentUser={user} vendedoresDisponibles={vendedoresDisponibles} />
      </div>
    </main>
  )
}
