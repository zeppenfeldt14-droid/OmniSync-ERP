'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Banknote, Globe, AlertTriangle, CheckCircle2, Clock,
  DollarSign, X, RefreshCw, CreditCard, Wallet, Building2,
  FileText, ChevronDown, ChevronUp, History, Eye, Calendar, Calculator,
  ThumbsUp, ThumbsDown
} from 'lucide-react'
import { PedidoDetalleModal } from '@/components/PedidoDetalleModal'
import { formatDate } from '@/lib/date'
import { useTenant } from '@/lib/tenantContext'

interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
  availableZones: string[]
}

interface Pago {
  id: number
  monto: number
  metodoPago: string
  recargoAplicado: number
  montoFinal: number
  referencia: string | null
  notas: string | null
  registradoPorAlias: string
  creadoEn: string
}

interface Cobranza {
  id: number
  empresaNombre: string
  vendedorAlias: string
  zona: string
  montoOriginal: number
  saldoPendiente: number
  cuota: number
  totalCuotas: number
  fechaVencimiento: string | null
  estado: string
  diasAtraso: number | null
  pedidoId: number
  pedido: { numeroPedido: string; condicionPago: string | null; plazosPago: string | null }
  pagos: Pago[]
}

const ESTADOS_COBRANZA = [
  { key: 'todos',     label: 'Todos',      color: 'text-secondary' },
  { key: 'pendiente', label: 'Pendiente',  color: 'text-yellow-400' },
  { key: 'vencida',   label: 'Vencida',    color: 'text-red-400' },
  { key: 'parcial',   label: 'Parcial',    color: 'text-blue-400' },
  { key: 'pagada',    label: 'Pagada',     color: 'text-green-400' },
]

const ESTADO_BADGES: Record<string, string> = {
  pendiente: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  vencida:   'bg-red-400/10 text-red-400 border-red-400/20',
  parcial:   'bg-blue-400/10 text-blue-400 border-blue-400/20',
  pagada:    'bg-green-400/10 text-green-400 border-green-400/20',
}

const METODOS_PAGO = [
  { key: 'efectivo',      label: 'Efectivo (Remito/Fact. B)', icon: Wallet,   recargo: false },
  { key: 'transferencia', label: 'Transferencia',              icon: CreditCard, recargo: false },
  { key: 'cheque',        label: 'Cheque',                     icon: FileText,  recargo: false },
  { key: 'financiera',    label: 'Financiera (+3% recargo)',   icon: Building2, recargo: true },
]

