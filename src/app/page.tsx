import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InicioPageClient } from './InicioPageClient'

export const dynamic = 'force-dynamic'

export default async function IndexPage({ searchParams }: { searchParams: Promise<{ period?: string, zona?: string, vendedor?: string }> }) {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login')
  }

  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  const pathname = headersList.get('x-pathname') || ''

  // 1. Root route redirect: send users directly to their designated workspace
  if (pathname === '/') {
    if (user.alias === 'Elarez' || (user.nivel === 1 && !user.tenantId)) {
      redirect('/super-admin')
    }
    if (user.tenantId === 2 || user.alias === 'vinnaty') {
      redirect('/vinnaty')
    }
    if (user.tenantId === 1 || user.alias === 'admin') {
      redirect('/golocinas')
    }
  }

  // 2. Resolve active tenant for data isolation
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
      const start = new Date(now.getFullYear(), m, 1, 0, 0, 0)
      const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
      return { gte: start, lte: end }
    })
  } else {
    let selectedMonths: number[] = []
    if (periodValue === 'mes') {
      selectedMonths = [currentMonthIndex]
    } else {
      selectedMonths = periodValue.split(',').map(Number).filter(n => !isNaN(n))
    }

    if (selectedMonths.length === 0) {
      isPeriodFiltered = false
    } else {
      dateFilters = selectedMonths.map(m => {
        const start = new Date(now.getFullYear(), m, 1, 0, 0, 0)
        const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
        return { gte: start, lte: end }
      })
    }
  }

  // Queries isolated by currentTenantId
  // 1. Facturas
  const facturasMes = await prisma.factura.findMany({
    where: {
      NOT: { estado: 'anulada' },
      pedido: {
        tenantId: currentTenantId,
        ...(zoneFilter ? { zona: zoneFilter } : {}),
        ...(isVendedor ? { vendedorAlias: userAlias } : {})
      },
      ...(isPeriodFiltered ? {
        OR: dateFilters.map(filter => ({ creadoEn: filter }))
      } : {})
    },
    include: {
      pedido: true
    }
  })
  
  const totalFacturado = facturasMes.reduce((acc, f) => acc + f.total, 0)
  const facturadoA = facturasMes.filter(f => f.tipo === 'A').reduce((acc, f) => acc + f.total, 0)
  const facturadoB = facturasMes.filter(f => f.tipo !== 'A').reduce((acc, f) => acc + f.total, 0)

  // 2. Cobrado (Sum of payments)
  const pagosMes = await prisma.pago.findMany({
    where: {
      AND: [
        {
          OR: [
            { cobranza: { tenantId: currentTenantId, ...(zoneFilter ? { zona: zoneFilter } : {}) } },
            { factura: { pedido: { tenantId: currentTenantId, ...(zoneFilter ? { zona: zoneFilter } : {}) } } }
          ]
        },
        ...(hasVendedorFilter ? [{
          OR: [
            { cobranza: { vendedorAlias: userAlias } },
            { factura: { pedido: { vendedorAlias: userAlias } } }
          ]
        }] : []),
        ...(isPeriodFiltered ? [{
          OR: dateFilters.map(filter => ({ creadoEn: filter }))
        }] : [])
      ]
    }
  })
  const totalCobrado = pagosMes.reduce((acc, p) => acc + p.monto, 0)

  // 3. Cobranza Pendiente
  const cobranzasMes = await prisma.cobranza.findMany({
    where: {
      tenantId: currentTenantId,
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAlias: userAlias } : {}),
      ...(isPeriodFiltered ? {
        OR: dateFilters.map(filter => ({ creadoEn: filter }))
      } : {})
    }
  })
  const cobranzaPendiente = cobranzasMes.reduce((acc, c) => acc + c.saldoPendiente, 0)

  // 4. Target Pedidos (approved orders)
  const targetPedidos = await prisma.pedido.findMany({
    where: {
      tenantId: currentTenantId,
      estado: 'aprobado',
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAlias: userAlias } : {}),
      ...(isPeriodFiltered ? {
        OR: dateFilters.map(filter => ({ creadoEn: filter }))
      } : {})
    },
    include: {
      detalles: {
        include: {
          producto: true
        }
      }
    }
  })
  const cajasVendidas = targetPedidos.reduce((acc, p) => acc + p.detalles.reduce((sum, d) => sum + d.cantidadCajas, 0), 0)

  // 5. Clientes
  const clientesActivos = await prisma.empresa.count({
    where: {
      tenantId: currentTenantId,
      estado: 'activo',
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAsignado: userAlias } : {})
    }
  })
  const clientesProspecto = await prisma.empresa.count({
    where: {
      tenantId: currentTenantId,
      estado: 'prospecto',
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAsignado: userAlias } : {})
    }
  })

  // Recent Activities
  const recentPedidos = await prisma.pedido.findMany({
    take: 10,
    orderBy: { creadoEn: 'desc' },
    where: {
      tenantId: currentTenantId,
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAlias: userAlias } : {})
    },
    include: { empresa: true }
  })

  const recentVentas = await prisma.factura.findMany({
    take: 5,
    orderBy: { creadoEn: 'desc' },
    where: {
      pedido: {
        tenantId: currentTenantId,
        ...(zoneFilter ? { zona: zoneFilter } : {}),
        ...(hasVendedorFilter ? { vendedorAlias: userAlias } : {})
      }
    },
    include: {
      pedido: {
        include: {
          empresa: true
        }
      }
    }
  })

  // Chart aggregations
  const productMap: Record<string, number> = {}
  for (const p of targetPedidos) {
    for (const d of p.detalles) {
      productMap[d.productoNombre] = (productMap[d.productoNombre] || 0) + d.cantidadCajas
    }
  }
  const chartProductos = Object.entries(productMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const zoneMap: Record<string, number> = {}
  for (const f of facturasMes) {
    const zone = f.pedido.zona || 'Sin Zona'
    zoneMap[zone] = (zoneMap[zone] || 0) + f.total
  }
  const chartZonas = Object.entries(zoneMap).map(([zone, sales]) => ({ zone, sales }))

  const methodMap: Record<string, number> = {}
  for (const p of pagosMes) {
    const method = (p.metodoPago || 'Efectivo').toUpperCase()
    methodMap[method] = (methodMap[method] || 0) + p.monto
  }
  const chartMetodos = Object.entries(methodMap).map(([method, amount]) => ({ method, amount }))

  const cobranzaZoneMap: Record<string, number> = {}
  for (const c of cobranzasMes) {
    const zone = c.zona || 'Sin Zona'
    cobranzaZoneMap[zone] = (cobranzaZoneMap[zone] || 0) + c.saldoPendiente
  }
  const chartCobranzaZonas = Object.entries(cobranzaZoneMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Promotions in Sales
  const promos = await prisma.promocion.findMany()
  const promoMap = new Map(promos.map(p => [p.id, p.nombre]))
  const promoSalesMap: Record<string, number> = {}
  for (const p of targetPedidos) {
    if (p.promocionId) {
      const promoName = promoMap.get(p.promocionId) || `Promo #${p.promocionId}`
      const totalCajas = p.detalles.reduce((acc, d) => acc + d.cantidadCajas + (d.cajasBonus || 0), 0)
      promoSalesMap[promoName] = (promoSalesMap[promoName] || 0) + totalCajas
    }
  }
  const chartPromociones = Object.entries(promoSalesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const snacksMap: Record<string, number> = {}
  for (const p of targetPedidos) {
    for (const d of p.detalles) {
      const linea = d.producto?.linea?.toLowerCase() || ''
      if (linea.includes('snack')) {
        snacksMap[d.productoNombre] = (snacksMap[d.productoNombre] || 0) + d.cantidadCajas
      }
    }
  }
  const chartSnacks = Object.entries(snacksMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const tripacksMap: Record<string, number> = {}
  for (const p of targetPedidos) {
    for (const d of p.detalles) {
      const linea = d.producto?.linea?.toLowerCase() || ''
      if (linea.includes('tripack')) {
        tripacksMap[d.productoNombre] = (tripacksMap[d.productoNombre] || 0) + d.cantidadCajas
      }
    }
  }
  const chartTripacks = Object.entries(tripacksMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Heatmap Data — strictly isolated by currentTenantId
  const empresasGeo = await prisma.empresa.findMany({
    where: {
      tenantId: currentTenantId,
      ...(zoneFilter ? { zona: zoneFilter } : {}),
      ...(hasVendedorFilter ? { vendedorAsignado: userAlias } : {}),
      AND: [
        { NOT: { latitud: null } },
        { NOT: { longitud: null } }
      ]
    },
    select: {
      id: true,
      nombre: true,
      direccion: true,
      latitud: true,
      longitud: true,
      zona: true,
      estado: true,
      motivoBaja: true,
      vendedorAsignado: true,
      visitas: {
        where: isPeriodFiltered ? {
          OR: dateFilters.map((f: any) => ({ creadoEn: f }))
        } : {},
        select: { tipo: true }
      },
      pedidos: {
        where: {
          estado: 'aprobado',
          ...(isPeriodFiltered ? {
            OR: dateFilters.map((f: any) => ({ creadoEn: f }))
          } : {})
        },
        select: {
          detalles: {
            select: { cantidadCajas: true, cajasBonus: true }
          }
        }
      },
      acciones: {
        where: isPeriodFiltered ? {
          OR: dateFilters.map((f: any) => ({ creadoEn: f }))
        } : {},
        select: { id: true }
      },
      notasPlanificador: {
        where: isPeriodFiltered ? {
          OR: dateFilters.map((f: any) => ({ creadoEn: f }))
        } : {},
        select: { id: true }
      }
    }
  })

  // Format heatmap points
  const heatmapVisitas = empresasGeo
    .filter(e => e.visitas.length > 0 || e.acciones.length > 0 || e.notasPlanificador.length > 0 || e.pedidos.length > 0)
    .map(e => {
      let weight = e.visitas.reduce((acc, v) => {
        if (v.tipo === 'visita' || v.tipo === 'visita_programada' || v.tipo === 'presencial') return acc + 3
        return acc + 1
      }, 0)
      
      weight += e.acciones.length
      weight += e.notasPlanificador.length
      weight += e.pedidos.length

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
