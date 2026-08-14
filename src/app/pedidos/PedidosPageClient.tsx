'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Filter, Plus, Clock, ThumbsUp,
  ThumbsDown, Globe, Send, AlertCircle, Eye, Edit3, Calendar,
  Info, FileText, Check, DollarSign, Gift, User, Package, Calculator,
  Trash2, Download
} from 'lucide-react'
import { PedidoDetalleModal } from '@/components/PedidoDetalleModal'
import { formatDate } from '@/lib/date'

import SharedPeriodFilter from '@/components/SharedPeriodFilter'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
  availableZones: string[]
}

interface PedidoDetalle {
  id: number
  productoNombre: string
  producto: { codigoInterno: string; paqPorCaja: number }
  precioCajaSnapshot: number
  precioCajaOriginal: number
  cantidadCajas: number
  subtotal: number
  cajasBonus: number
  descripcionBonus: string | null
}

interface Pedido {
  id: number
  numeroPedido: string
  empresa: { nombre: string; cuit: string | null }
  zona: string
  vendedorAlias: string
  totalGeneral: number
  condicionPago: string | null
  estado: string
  tienePrecioNegociado: boolean
  tieneTarifaNegociada: boolean
  creadoEn: string
  porcentajePagoA: number
  porcentajePagoB: number
  aplicaFinanciera: boolean
  plazosPago: string | null
  observaciones: string | null
  acuerdosComerciales: string | null
  requierePresupuesto: boolean
  turnoEntrega: string | null
  fechaEntrega: string | null
  subtotalSinIVA: number
  montoIVA: number
  montoFinanciera: number
  metodoPagoA: string | null
  fechaPagoA: string | null
  metodoPagoB: string | null
  aprobadoPorAlias: string | null
  aprobadoEn: string | null
  detalles: PedidoDetalle[]
}

const ESTADOS = [
  { key: 'todos',                label: 'Todos',             color: 'text-secondary' },
  { key: 'borrador',             label: 'Borrador',          color: 'text-yellow-400' },
  { key: 'pendiente_supervisor', label: 'Pend. Aprob/Fact',  color: 'text-blue-400' },
  { key: 'aprobado',             label: 'Aprobado',          color: 'text-green-400' },
  { key: 'cancelado',            label: 'Cancelado',         color: 'text-red-400' },
]

const ESTADO_BADGES: Record<string, string> = {
  borrador:              'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  pendiente_supervisor:  'bg-blue-400/10 text-blue-400 border-blue-400/20',
  aprobado:              'bg-green-400/10 text-green-400 border-green-400/20',
  cancelado:             'bg-red-400/10 text-red-400 border-red-400/20',
}
const ESTADO_LABELS: Record<string, string> = {
  borrador:              'Borrador',
  pendiente_supervisor:  'Pend. Aprob.',
  aprobado:              'Aprobado',
  cancelado:             'Cancelado',
}