export function CobranzasPageClient({ userNivel, userAlias, userZona, availableZones }: Props) {
  const { terminology } = useTenant()
  const [selectedZone, setSelectedZone] = useState<string>(userNivel === 3 ? (userZona || '') : 'todas')
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [cobranzas, setCobranzas] = useState<Cobranza[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [aprobaciones, setAprobaciones] = useState<any[]>([])
  const [fetchingAprobaciones, setFetchingAprobaciones] = useState(false)

  const [selectedPedidoDetalle, setSelectedPedidoDetalle] = useState<any | null>(null)
  const [isFetchingPedido, setIsFetchingPedido] = useState<number | null>(null)

  const fetchDetallePedido = async (pedidoId: number) => {
    setIsFetchingPedido(pedidoId)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPedidoDetalle(data)
      } else {
        alert('Error al obtener el detalle del pedido.')
      }
    } catch (e) {
      console.error(e)
      alert('Error de red al cargar el pedido.')
    } finally {
      setIsFetchingPedido(null)
    }
  }

  // Modal pago
  const [pagoModal, setPagoModal] = useState<Cobranza | null>(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState('efectivo')
  const [pagoRef, setPagoRef] = useState('')
  const [pagoNotas, setPagoNotas] = useState('')
  const [pagoLoading, setPagoLoading] = useState(false)
  const [pagoError, setPagoError] = useState('')
  const [pagoSuccess, setPagoSuccess] = useState('')

  // Modal prorroga
  const [prorrogaModal, setProrrogaModal] = useState<Cobranza | null>(null)
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [prorrogaLoading, setProrrogaLoading] = useState(false)

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const fetchCobranzas = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedZone && selectedZone !== 'todas') params.set('zona', selectedZone)
    if (selectedEstado !== 'todos') params.set('estado', selectedEstado)
    const res = await fetch(`/api/cobranzas?${params.toString()}`)
    const data = await res.json()
    const sorted = Array.isArray(data) ? data.sort((a, b) => {
      if (a.estado === 'pagada' && b.estado !== 'pagada') return 1
      if (a.estado !== 'pagada' && b.estado === 'pagada') return -1
      const dateA = a.fechaVencimiento ? new Date(a.fechaVencimiento).getTime() : 0
      const dateB = b.fechaVencimiento ? new Date(b.fechaVencimiento).getTime() : 0
      return dateA - dateB
    }) : []
    setCobranzas(sorted)
    setLoading(false)
  }, [selectedZone, selectedEstado])

  const fetchAprobaciones = useCallback(async () => {
    if (userNivel > 2) return
    setFetchingAprobaciones(true)
    try {
      const res = await fetch('/api/cobranzas/aprobaciones')
      if (res.ok) {
        const data = await res.json()
        setAprobaciones(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFetchingAprobaciones(false)
    }
  }, [userNivel])

  const handleProcesarAprobacion = async (solId: number, decision: 'aprobar' | 'rechazar') => {
    if (!confirm(`¿Estás seguro de que deseas ${decision === 'aprobar' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) return
    try {
      const res = await fetch(`/api/cobranzas/aprobaciones/${solId}/procesar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      })
      if (res.ok) {
        alert(`Solicitud ${decision === 'aprobar' ? 'aprobada' : 'rechazada'} con éxito.`)
        await fetchAprobaciones()
        await fetchCobranzas()
      } else {
        const d = await res.json()
        alert(d.error || 'Error al procesar')
      }
    } catch {
      alert('Error de conexión')
    }
  }

  useEffect(() => {
    fetchCobranzas()
    fetchAprobaciones()
  }, [fetchCobranzas, fetchAprobaciones])

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const deudaTotal    = cobranzas.reduce((s, c) => s + c.saldoPendiente, 0)
  const vencidas      = cobranzas.filter(c => c.diasAtraso !== null && c.diasAtraso > 0 && c.estado !== 'pagada')
  const deudaVencida  = vencidas.reduce((s, c) => s + c.saldoPendiente, 0)
  const por7dias      = cobranzas.filter(c => {
    if (!c.fechaVencimiento || c.estado === 'pagada') return false
    const diff = (new Date(c.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  })
  const pagadasMes    = cobranzas.filter(c => {
    if (c.estado !== 'pagada') return false
    const mes = new Date().getMonth()
    return new Date(c.pagos?.[0]?.creadoEn || 0).getMonth() === mes
  })
  const cobradoMes    = pagadasMes.reduce((s, c) => s + (c.pagos[0]?.montoFinal || 0), 0)

  // ─── Pago modal handlers ─────────────────────────────────────────────────
  const openPagoModal = (c: Cobranza) => {
    setPagoModal(c)
    setPagoMonto(c.saldoPendiente.toFixed(2))
    setPagoMetodo('efectivo')
    setPagoRef('')
    setPagoNotas('')
    setPagoError('')
    setPagoSuccess('')
  }

  const handleRegistrarPago = async () => {
    if (!pagoModal) return
    const monto = parseFloat(pagoMonto)
    if (isNaN(monto) || monto <= 0) { setPagoError('Ingresá un monto válido'); return }
    if (monto > pagoModal.saldoPendiente + 0.01) {
      setPagoError(`El monto no puede superar el saldo ($${pagoModal.saldoPendiente.toFixed(2)})`)
      return
    }

    if (userNivel === 3 && monto < pagoModal.saldoPendiente - 0.01) {
      const justificativo = prompt('Por favor, indica y justifica el motivo de este pago parcial:')
      if (!justificativo) return
      setPagoLoading(true)
      setPagoError('')
      try {
        const res = await fetch('/api/cobranzas/solicitar-aprobacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cobranzaId: pagoModal.id,
            tipo: 'PAGO_COBRANZA',
            valor: JSON.stringify({ monto, metodoPago: pagoMetodo, referencia: pagoRef, notas: pagoNotas }),
            justificativo
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        setPagoSuccess('Solicitud de pago parcial enviada correctamente para aprobación.')
        await fetchCobranzas()
        setTimeout(() => {
          setPagoModal(null)
          setPagoSuccess('')
        }, 2500)
      } catch (e: any) {
        setPagoError(e.message || 'Error al enviar solicitud de pago parcial')
      } finally {
        setPagoLoading(false)
      }
      return
    }

    setPagoLoading(true)
    setPagoError('')
    try {
      const res = await fetch(`/api/cobranzas/${pagoModal.id}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, metodoPago: pagoMetodo, referencia: pagoRef, notas: pagoNotas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const recargoMsg = data.recargoAplicado > 0 ? ` (incluye +3% financiera: ${fmt(data.recargoAplicado)})` : ''
      setPagoSuccess(`Pago registrado correctamente.${recargoMsg} Saldo restante: ${fmt(data.nuevoSaldo)}`)
      await fetchCobranzas()

      setTimeout(() => {
        setPagoModal(null)
        setPagoSuccess('')
      }, 2500)
    } catch (e: any) {
      setPagoError(e.message || 'Error al registrar el pago')
    } finally {
      setPagoLoading(false)
    }
  }

  // Derived for modal
  const montoNum = parseFloat(pagoMonto) || 0
  const recargoPreview = pagoMetodo === 'financiera' ? montoNum * 0.03 : 0
  const totalPreview = montoNum + recargoPreview

  const counts = {
    todos:     cobranzas.length,
    pendiente: cobranzas.filter(c => c.estado === 'pendiente').length,
    vencida:   cobranzas.filter(c => c.estado === 'vencida' || (c.diasAtraso !== null && c.diasAtraso > 0 && c.estado !== 'pagada')).length,
    parcial:   cobranzas.filter(c => c.estado === 'parcial').length,
    pagada:    cobranzas.filter(c => c.estado === 'pagada').length,
  }

  const handleProrrogar = async () => {
    if (!prorrogaModal || !nuevaFecha) return

    if (userNivel === 3) {
      const justificativo = prompt('Por favor, indica y justifica el motivo del cambio de fecha de vencimiento (Prórroga):')
      if (!justificativo) return
      setProrrogaLoading(true)
      try {
        const res = await fetch('/api/cobranzas/solicitar-aprobacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cobranzaId: prorrogaModal.id,
            tipo: 'VENCIMIENTO_COBRANZA',
            valor: new Date(nuevaFecha).toISOString(),
            justificativo
          })
        })
        if (res.ok) {
          alert('Solicitud de prórroga enviada correctamente para aprobación del supervisor.')
          setProrrogaModal(null)
          setNuevaFecha('')
          fetchCobranzas()
        } else {
          const d = await res.json()
          alert(d.error || 'Error al solicitar prórroga')
        }
      } catch (e) {
        alert('Error de conexión')
      } finally {
        setProrrogaLoading(false)
      }
      return
    }

    setProrrogaLoading(true)
    try {
      const res = await fetch(`/api/cobranzas/${prorrogaModal.id}/prorroga`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaVencimiento: new Date(nuevaFecha).toISOString() })
      })
      if (res.ok) {
        setProrrogaModal(null)
        setNuevaFecha('')
        fetchCobranzas()
      } else {
        alert('Error al aplicar prórroga')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setProrrogaLoading(false)
    }
  }

  const handleDividirCuotas = async (c: Cobranza) => {
    const cantStr = prompt('¿En cuántas cuotas deseas dividir el saldo restante de esta deuda? (Ingresa un número entre 2 y 12):')
    if (!cantStr) return
    const cant = parseInt(cantStr)
    if (isNaN(cant) || cant < 2 || cant > 12) {
      alert('Por favor ingresa un número de cuotas válido (entre 2 y 12).')
      return
    }

    const justificativo = prompt('Indica el motivo o justificación de este fraccionamiento en cuotas:')
    if (!justificativo) return

    if (userNivel === 3) {
      try {
        const res = await fetch('/api/cobranzas/solicitar-aprobacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cobranzaId: c.id,
            tipo: 'CUOTAS_COBRANZA',
            valor: String(cant),
            justificativo
          })
        })
        if (res.ok) {
          alert('Solicitud de división en cuotas enviada correctamente para aprobación del supervisor.')
          fetchCobranzas()
        } else {
          const d = await res.json()
          alert(d.error || 'Error al solicitar división')
        }
      } catch (e) {
        alert('Error de conexión')
      }
    } else {
      if (confirm(`¿Estás seguro de dividir la deuda de $${c.saldoPendiente} en ${cant} cuotas?`)) {
        try {
          const resSol = await fetch('/api/cobranzas/solicitar-aprobacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cobranzaId: c.id,
              tipo: 'CUOTAS_COBRANZA',
              valor: String(cant),
              justificativo: 'División directa por Supervisor/Admin: ' + justificativo
            })
          })
          if (resSol.ok) {
            const dataSol = await resSol.json()
            const solId = dataSol.solicitud.id
            const resProc = await fetch(`/api/cobranzas/aprobaciones/${solId}/procesar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decision: 'aprobar' })
            })
            if (resProc.ok) {
              alert(`La deuda ha sido dividida exitosamente en ${cant} cuotas.`)
              fetchCobranzas()
            } else {
              alert('Error al aplicar la división')
            }
          } else {
            alert('Error al iniciar la división')
          }
        } catch {
          alert('Error de red')
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Banknote className="text-yellow-400" size={26} />
            {terminology.cobranzas}
          </h1>
          <p className="text-secondary text-sm mt-1">
            {userNivel === 3
              ? `Zona ${userZona} · Mis cuentas y ${terminology.cobranzas.toLowerCase()}`
              : `Cartera de ${terminology.cobranzas.toLowerCase()} consolidada por zona`}
          </p>
        </div>
      </div>

      {/* Zone & Status Filters (50/50 Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zone Filter */}
        {userNivel < 3 ? (
          <div className="glass-panel card p-4 flex flex-col gap-3 border border-white/5">
            <div className="flex items-center gap-2 text-secondary text-sm font-semibold">
              <Globe size={15} />
              <span>Zona:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedZone('todas')}
                className={`btn-toggle ${selectedZone === 'todas' ? 'active' : ''}`}
              >
                Todas las Zonas
              </button>
              {availableZones.map(z => (
                <button
                  key={z}
                  onClick={() => setSelectedZone(z)}
                  className={`btn-toggle ${selectedZone === z ? 'active' : ''}`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        ) : <div />}

        {/* Status Filter */}
        <div className="glass-panel card p-4 flex flex-col gap-3 border border-white/5">
          <div className="flex items-center gap-2 text-secondary text-sm font-semibold">
            <CheckCircle2 size={15} />
            <span>Estado:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ESTADOS_COBRANZA.map(e => (
              <button
                key={e.key}
                onClick={() => setSelectedEstado(e.key)}
                className={`btn-toggle ${selectedEstado === e.key ? 'active' : ''} flex items-center gap-1`}
              >
                {e.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  selectedEstado === e.key ? 'bg-primary/30 text-white' : 'bg-white/5 text-secondary'
                }`}>
                  {counts[e.key as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Deuda Total',       value: fmt(deudaTotal),   icon: DollarSign,    color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Deuda Vencida',     value: fmt(deudaVencida), icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-400/10' },
          { label: 'Por Vencer (7d)',   value: por7dias.length,   icon: Clock,         color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Cobrado este mes',  value: fmt(cobradoMes),   icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-400/10' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel card p-4 flex items-center gap-4 border border-white/5">
            <div className={`${kpi.bg} p-3 rounded-xl flex-shrink-0`}>
              <kpi.icon className={kpi.color} size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-secondary text-xs font-semibold">{kpi.label}</p>
              <p className="text-white text-sm font-black truncate">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert vencidas */}
      {vencidas.length > 0 && (
        <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/20 flex items-center gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
          <p className="text-red-400 text-sm font-semibold">
            <strong>{vencidas.length}</strong> cobranza{vencidas.length !== 1 ? 's' : ''} vencida{vencidas.length !== 1 ? 's' : ''} por un total de <strong>{fmt(deudaVencida)}</strong>
          </p>
        </div>
      )}

      {/* Solicitudes de Aprobación de Cobros/Plazos */}
      {userNivel < 3 && aprobaciones.length > 0 && (
        <div className="glass-panel card p-4 border border-yellow-400/20 bg-yellow-400/[0.02] flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="text-yellow-400 font-black text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> Solicitudes de Cobros/Plazos por Aprobar
            </h3>
            {fetchingAprobaciones && <span className="text-[10px] text-secondary">Cargando...</span>}
          </div>
          <div className="flex flex-col gap-3">
            {aprobaciones.map(sol => {
              let details = ''
              if (sol.tipo === 'VENCIMIENTO_COBRANZA') {
                details = `Nueva fecha de vencimiento: ${new Date(sol.nombreTarget).toLocaleDateString('es-AR')}`
              } else if (sol.tipo === 'PAGO_COBRANZA') {
                try {
                  const p = JSON.parse(sol.nombreTarget)
                  details = `Pago parcial de $${p.monto.toFixed(2)} (${p.metodoPago})${p.referencia ? ' - Ref: ' + p.referencia : ''}`
                } catch {
                  details = `Pago parcial: ${sol.nombreTarget}`
                }
              } else if (sol.tipo === 'CUOTAS_COBRANZA') {
                details = `Dividir deuda en ${sol.nombreTarget} cuotas mensuales`
              }

              return (
                <div key={sol.id} className="flex justify-between items-center p-3 bg-black/30 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/25 font-bold uppercase text-[9px]">{sol.tipo.replace('_COBRANZA', '')}</span>
                      <span className="text-xs text-white font-bold">Solicitado por: {sol.solicitadoPor}</span>
                    </div>
                    <p className="text-xs text-secondary mt-1"><strong>Detalles:</strong> {details}</p>
                    <p className="text-xs text-secondary"><strong>Justificación:</strong> "{sol.motivo}"</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleProcesarAprobacion(sol.id, 'aprobar')}
                      className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all flex items-center justify-center"
                      title="Aprobar Solicitud"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleProcesarAprobacion(sol.id, 'rechazar')}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center justify-center"
                      title="Rechazar Solicitud"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cobranzas Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">
            Cuentas por Cobrar
            {cobranzas.length > 0 && <span className="ml-2 text-secondary text-xs font-normal">({cobranzas.length} registros)</span>}
          </span>
          <span className="text-secondary text-xs font-semibold">
            {selectedZone === 'todas' ? 'Todas las zonas' : `Zona ${selectedZone}`}
          </span>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['', 'Cliente', 'Zona', 'Vendedor', 'Pedido', 'Cond. Pago', 'Monto Orig.', 'Saldo Pend.', 'Cuota', 'Vencimiento', 'Días', 'Estado', 'Cobrar', 'Ver'].map(col => (
                  <th key={col} className="px-3 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando cobranzas...</span>
                    </div>
                  </td>
                </tr>
              ) : cobranzas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Banknote size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">Sin cuentas por cobrar</p>
                      <p className="text-white/30 text-xs">Las cobranzas se generan al aprobar un pedido con plazos de pago</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cobranzas.map(c => {
                  const isExpanded = expandedId === c.id
                  const isVencida  = c.diasAtraso !== null && c.diasAtraso > 0 && c.estado !== 'pagada'
                  return (
                    <>
                      <tr
                        key={c.id}
                        className={`border-b border-white/5 transition-colors ${
                          isVencida ? 'bg-red-400/[0.03]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Expand toggle */}
                        <td className="px-3 py-3">
                          {c.pagos.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : c.id)}
                              className="text-secondary hover:text-white transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-white font-semibold text-xs max-w-[160px] truncate">{c.empresaNombre || '—'}</td>
                        <td className="px-3 py-3 text-secondary text-xs">{c.zona}</td>
                        <td className="px-3 py-3 text-secondary text-xs">{c.vendedorAlias}</td>
                        <td className="px-3 py-3 text-primary font-bold text-xs">{c.pedido.numeroPedido}</td>
                        <td className="px-3 py-3 text-secondary text-xs">{c.pedido.condicionPago || '—'}</td>
                        <td className="px-3 py-3 text-white text-xs font-semibold">{fmt(c.montoOriginal)}</td>
                        <td className="px-3 py-3">
                          <span className={`font-black text-xs ${c.saldoPendiente > 0 ? (isVencida ? 'text-red-400' : 'text-yellow-400') : 'text-green-400'}`}>
                            {fmt(c.saldoPendiente)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-secondary text-xs text-center">
                          {c.cuota}/{c.totalCuotas}
                        </td>
                        <td className="px-3 py-3 text-secondary text-xs whitespace-nowrap">
                          {formatDate(c.fechaVencimiento)}
                          {isVencida && <span title="Atrasada"><AlertTriangle size={12} className="text-red-400 animate-pulse ml-2 inline-block" /></span>}
                        </td>
                        <td className="px-3 py-3">
                          {c.diasAtraso !== null && c.estado !== 'pagada' ? (
                            <span className={`text-xs font-black ${c.diasAtraso > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {c.diasAtraso > 0 ? `+${c.diasAtraso}d` : `${Math.abs(c.diasAtraso)}d`}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${ESTADO_BADGES[c.estado] || ''}`}>
                            {c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3 flex gap-2">
                          {c.estado !== 'pagada' && (
                            <button
                              onClick={() => openPagoModal(c)}
                              className="px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 text-[10px] font-black border border-yellow-400/20 transition-all flex items-center gap-1 whitespace-nowrap"
                            >
                              <Banknote size={11} /> Cobrar
                            </button>
                          )}
                          {c.estado !== 'pagada' && (
                            <button
                              onClick={() => setProrrogaModal(c)}
                              className="px-3 py-1.5 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 text-[10px] font-black border border-blue-400/20 transition-all flex items-center gap-1 whitespace-nowrap"
                              title="Prorrogar / Cambiar Fecha de Vencimiento"
                            >
                              <Calendar size={11} /> Prorrogar
                            </button>
                          )}
                          {c.estado !== 'pagada' && (
                            <button
                              onClick={() => handleDividirCuotas(c)}
                              className="px-3 py-1.5 rounded-lg bg-purple-400/10 text-purple-400 hover:bg-purple-400/20 text-[10px] font-black border border-purple-400/20 transition-all flex items-center gap-1 whitespace-nowrap"
                              title="Dividir saldo en cuotas mensuales"
                            >
                              <Calculator size={11} /> Cuotas
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => fetchDetallePedido(c.pedidoId)}
                            disabled={isFetchingPedido === c.pedidoId}
                            className="btn-action text-secondary hover:text-white"
                            title="Ver detalles del pedido"
                          >
                            {isFetchingPedido === c.pedidoId ? (
                              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Eye size={13} />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded payment history */}
                      {isExpanded && c.pagos.length > 0 && (
                        <tr key={`${c.id}-hist`} className="bg-white/[0.01]">
                          <td colSpan={13} className="px-6 py-3 border-b border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                              <History size={12} className="text-secondary" />
                              <span className="text-[10px] uppercase font-black text-secondary tracking-wider">Historial de Pagos</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {c.pagos.map(p => (
                                <div key={p.id} className="flex items-center gap-4 text-xs py-1 border-b border-white/3 last:border-0">
                                  <span className="text-secondary">{formatDate(p.creadoEn)}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                    p.metodoPago === 'financiera' ? 'bg-orange-400/10 text-orange-400' :
                                    p.metodoPago === 'cheque'     ? 'bg-blue-400/10 text-blue-400' :
                                    p.metodoPago === 'transferencia' ? 'bg-purple-400/10 text-purple-400' :
                                    'bg-green-400/10 text-green-400'
                                  }`}>{p.metodoPago}</span>
                                  <span className="text-white font-bold">{fmt(p.montoFinal)}</span>
                                  {p.recargoAplicado > 0 && <span className="text-orange-400 text-[10px]">(+{fmt(p.recargoAplicado)} fin.)</span>}
                                  {p.referencia && <span className="text-secondary">Ref: {p.referencia}</span>}
                                  <span className="text-white/30 ml-auto">{p.registradoPorAlias}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE VIEW (CARDS) ────────────────────────────────────────── */}
        <div className="md:hidden flex flex-col gap-4 p-4 bg-black/20 border-t border-white/5">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-secondary text-xs">Cargando...</span>
            </div>
          ) : cobranzas.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center gap-2">
              <Banknote size={30} className="text-white/10" />
              <p className="text-secondary text-xs font-semibold">Sin cuentas por cobrar</p>
            </div>
          ) : (
            cobranzas.map(c => {
              const isExpanded = expandedId === c.id
              const isVencida  = c.diasAtraso !== null && c.diasAtraso > 0 && c.estado !== 'pagada'
              
              return (
                <div key={c.id} className={`flex flex-col gap-3 p-4 rounded-xl border ${isVencida ? 'border-red-400/30 bg-red-400/5' : 'border-white/10 bg-black/40'} shadow-lg`}>
                  <div className="flex justify-between items-start gap-2 border-b border-white/5 pb-3">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm leading-tight">{c.empresaNombre || '—'}</span>
                      <span className="text-secondary text-[10px] mt-1">{c.pedido.numeroPedido} · {c.zona}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${ESTADO_BADGES[c.estado] || ''} whitespace-nowrap`}>
                      {c.estado.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-secondary uppercase font-black tracking-wider">Monto Adeudado</span>
                      <span className={`font-black text-lg ${c.saldoPendiente > 0 ? (isVencida ? 'text-red-400' : 'text-yellow-400') : 'text-green-400'}`}>
                        {fmt(c.saldoPendiente)}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] text-secondary uppercase font-black tracking-wider">Vencimiento</span>
                      <span className="text-white font-semibold text-xs mt-1">
                        {formatDate(c.fechaVencimiento)}
                        {isVencida && c.diasAtraso && <span className="text-red-400 ml-1">({c.diasAtraso}d)</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 gap-2 border-t border-white/5 mt-1">
                    <button
                      onClick={() => fetchDetallePedido(c.pedidoId)}
                      className="p-2 rounded-lg bg-white/5 text-secondary hover:bg-white/10 transition-colors"
                      title="Ver pedido"
                    >
                      <Eye size={16} />
                    </button>

                    <div className="flex gap-2">
                      {c.estado !== 'pagada' && (
                        <button
                          onClick={() => setProrrogaModal(c)}
                          className="p-2 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 border border-blue-400/20 transition-all"
                          title="Prorrogar"
                        >
                          <Calendar size={16} />
                        </button>
                      )}
                      {c.estado !== 'pagada' && (
                        <button
                          onClick={() => handleDividirCuotas(c)}
                          className="p-2 rounded-lg bg-purple-400/10 text-purple-400 hover:bg-purple-400/20 border border-purple-400/20 transition-all"
                          title="Dividir en Cuotas"
                        >
                          <Calculator size={16} />
                        </button>
                      )}
                      {c.estado !== 'pagada' && (
                        <button
                          onClick={() => openPagoModal(c)}
                          className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 border border-yellow-400/20 transition-all font-black flex items-center gap-1"
                          title="Cobrar"
                        >
                          <Banknote size={16} /> 
                          <span className="text-xs">Cobrar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer totals */}
        {cobranzas.length > 0 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6 text-xs">
              <span className="text-secondary">Registros: <strong className="text-white">{cobranzas.length}</strong></span>
              <span className="text-secondary">Deuda total: <strong className="text-yellow-400">{fmt(deudaTotal)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-secondary">
              <span>* Financiera aplica recargo del <strong className="text-orange-400">3%</strong> sobre el monto cobrado</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL REGISTRAR PAGO ────────────────────────────────────────── */}
      {pagoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel card w-full max-w-lg border border-white/10 p-6 flex flex-col gap-5 animate-fade-in shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Banknote size={18} className="text-yellow-400" />
                  Registrar Pago
                </h3>
                <p className="text-secondary text-xs mt-0.5">{pagoModal.empresaNombre} · {pagoModal.pedido.numeroPedido}</p>
              </div>
              <button onClick={() => setPagoModal(null)} className="text-secondary hover:text-white text-xl leading-none transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Saldo info */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-black/30 border border-white/5">
              <div>
                <p className="text-[10px] uppercase font-black text-secondary">Monto Original</p>
                <p className="text-white font-bold text-sm">{fmt(pagoModal.montoOriginal)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-secondary">Saldo Pendiente</p>
                <p className="text-yellow-400 font-black text-sm">{fmt(pagoModal.saldoPendiente)}</p>
              </div>
              {pagoModal.pedido.condicionPago && (
                <div>
                  <p className="text-[10px] uppercase font-black text-secondary">Condición Pago</p>
                  <p className="text-white font-semibold text-xs">{pagoModal.pedido.condicionPago}</p>
                </div>
              )}
              {pagoModal.pedido.plazosPago && (
                <div>
                  <p className="text-[10px] uppercase font-black text-secondary">Plazos</p>
                  <p className="text-white font-semibold text-xs">{pagoModal.pedido.plazosPago}</p>
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                {METODOS_PAGO.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setPagoMetodo(m.key)}
                    className={`p-3 rounded-xl text-left border transition-all flex items-center gap-2 ${
                      pagoMetodo === m.key
                        ? m.recargo
                          ? 'bg-orange-400/10 border-orange-400/40 text-orange-400'
                          : 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-white/10 text-secondary hover:text-white hover:border-white/20'
                    }`}
                  >
                    <m.icon size={14} />
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Monto a Cobrar ($)</label>
              <input
                type="number"
                min="0.01"
                max={pagoModal.saldoPendiente}
                step="0.01"
                value={pagoMonto}
                onChange={e => setPagoMonto(e.target.value)}
                className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
              />
            </div>

            {/* Preview financiero */}
            {montoNum > 0 && (
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary">Monto ingresado</span>
                  <span className="text-white font-bold">{fmt(montoNum)}</span>
                </div>
                {recargoPreview > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Recargo Financiera (3%)</span>
                    <span className="font-bold">+ {fmt(recargoPreview)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-1.5 mt-0.5">
                  <span className="text-white font-black">Total a Cobrar</span>
                  <span className="text-primary font-black text-sm">{fmt(totalPreview)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Saldo después del pago</span>
                  <span className={`font-bold ${Math.max(0, pagoModal.saldoPendiente - totalPreview) <= 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {fmt(Math.max(0, pagoModal.saldoPendiente - totalPreview))}
                  </span>
                </div>
              </div>
            )}

            {/* Referencia y notas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Referencia</label>
                <input
                  type="text"
                  placeholder="Nº cheque / comprobante..."
                  value={pagoRef}
                  onChange={e => setPagoRef(e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Notas</label>
                <input
                  type="text"
                  placeholder="Observaciones..."
                  value={pagoNotas}
                  onChange={e => setPagoNotas(e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>
            </div>

            {pagoError && (
              <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={14} /> {pagoError}
              </div>
            )}
            {pagoSuccess && (
              <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} /> {pagoSuccess}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setPagoModal(null)}
                disabled={pagoLoading}
                className="btn btn-secondary text-xs px-5"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={pagoLoading || montoNum <= 0}
                className="btn btn-primary text-xs px-6 shadow-lg shadow-primary/20 font-black flex items-center gap-2"
              >
                <Banknote size={14} />
                {pagoLoading ? 'Registrando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prorroga Modal */}
      {prorrogaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-2xl relative">
            <button
              onClick={() => setProrrogaModal(null)}
              className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Prorrogar Vencimiento</h2>
              <p className="text-secondary text-sm">Cobranza de <strong className="text-white">{prorrogaModal.empresaNombre}</strong></p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Nueva Fecha de Vencimiento</label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleProrrogar}
                disabled={prorrogaLoading || !nuevaFecha}
                className="w-full btn btn-primary flex items-center justify-center gap-2 font-bold"
              >
                {prorrogaLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Calendar size={16} /> Confirmar Prórroga
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pedido Global */}
      {selectedPedidoDetalle && (
        <PedidoDetalleModal
          pedido={selectedPedidoDetalle}
          onClose={() => setSelectedPedidoDetalle(null)}
        />
      )}
    </div>
  )
}
