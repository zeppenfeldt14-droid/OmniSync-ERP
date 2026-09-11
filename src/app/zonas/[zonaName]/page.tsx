import { prisma } from '@/lib/prisma'
import { Briefcase, Building2, CheckCircle, Clock, MapPin, BarChart2, Calendar as CalendarIcon, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'
import { DailyRouteChart } from '@/components/charts/DailyRouteChart'
import { MonthlyVisitsChart } from '@/components/charts/MonthlyVisitsChart'
import { WeeklyVisitsChart } from '@/components/charts/WeeklyVisitsChart'
import { ActionsBreakdownChart } from '@/components/charts/ActionsBreakdownChart'
import { ResponsesPieChart } from '@/components/charts/ResponsesPieChart'
import { PeriodFilter } from '@/components/PeriodFilter'
import { getSessionUser } from '@/lib/auth'
import { getPredictiveAlerts } from '@/lib/alertsEngine'
import { AlertsDashboard } from '@/components/AlertsDashboard'
import TareasPendientes from '@/components/TareasPendientes'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { areZonasEqual } from '@/lib/zonaUtils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ zonaName: string }>, searchParams: Promise<{ period?: string, vendedor?: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)
  
  const { period, vendedor } = await searchParams
  const currentPeriod = period || String(new Date().getMonth())

  const modules = typeof user.modulos === 'string' ? JSON.parse(user.modulos) : (user.modulos || {})
  if (modules.zonas === false) {
    if (modules.pedidos) redirect('/pedidos')
    if (modules.ventas) redirect('/ventas')
    if (modules.cobranzas) redirect('/cobranzas')
    if (modules.usuarios) redirect('/usuarios')
    if (modules.configuracion) redirect('/configuracion')
    redirect('/configuracion/productos')
  }

  // Verify access permissions to this zone
  if (user.nivel === 3 && !areZonasEqual(user.zona, decodedZona)) {
    if (user.zona && !areZonasEqual(user.zona, decodedZona)) {
      redirect(`/zonas/${encodeURIComponent(user.zona)}`)
    } else if (!user.zona && decodedZona !== 'CABA') {
      redirect('/zonas/CABA')
    }
  } else if (user.nivel === 2) {
    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = typeof user.zonasHabilitadas === 'string'
          ? JSON.parse(user.zonasHabilitadas)
          : JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    // If they have no zones enabled or the Zonas module is disabled
    if (enabledZones.length === 0 || modules.zonas === false) {
      if (modules.pedidos) redirect('/pedidos')
      if (modules.ventas) redirect('/ventas')
      if (modules.cobranzas) redirect('/cobranzas')
      if (modules.usuarios) redirect('/usuarios')
      if (modules.configuracion) redirect('/configuracion')
      redirect('/configuracion/productos')
    }

    const hasAccess = enabledZones.some(ez => areZonasEqual(ez, decodedZona))
    if (!hasAccess && enabledZones.length > 0) {
      redirect(`/zonas/${enabledZones[0] || 'CABA'}`)
    }
  }

  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  let currentTenant = null
  if (tenantSlug) {
    currentTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })
  } else if (user.tenantId) {
    currentTenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId }
    })
  } else {
    currentTenant = await prisma.tenant.findFirst({
      where: { slug: 'golocinas' }
    })
  }
  const currentTenantId = currentTenant?.id || 1

  const isVendedor = user.nivel === 3
  const userAlias = isVendedor ? user.alias : vendedor
  const hasVendedorFilter = Boolean(userAlias)

  const whereEmpresa: any = {
    tenantId: currentTenantId,
    zona: { equals: decodedZona, mode: 'insensitive' },
    ...(hasVendedorFilter ? { vendedorAsignado: { equals: userAlias, mode: 'insensitive' } } : {})
  }
  const whereAccion: any = {
    empresa: {
      tenantId: currentTenantId,
      zona: { equals: decodedZona, mode: 'insensitive' },
      ...(hasVendedorFilter ? { vendedorAsignado: { equals: userAlias, mode: 'insensitive' } } : {})
    }
  }
  const whereVisita: any = {
    empresa: {
      tenantId: currentTenantId,
      zona: { equals: decodedZona, mode: 'insensitive' },
      ...(hasVendedorFilter ? { vendedorAsignado: { equals: userAlias, mode: 'insensitive' } } : {})
    }
  }

  const totalEmpresas = await prisma.empresa.count({ where: whereEmpresa })
  const empresasProspecto = await prisma.empresa.count({ where: { estado: 'prospecto', ...whereEmpresa } })
  const empresasClientes = await prisma.empresa.count({ where: { estado: 'activo', ...whereEmpresa } })
  const accionesPendientes = await prisma.accion.count({ where: { estado: 'pendiente', ...whereAccion } })

  const predicAlerts = await getPredictiveAlerts({
    usuarioNivel: hasVendedorFilter ? 3 : user.nivel,
    vendedorAlias: userAlias,
    zona: decodedZona
  })

  // Efectividad: nuevos clientes este mes / empresas contactadas este mes × 100
  const now = new Date()
  let startOfMonth: Date | undefined = new Date(now.getFullYear(), now.getMonth(), 1)
  let endOfMonth: Date | undefined = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  let labelPeriodo = "este mes"

  if (currentPeriod === 'todo') {
    startOfMonth = new Date(2000, 0, 1)
    endOfMonth = new Date(2100, 11, 31)
    labelPeriodo = "en el historial completo"
  } else if (currentPeriod === 'hoy') {
    startOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    endOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    labelPeriodo = "hoy"
  } else if (currentPeriod === 'semana') {
    startOfMonth = new Date(now)
    startOfMonth.setDate(startOfMonth.getDate() - 7)
    startOfMonth.setHours(0, 0, 0, 0)
    endOfMonth = new Date(now)
    endOfMonth.setHours(23, 59, 59, 999)
    labelPeriodo = "en los últimos 7 días"
  } else if (currentPeriod.startsWith('Q')) {
    const q = parseInt(currentPeriod.charAt(1))
    startOfMonth = new Date(now.getFullYear(), (q - 1) * 3, 1)
    endOfMonth = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59)
    labelPeriodo = `en Q${q}`
  } else if (currentPeriod.includes(',')) {
    const months = currentPeriod.split(',').map(Number)
    const minMonth = Math.min(...months)
    const maxMonth = Math.max(...months)
    startOfMonth = new Date(now.getFullYear(), minMonth, 1)
    endOfMonth = new Date(now.getFullYear(), maxMonth + 1, 0, 23, 59, 59)
    labelPeriodo = `en los meses seleccionados`
  } else {
    const m = parseInt(currentPeriod)
    if (!isNaN(m)) {
      startOfMonth = new Date(now.getFullYear(), m, 1)
      endOfMonth = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
      const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
      labelPeriodo = `en ${monthNames[m]}`
    }
  }

  const visitasMesQuery = await prisma.visita.findMany({
    where: { 
      fecha: { gte: startOfMonth, lte: endOfMonth },
      ...whereVisita
    },
    select: { empresaId: true },
    distinct: ['empresaId']
  })
  const empresasContactadasMes = visitasMesQuery.length

  // Para saber nuevos clientes, contamos las empresas activas cuya primera visita de venta fue este mes
  const activasParaEfectividad = await prisma.empresa.findMany({
    where: { 
      estado: 'activo',
      ...whereEmpresa
    },
    include: {
      visitas: {
        where: { resultado: 'venta' },
        orderBy: { fecha: 'asc' },
        take: 1
      }
    }
  })
  
  let nuevosClientesMes = 0
  for (const emp of activasParaEfectividad) {
    const primeraVenta = emp.visitas[0]
    const fechaAlta = primeraVenta ? new Date(primeraVenta.fecha) : new Date(emp.creadoEn)
    if (startOfMonth && endOfMonth && fechaAlta >= startOfMonth && fechaAlta <= endOfMonth) {
      nuevosClientesMes++
    }
  }

  const universoObjetivo = empresasProspecto + empresasClientes
  const efectividad = universoObjetivo > 0
    ? Math.round((empresasClientes / universoObjetivo) * 100)
    : null

  // Last 5 companies added or updated
  const recientes = await prisma.empresa.findMany({
    where: whereEmpresa,
    take: 5,
    orderBy: { actualizadoEn: 'desc' }
  })

  // Visitas programadas para hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const visitasDeHoy = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      fechaVencimiento: {
        gte: today,
        lt: tomorrow
      },
      ...whereAccion
    },
    include: {
      empresa: true
    },
    orderBy: [
      { orden: 'asc' },
      { id: 'asc' }
    ]
  })

  const proximaSemana = new Date(today)
  proximaSemana.setDate(proximaSemana.getDate() + 7)

  const visitasDeLaSemana = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      tipo: 'visita_programada',
      fechaVencimiento: {
        gte: tomorrow,
        lt: proximaSemana
      },
      ...whereAccion
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  })

  // Obtener visitas registradas hoy (ejecutadas/reprogramadas)
  const visitasEjecutadasHoy = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: today,
        lt: tomorrow
      },
      ...whereVisita
    }
  })

  // Acciones en estado 'visitada' (marcadas en campo, pendientes de registrar resultado)
  const accionesVisitadas = await prisma.accion.findMany({
    where: {
      estado: 'visitada',
      ...whereAccion
    },
    include: { empresa: { select: { id: true, nombre: true } } },
    orderBy: { id: 'asc' }
  })

  // Acciones completadas HOY (historial del día)
  const accionesCompletadasHoy = await prisma.accion.findMany({
    where: {
      estado: 'completada',
      completadaEn: { gte: today, lt: tomorrow },
      ...whereAccion
    },
    include: { empresa: { select: { id: true, nombre: true } } },
    orderBy: { completadaEn: 'desc' }
  })

  const reprogramadasCount = visitasEjecutadasHoy.filter(v => v.resultado.toLowerCase().includes('reprogram')).length
  const atendidasCount = visitasEjecutadasHoy.length - reprogramadasCount

  const dailyBreakdown = {
    visitas: visitasEjecutadasHoy.filter(v => v.tipo === 'visita' || v.tipo === 'visita_programada' || !v.tipo).length,
    whatsapp: visitasEjecutadasHoy.filter(v => v.tipo === 'whatsapp').length,
    correo: visitasEjecutadasHoy.filter(v => v.tipo === 'correo').length,
    llamada: visitasEjecutadasHoy.filter(v => v.tipo === 'llamada').length
  }

  // Obtener visitas del año en curso para el gráfico mensual
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const visitasEsteAño = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: startOfYear
      },
      ...whereVisita
    },
    select: {
      fecha: true,
      tipo: true,
      respuestaObtenida: true
    }
  })

  // Obtener visitas de la semana en curso (Lunes a Domingo)
  const startOfWeek = new Date(today)
  const dayOfWeek = startOfWeek.getDay()
  const diffToMonday = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Lunes
  startOfWeek.setDate(diffToMonday)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const visitasSemana = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: startOfWeek,
        lt: endOfWeek
      },
      ...whereVisita
    }
  })

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const weeklyData = daysOfWeek.map((dayName, idx) => {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + idx)
    const dayVisitas = visitasSemana.filter(v => {
      const vf = new Date(v.fecha)
      return vf.getDate() === d.getDate() && vf.getMonth() === d.getMonth() && vf.getFullYear() === d.getFullYear()
    })
    return { 
      name: dayName, 
      visitas: dayVisitas.filter(v => v.tipo === 'visita' || v.tipo === 'visita_programada' || !v.tipo).length,
      whatsapp: dayVisitas.filter(v => v.tipo === 'whatsapp').length,
      correo: dayVisitas.filter(v => v.tipo === 'correo').length,
      llamada: dayVisitas.filter(v => v.tipo === 'llamada').length
    }
  })

  // ── Nuevos: primer venta en ese mes (este año)
  const clientesActivosTodos = await prisma.empresa.findMany({
    where: { 
      estado: 'activo',
      ...whereEmpresa
    },
    include: {
      visitas: {
        where: { resultado: 'venta' },
        orderBy: { fecha: 'asc' },
        take: 1
      }
    }
  })

  const nuevosPorMes = Array(12).fill(0)
  for (const emp of clientesActivosTodos) {
    const primerVenta = emp.visitas[0]
    const fechaAlta = primerVenta ? new Date(primerVenta.fecha) : new Date(emp.creadoEn)
    if (fechaAlta.getFullYear() === today.getFullYear()) {
      nuevosPorMes[fechaAlta.getMonth()]++
    }
  }

  // ── Activos: acumulado de clientes activos en cada mes
  //    Un cliente es ACTIVO en el mesIdx si su primer venta fue en un mes ANTERIOR
  //    Persiste mes a mes hasta que se marque como BAJA (manualmente)
  const currentYear = today.getFullYear()

  const activosPorMes = Array(12).fill(0)
  for (let mesIdx = 0; mesIdx < 12; mesIdx++) {
    for (const emp of clientesActivosTodos) {
      const primerVenta = emp.visitas[0]
      const fechaAlta = primerVenta ? new Date(primerVenta.fecha) : new Date(emp.creadoEn)
      const altaAno = fechaAlta.getFullYear()
      const altaMes = fechaAlta.getMonth()

      // Activo en mesIdx si: se convirtió en cliente en un año anterior
      // O se convirtió en cliente este año pero en un mes anterior al mesIdx
      const yaEraClienteAntes =
        altaAno < currentYear ||
        (altaAno === currentYear && altaMes < mesIdx)

      if (yaEraClienteAntes) {
        activosPorMes[mesIdx]++
      }
    }
  }


  // ── Bajas: empresas dadas de baja ese mes (usando actualizadoEn como fecha de baja)
  const empresasBaja = await prisma.empresa.findMany({
    where: { 
      estado: 'baja',
      ...whereEmpresa
    },
    select: { actualizadoEn: true }
  })

  const bajasPorMes = Array(12).fill(0)
  for (const emp of empresasBaja) {
    const fechaRef = new Date(emp.actualizadoEn)
    if (fechaRef.getFullYear() === today.getFullYear()) {
      bajasPorMes[fechaRef.getMonth()]++
    }
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const monthlyData = months.map((month, idx) => ({
    month,
    visitas: visitasEsteAño.filter(v => v.fecha.getMonth() === idx).length,
    nuevos:  nuevosPorMes[idx],
    activos: activosPorMes[idx],
    bajas:   bajasPorMes[idx]
  }))

  const actionsBreakdownData = months.map((month, idx) => {
    const visitsInMonth = visitasEsteAño.filter(v => v.fecha.getMonth() === idx)
    return {
      month,
      visitas: visitsInMonth.filter(v => v.tipo === 'visita' || v.tipo === 'visita_programada' || !v.tipo).length,
      whatsapp: visitsInMonth.filter(v => v.tipo === 'whatsapp').length,
      correos: visitsInMonth.filter(v => v.tipo === 'correo').length,
      llamadas: visitsInMonth.filter(v => v.tipo === 'llamada').length
    }
  })

  const visitasPeriodo = visitasEsteAño.filter(v => v.fecha >= startOfMonth && v.fecha <= endOfMonth)
  const conRespuestaCount = visitasPeriodo.filter(v => v.respuestaObtenida).length
  const sinRespuestaCount = visitasPeriodo.length - conRespuestaCount


  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen de actividad y métricas clave.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-0">
          <PeriodFilter />
          <Link href="/empresas/nueva" className="btn btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">Nueva Empresa</span>
          </Link>
        </div>
      </div>

      {/* Alertas de Inteligencia (50%) + Tareas Pendientes (50%) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
        {/* Alertas — lado izquierdo */}
        <div>
          <AlertsDashboard alerts={predicAlerts} zonaName={encodeURIComponent(decodedZona)} />
        </div>
        {/* Tareas Pendientes — lado derecho */}
        <TareasPendientes
          tareasVisitadas={accionesVisitadas.map(a => ({
            id: a.id,
            empresaId: a.empresaId,
            empresaNombre: a.empresa.nombre,
            tipo: a.tipo,
            descripcion: a.descripcion,
          }))}
          tareasCompletadasHoy={accionesCompletadasHoy.map(a => ({
            id: a.id,
            empresaId: a.empresaId,
            empresaNombre: a.empresa.nombre,
            tipo: a.tipo,
            descripcion: a.descripcion,
            completadaEn: a.completadaEn,
          }))}
          zonaName={encodeURIComponent(decodedZona)}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="glass-panel card" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Total Empresas</span>
            <div className="badge badge-info" style={{ padding: '0.15rem 0.4rem' }}><Building2 size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{totalEmpresas}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Registradas</div>
        </div>
        
        <div className="glass-panel card delay-100" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Potenciales</span>
            <div className="badge badge-warning" style={{ padding: '0.15rem 0.4rem' }}><Briefcase size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{empresasProspecto}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>En seguimiento</div>
        </div>

        <div className="glass-panel card delay-150" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Clientes</span>
            <div className="badge badge-success" style={{ padding: '0.15rem 0.4rem' }}><Building2 size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{empresasClientes}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Clientes activos</div>
        </div>
        
        <div className="glass-panel card delay-200" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Acciones</span>
            <div className="badge badge-danger" style={{ padding: '0.15rem 0.4rem' }}><Clock size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{accionesPendientes}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Pendientes</div>
        </div>
        
        <div className="glass-panel card delay-300" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Efectividad</span>
            <div className="badge badge-success" style={{ padding: '0.15rem 0.4rem' }}><CheckCircle size={12} /></div>
          </div>
          <div className="flex items-end gap-2" style={{ marginBottom: '0.25rem' }}>
            <div className="stat-value text-accent" style={{ fontSize: '1.75rem', lineHeight: '1' }}>
              {efectividad !== null ? `${efectividad}%` : '0%'}
            </div>
            {nuevosClientesMes > 0 && (
              <span className="text-green-400 font-medium text-xs mb-1">
                +{nuevosClientesMes} {labelPeriodo.replace('en ', '')}
              </span>
            )}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
            {`${empresasClientes} cliente(s) de ${universoObjetivo} objetivo`}
          </div>
        </div>
      </div>

      {/* Row: Planificador Diario and Planificador Semanal (50% each) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Planificador de Hoy */}
        <div className="glass-panel card delay-200" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Planificador de Hoy</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Visitas programadas para hoy ({visitasDeHoy.length}).</p>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visitasDeHoy.length === 0 ? (
              <div className="flex flex-col gap-4 items-center justify-center h-full" style={{ minHeight: '200px', opacity: 0.5 }}>
                <MapPin size={48} />
                <p>No hay visitas programadas para hoy.</p>
                <Link href={`/zonas/${zonaName}/planificador`} className="btn btn-secondary flex items-center justify-center gap-2">
                  <MapPin size={16} /> <span className="hidden sm:inline">Ir al Planificador</span>
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {visitasDeHoy.map((visita, index) => {
                    const emoji = visita.tipo === 'whatsapp' ? '💬' : visita.tipo === 'correo' ? '📧' : visita.tipo === 'llamada' ? '📞' : '🏢'
                    return (
                      <div key={visita.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', flexShrink: 0 }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Link href={`/zonas/${zonaName}/empresas/${visita.empresaId}`} style={{ fontWeight: 500, fontSize: '0.875rem', color: 'white', display: 'block' }}>
                            {emoji} {visita.empresa.nombre}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {visita.empresa.zona || 'Sin Zona'} • {visita.empresa.barrio || 'Sin Localidad'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Link href={`/zonas/${zonaName}/planificador?vista=hoy`} className="btn btn-primary flex items-center justify-center gap-2" style={{ width: '100%' }}>
                    <MapPin size={16} /> <span className="hidden sm:inline">Ir a la Ruta Completa</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ruta de la Semana */}
        <div className="glass-panel card delay-250" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Ruta de la Semana</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Próximos 7 días ({visitasDeLaSemana.length} planificadas).</p>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visitasDeLaSemana.length === 0 ? (
              <div className="flex flex-col gap-4 items-center justify-center h-full" style={{ minHeight: '200px', opacity: 0.5 }}>
                <CalendarIcon size={48} />
                <p>No hay visitas planificadas para los próximos días.</p>
                <Link href={`/zonas/${zonaName}/planificador?vista=semana`} className="btn btn-secondary flex items-center justify-center gap-2">
                  <Calendar size={16} /> <span className="hidden sm:inline">Planificar Semana</span>
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {Object.entries(
                    visitasDeLaSemana.reduce((acc, visita) => {
                      const dateKey = visita.fechaVencimiento!.toISOString().split('T')[0]
                      if (!acc[dateKey]) acc[dateKey] = []
                      acc[dateKey].push(visita)
                      return acc
                    }, {} as Record<string, typeof visitasDeLaSemana>)
                  ).sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                  .map(([dateKey, visitas]) => {
                    const dateObj = new Date(dateKey + 'T12:00:00Z')
                    return (
                      <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                        {visitas.map((visita) => (
                          <div key={visita.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <Link href={`/zonas/${zonaName}/empresas/${visita.empresaId}`} style={{ fontWeight: 500, fontSize: '0.875rem', color: 'white', display: 'block' }}>
                                {visita.empresa.nombre}
                              </Link>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {visita.empresa.zona || 'Sin Zona'} • {visita.empresa.barrio || 'Sin Localidad'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Link href={`/zonas/${zonaName}/planificador?vista=semana`} className="btn btn-primary flex items-center justify-center gap-2" style={{ width: '100%' }}>
                    <Calendar size={16} /> <span className="hidden sm:inline">Ver Planificador Completo</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Charts (Daily 30% and Weekly 70%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mt-6">
        <div className="glass-panel card delay-300 lg:col-span-3 flex flex-col">
          <h3 className="card-title">Estado de Ruta Diaria</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Progreso de hoy</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DailyRouteChart 
              planificadas={visitasDeHoy.length} 
              atendidas={atendidasCount} 
              reprogramadas={reprogramadasCount} 
              breakdown={dailyBreakdown}
            />
          </div>
        </div>

        <div className="glass-panel card delay-350 lg:col-span-7 flex flex-col">
          <h3 className="card-title">Visitas de la Semana</h3>
          <p className="card-subtitle mb-6">Visitas realizadas en los últimos 7 días</p>
          <div className="flex-1 flex items-center justify-center">
            <WeeklyVisitsChart data={weeklyData} />
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="glass-panel card mt-6">
        <h3 className="card-title flex items-center gap-2">
          <BarChart2 size={18} /> GESTION Mensual
        </h3>
        <p className="card-subtitle mb-6">Rendimiento anual del {today.getFullYear()}</p>
        <MonthlyVisitsChart data={monthlyData} />
      </div>

      {/* Row: Breakdown and Responses (50% each) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass-panel card flex flex-col">
          <h3 className="card-title">Desglose de Acciones</h3>
          <p className="card-subtitle mb-6">Visitas, WhatsApp, Correos y Llamadas realizadas este año</p>
          <div className="flex-1 flex items-center justify-center">
            <ActionsBreakdownChart data={actionsBreakdownData} />
          </div>
        </div>

        <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Acciones vs. Respuestas</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Acciones con respuesta vs. sin respuesta ({labelPeriodo})</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsesPieChart conRespuesta={conRespuestaCount} sinRespuesta={sinRespuestaCount} />
          </div>
        </div>
      </div>

      {/* Actualizaciones Recientes */}
      <div className="glass-panel card delay-100 mt-6">
        <h3 className="card-title">Actualizaciones Recientes</h3>
        <p className="card-subtitle">Las últimas fichas modificadas.</p>
        
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Zona</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 500 }}>{emp.nombre}</td>
                  <td>{emp.zona || '-'}</td>
                  <td>
                    <span className={`badge ${emp.estado === 'prospecto' ? 'badge-warning' : emp.estado === 'activo' ? 'badge-success' : 'badge-neutral'}`}>{emp.estado === 'prospecto' ? 'potencial' : emp.estado}</span>
                  </td>
                  <td>{new Date(emp.actualizadoEn).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/zonas/${zonaName}/empresas/${emp.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No hay empresas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