export function PedidosPageClient({ userNivel, userAlias, userZona, availableZones }: Props) {
  const getEstadoLabel = (p: Pedido) => {
    if (p.estado === 'pendiente_supervisor') {
      if (p.tienePrecioNegociado) return 'Pend. Aprob.';
      return 'Pend. Factura';
    }
    return ESTADO_LABELS[p.estado] || p.estado;
  }

  const getEstadoBadge = (p: Pedido) => {
    if (p.estado === 'pendiente_supervisor') {
      if (p.tienePrecioNegociado) return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
      return 'bg-purple-400/10 text-purple-400 border-purple-400/20';
    }
    return ESTADO_BADGES[p.estado] || '';
  }

  const router = useRouter()
  const [selectedZone, setSelectedZone] = useState<string>(
    userNivel === 3 ? (userZona || '') : 'todas'
  )
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mes')
  const [pedidos, setPedidos]   = useState<Pedido[]>([])
  const [loading, setLoading]   = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [pedidoAprobar, setPedidoAprobar] = useState<Pedido | null>(null)
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [metodoPagoB, setMetodoPagoB] = useState<'efectivo' | 'transferencia' | ''>('')

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const fetchPedidos = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedZone && selectedZone !== 'todas') params.set('zona', selectedZone)
    if (selectedEstado !== 'todos') params.set('estado', selectedEstado)
    const res = await fetch(`/api/pedidos?${params.toString()}`)
    const data = await res.json()
    const all: Pedido[] = Array.isArray(data) ? data : []

    const now = new Date()

    const filtered = all.filter(p => {
      const d = new Date(p.creadoEn)

      if (selectedPeriod === 'todo') return true
      if (selectedPeriod === 'hoy') {
        return d.toDateString() === now.toDateString()
      }
      if (selectedPeriod === 'semana') {
        const weekAgo = new Date()
        weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      }
      if (selectedPeriod === 'mes') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      if (selectedPeriod.startsWith('Q')) {
        const month = d.getMonth()
        if (selectedPeriod === 'Q1') return month >= 0 && month <= 2
        if (selectedPeriod === 'Q2') return month >= 3 && month <= 5
        if (selectedPeriod === 'Q3') return month >= 6 && month <= 8
        if (selectedPeriod === 'Q4') return month >= 9 && month <= 11
      }
      return true
    })
    
    setPedidos(filtered)
    setLoading(false)
  }

  useEffect(() => { fetchPedidos() }, [selectedZone, selectedEstado, selectedPeriod])

  const handleAction = async (id: number, accion: string, customData?: any) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...customData }),
      })
      if (res.ok) await fetchPedidos()
      else { const d = await res.json(); alert(d.error) }
    } catch { alert('Error de conexión') }
    finally { setActionId(null) }
  }

  const handleDelete = async (id: number) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchPedidos()
      else { const d = await res.json(); alert(d.error) }
    } catch { alert('Error de conexión') }
    finally { setActionId(null) }
  }

  const handlePrintPedido = async (p: Pedido) => {
    const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    const div = document.createElement('div')
    div.innerHTML = `
      <div style="font-family: 'Helvetica Neue', sans-serif; font-size: 11px; padding: 20px; color: #222; background: white; width: 800px;">
        <div style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 20px; font-weight: 900; color: #444;">NEOSOL</div>
            <p><strong>Pedido:</strong> ${p.numeroPedido}</p>
            <p><strong>Cliente:</strong> ${p.empresa.nombre} ${p.empresa.cuit ? `(CUIT: ${p.empresa.cuit})` : ''}</p>
            <p><strong>Vendedor:</strong> ${p.vendedorAlias} | <strong>Zona:</strong> ${p.zona}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Fecha:</strong> ${new Date(p.creadoEn).toLocaleString('es-AR')}</p>
            <p><strong>Estado:</strong> ${getEstadoLabel(p)}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Cód</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Producto</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Paq/Caja</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Cajas</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Bonus</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Precio Caja</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${p.detalles.map(d => `
              <tr>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left;">${d.producto.codigoInterno}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left;">${d.productoNombre}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center;">${d.producto.paqPorCaja}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center;">${d.cantidadCajas}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center;">${d.cajasBonus ? `+${d.cajasBonus}` : '-'}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right;">${fmt(d.precioCajaSnapshot)}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right;">${fmt(d.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <table style="width: 300px; border-collapse: collapse;">
            <tr><td style="padding: 4px; text-align: left;">Subtotal Neto:</td><td style="padding: 4px; text-align: right;">${fmt(p.subtotalSinIVA)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;">IVA (21%):</td><td style="padding: 4px; text-align: right;">${fmt(p.montoIVA)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;">Recargo Financiación:</td><td style="padding: 4px; text-align: right;">${fmt(p.montoFinanciera)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;"><h3>Total General:</h3></td><td style="padding: 4px; text-align: right;"><h3>${fmt(p.totalGeneral)}</h3></td></tr>
          </table>
        </div>
        <div style="margin-top: 30px; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          ${p.observaciones ? `<p><strong>Observaciones:</strong> ${p.observaciones}</p>` : ''}
          <p>Condición de Pago: ${p.condicionPago || 'N/A'}</p>
          <p>Generado el ${today}</p>
        </div>
      </div>
    `
    div.style.position = 'absolute'
    div.style.top = '-9999px'
    div.style.left = '-9999px'
    document.body.appendChild(div)

    try {
      const canvas = await html2canvas(div.firstElementChild as HTMLElement, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Pedido_${p.numeroPedido}.pdf`)
    } finally {
      document.body.removeChild(div)
    }
  }

  const counts = {
    todos:                pedidos.length,
    borrador:             pedidos.filter(p => (p.estado === 'borrador' || p.estado === 'presupuesto')).length,
    pendiente_supervisor: pedidos.filter(p => p.estado === 'pendiente_supervisor').length,
    aprobado:             pedidos.filter(p => p.estado === 'aprobado').length,
    cancelado:            pedidos.filter(p => p.estado === 'cancelado').length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="text-primary" size={26} />
            Pedidos
          </h1>
          <p className="text-secondary text-sm mt-1">
            {userNivel === 3
              ? `Zona ${userZona} · Mis pedidos`
              : 'Gestión centralizada de pedidos por zona'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <SharedPeriodFilter 
            currentPeriod={selectedPeriod} 
            onPeriodChange={setSelectedPeriod} 
          />

          <button
            onClick={() => router.push('/pedidos/nuevo')}
            className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 font-bold"
          >
            <Plus size={16} />
            Nuevo Pedido
          </button>
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
            <ThumbsUp size={15} />
            <span>Estado:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map(e => (
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
          { label: 'Total Pedidos',    value: counts.todos,                icon: ShoppingCart, color: 'text-primary',   bg: 'bg-primary/10' },
          { label: 'Pend. Aprob/Fact', value: counts.pendiente_supervisor, icon: Clock,        color: 'text-blue-400',  bg: 'bg-blue-400/10' },
          { label: 'Aprobados',        value: counts.aprobado,             icon: ThumbsUp, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Cancelados',       value: counts.cancelado,            icon: ThumbsDown,      color: 'text-red-400',   bg: 'bg-red-400/10' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel card p-4 flex items-center gap-4 border border-white/5">
            <div className={`${kpi.bg} p-3 rounded-xl`}>
              <kpi.icon className={kpi.color} size={20} />
            </div>
            <div>
              <p className="text-secondary text-xs font-semibold">{kpi.label}</p>
              <p className="text-white text-xl font-black">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">Lista de Pedidos</span>
          <div className="flex items-center gap-2 text-secondary text-xs">
            <Filter size={13} />
            <span>
              {selectedZone === 'todas' ? 'Todas las zonas' : `Zona ${selectedZone}`}
              {selectedEstado !== 'todos' ? ` · ${ESTADOS.find(e => e.key === selectedEstado)?.label}` : ''}
            </span>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Nº Pedido', 'Cliente', 'Zona', 'Vendedor', 'Total', 'Cond. Pago', 'Estado', 'Fecha', 'Acciones'].map(col => (
                  <th key={col} className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando pedidos...</span>
                    </div>
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingCart size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">No hay pedidos</p>
                      <p className="text-white/30 text-xs">Creá el primer pedido con el botón &ldquo;Nuevo Pedido&rdquo;</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pedidos.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-primary font-black text-xs">
                      {p.numeroPedido}
                      {p.tienePrecioNegociado && (
                        <span className="block text-[8px] text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
                          ⚠️ Precio Negociado
                        </span>
                      )}
                      {p.tieneTarifaNegociada && (
                        <span className="block text-[8px] text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
                          ⚠️ Tarifa Negociada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold text-xs">{p.empresa.nombre}</td>
                    <td className="px-4 py-3 text-secondary text-xs">{p.zona}</td>
                    <td className="px-4 py-3 text-secondary text-xs">{p.vendedorAlias}</td>
                    <td className="px-4 py-3 text-white font-black text-xs">{fmt(p.totalGeneral)}</td>
                    <td className="px-4 py-3 text-secondary text-xs">{p.condicionPago || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getEstadoBadge(p)}`}>
                        {getEstadoLabel(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs whitespace-nowrap">
                      {formatDate(p.creadoEn)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Ver detalles */}
                        <button
                          onClick={() => setSelectedPedido(p)}
                          className="btn-action"
                          title="Ver detalles"
                        >
                          <Eye size={12} />
                        </button>

                        {/* Editar borrador */}
                        {(p.estado === 'borrador' || p.estado === 'presupuesto') && (
                          <button
                            onClick={() => router.push(`/pedidos/nuevo?edit=${p.id}`)}
                            className="btn-action text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/10"
                            title="Editar pedido"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}

                        {/* Aprobar */}
                        {userNivel < 3 && p.estado === 'pendiente_supervisor' && (
                          <button
                            onClick={() => {
                              const requiresNivel1 = p.tienePrecioNegociado || p.tieneTarifaNegociada;
                              if (requiresNivel1) {
                                if (userNivel === 1) {
                                  if (confirm('¿Aprobar Tarifa Negociada para este pedido? El pedido pasará a Pendiente de Factura.')) {
                                    handleAction(p.id, 'aprobar_precio');
                                  }
                                } else {
                                  alert('Este pedido contiene precios/tarifas negociadas y requiere aprobación de Gerencia (Nivel 1).');
                                }
                                return;
                              }
                              setSelectedPedido(p)
                            }}
                            disabled={actionId === p.id}
                            className={`btn-action ${
                              (p.tienePrecioNegociado || p.tieneTarifaNegociada) && userNivel === 2
                                ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
                                : 'text-green-400 border-green-400/20 hover:bg-green-400/10'
                            }`}
                            title={(p.tienePrecioNegociado || p.tieneTarifaNegociada) ? (userNivel === 1 ? 'Aprobar Tarifa' : 'Requiere aprobación de Gerencia (Nivel 1)') : 'Aprobar/Facturar pedido'}
                          >
                            <ThumbsUp size={12} />
                          </button>
                        )}

                        {/* Enviar */}
                        {(p.estado === 'borrador' || p.estado === 'presupuesto') && (
                          <button
                            onClick={() => handleAction(p.id, 'enviar')}
                            disabled={actionId === p.id}
                            className="btn-action text-blue-400 border-blue-400/20 hover:bg-blue-400/10"
                            title="Enviar al Supervisor"
                          >
                            <Send size={12} />
                          </button>
                        )}

                        {/* Cancelar */}
                        {((p.estado === 'borrador' || p.estado === 'presupuesto') || (p.estado === 'pendiente_supervisor' && userNivel < 3)) && (
                          <button
                            onClick={() => { if (confirm('¿Cancelar este pedido?')) handleAction(p.id, 'cancelar') }}
                            disabled={actionId === p.id}
                            className="btn-action text-orange-400 border-orange-400/20 hover:bg-orange-400/10"
                            title="Cancelar pedido"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        )}

                        {/* Borrar (Delete) */}
                        {(((p.estado === 'borrador' || p.estado === 'presupuesto') || p.estado === 'cancelado') || userNivel < 3) && (
                          <button
                            onClick={() => { if (confirm('¿ELIMINAR DEFINITIVAMENTE este pedido del sistema? Esta acción no se puede deshacer.')) handleDelete(p.id) }}
                            disabled={actionId === p.id}
                            className="btn-action text-red-500 border-red-500/20 hover:bg-red-500/10"
                            title="Eliminar pedido definitivamente"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MOBILE VIEW (CARDS) ────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-4 p-4 bg-black/20 border-t border-white/5">
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-secondary text-xs">Cargando...</span>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center gap-2">
            <ShoppingCart size={30} className="text-white/10" />
            <p className="text-secondary text-xs font-semibold">No hay pedidos</p>
          </div>
        ) : (
          pedidos.map(p => (
            <div key={p.id} className="flex flex-col gap-3 p-4 rounded-xl bg-black/40 border border-white/10 shadow-lg">
              <div className="flex justify-between items-start gap-2 border-b border-white/5 pb-3">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm leading-tight flex items-center gap-2">
                    {p.empresa.nombre}
                  </span>
                  <span className="text-primary font-black text-xs mt-1">
                    {p.numeroPedido}
                    {p.tienePrecioNegociado && <span className="text-yellow-400 ml-1" title="Precio Negociado">⚠️</span>}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${getEstadoBadge(p)} whitespace-nowrap`}>
                  {getEstadoLabel(p)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-[9px] text-secondary uppercase font-black tracking-wider">Total</span>
                  <span className="font-black text-lg text-white">
                    {fmt(p.totalGeneral)}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-secondary uppercase font-black tracking-wider">Fecha / Cond.</span>
                  <span className="text-white font-semibold text-xs mt-1">
                    {formatDate(p.creadoEn)}
                  </span>
                  <span className="text-secondary text-[10px]">{p.condicionPago || '—'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 gap-2 border-t border-white/5 mt-1">
                <button
                  onClick={() => setSelectedPedido(p)}
                  className="p-2 rounded-lg bg-white/5 text-secondary hover:bg-white/10 transition-colors flex items-center gap-1"
                  title="Ver pedido"
                >
                  <Eye size={16} /> <span className="text-[10px] font-semibold">Ver</span>
                </button>

                <div className="flex gap-2">
                  {(p.estado === 'borrador' || p.estado === 'presupuesto') && (
                    <>
                      <button
                        onClick={() => router.push(`/pedidos/nuevo?edit=${p.id}`)}
                        className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleAction(p.id, 'enviar')}
                        disabled={actionId === p.id}
                        className="p-2 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20"
                      >
                        <Send size={16} />
                      </button>
                    </>
                  )}

                  {userNivel < 3 && p.estado === 'pendiente_supervisor' && (
                    <button
                      onClick={() => {
                        const requiresNivel1 = p.tienePrecioNegociado || p.tieneTarifaNegociada;
                        if (requiresNivel1) {
                          if (userNivel === 1) {
                            if (confirm('¿Aprobar Tarifa Negociada para este pedido? El pedido pasará a Pendiente de Factura.')) {
                              handleAction(p.id, 'aprobar_precio');
                            }
                          } else {
                            alert('Este pedido contiene precios/tarifas negociadas y requiere aprobación de Gerencia (Nivel 1).');
                          }
                          return;
                        }
                        setSelectedPedido(p)
                      }}
                        disabled={actionId === p.id}
                      className={`p-2 rounded-lg border ${
                        (p.tienePrecioNegociado || p.tieneTarifaNegociada) && userNivel === 2
                          ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
                          : 'bg-green-400/10 text-green-400 border-green-400/20 hover:bg-green-400/20 transition-all'
                      }`}
                      title={(p.tienePrecioNegociado || p.tieneTarifaNegociada) ? (userNivel === 1 ? 'Aprobar Tarifa' : 'Requiere aprobación de Gerencia (Nivel 1)') : 'Aprobar/Facturar pedido'}
                    >
                      <ThumbsUp size={16} />
                    </button>
                  )}

                  {((p.estado === 'borrador' || p.estado === 'presupuesto') || (p.estado === 'pendiente_supervisor' && userNivel < 3)) && (
                    <button
                      onClick={() => { if (confirm('¿Cancelar este pedido?')) handleAction(p.id, 'cancelar') }}
                      disabled={actionId === p.id}
                      className="p-2 rounded-lg bg-orange-400/10 text-orange-400 border border-orange-400/20"
                    >
                      <ThumbsDown size={16} />
                    </button>
                  )}
                  
                  {(((p.estado === 'borrador' || p.estado === 'presupuesto') || p.estado === 'cancelado') || userNivel < 3) && (
                    <button
                      onClick={() => { if (confirm('¿ELIMINAR DEFINITIVAMENTE este pedido del sistema? Esta acción no se puede deshacer.')) handleDelete(p.id) }}
                      disabled={actionId === p.id}
                      className="p-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modal: Detalle de Pedido ───────────────────────────────── */}
      {selectedPedido && (
        <PedidoDetalleModal 
          pedido={selectedPedido} 
          onClose={() => setSelectedPedido(null)} 
          onStateChange={handleAction}
          userNivel={userNivel}
        />
      )}

    </div>
  )
}
