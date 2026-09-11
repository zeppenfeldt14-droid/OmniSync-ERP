'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Globe, BarChart3, FileText, DollarSign, RefreshCw, Eye, Truck, Calendar, CheckCircle2 } from 'lucide-react'
import { PedidoDetalleModal } from '@/components/PedidoDetalleModal'
import SharedPeriodFilter from '@/components/SharedPeriodFilter'
import { formatDate } from '@/lib/date'
import { useTenant } from '@/lib/tenantContext'

interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
  availableZones: string[]
}

interface Factura {
  id: number
  numeroFactura: string
  tipo: string
  subtotal: number
  iva: number
  recargo: number
  total: number
  estado: string
  creadoEn: string
  pedidoId: number
  pedido: {
    numeroPedido: string
    zona: string
    vendedorAlias: string
    empresa: { nombre: string }
  }
}

const TIPO_BADGES: Record<string, string> = {
  A:      'bg-blue-400/10 text-blue-400 border-blue-400/20',
  B:      'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  remito: 'bg-white/5 text-secondary border-white/10',
}

const ESTADO_FAC: Record<string, string> = {
  pendiente: 'text-yellow-400',
  pagada:    'text-green-400',
  parcial:   'text-blue-400',
  anulada:   'text-red-400',
}

export function VentasPageClient({ userNivel, userAlias, userZona, availableZones }: Props) {
  const { terminology } = useTenant()
  const [selectedZone, setSelectedZone] = useState<string>(userNivel === 3 ? (userZona || '') : 'todas')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mes')
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading]   = useState(true)

  const [selectedPedidoDetalle, setSelectedPedidoDetalle] = useState<any | null>(null)
  const [isFetchingPedido, setIsFetchingPedido] = useState<number | null>(null)

  // Confirmación de entrega
  const [pedidoEntrega, setPedidoEntrega] = useState<{ pedidoId: number; numero: string } | null>(null)
  const [fechaEntregaReal, setFechaEntregaReal] = useState<string>(new Date().toISOString().split('T')[0])
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false)

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

  const handleConfirmarEntrega = async () => {
    if (!pedidoEntrega || !fechaEntregaReal) return
    setConfirmandoEntrega(true)
    try {
      const res = await fetch(`/api/pedidos/${pedidoEntrega.pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'confirmar_entrega', fechaEntregaReal })
      })
      if (res.ok) {
        alert(`✅ Entrega confirmada para el pedido ${pedidoEntrega.numero}. Las cobranzas están ahora activas.`)
        setPedidoEntrega(null)
        fetchFacturas()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al confirmar la entrega.')
      }
    } catch (e) {
      console.error(e)
      alert('Error de red.')
    } finally {
      setConfirmandoEntrega(false)
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const fetchFacturas = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedZone && selectedZone !== 'todas') params.set('zona', selectedZone)
    const res = await fetch(`/api/facturas?${params.toString()}`)
    const data = await res.json()
    const all: Factura[] = Array.isArray(data) ? data : []

    // Period filter
    const now = new Date()
    const filtered = all.filter(f => {
      const d = new Date(f.creadoEn)
      if (selectedPeriod === 'todo') return true
      if (selectedPeriod === 'hoy') {
        return d.toDateString() === now.toDateString()
      }
      if (selectedPeriod === 'semana') {
        const weekAgo = new Date(now)
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
      } else {
        const selectedMonths = selectedPeriod.split(',').map(Number)
        return selectedMonths.includes(d.getMonth())
      }
      return true
    })
    setFacturas(filtered)
    setLoading(false)
  }, [selectedZone, selectedPeriod])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])

  // KPIs
  const totalFacturado = facturas.reduce((s, f) => s + f.total, 0)
  const facturasA      = facturas.filter(f => f.tipo === 'A')
  const facturasB      = facturas.filter(f => f.tipo === 'B' || f.tipo === 'remito')
  const totalA         = facturasA.reduce((s, f) => s + f.total, 0)
  const totalB         = facturasB.reduce((s, f) => s + f.total, 0)
  const totalIVA       = facturas.reduce((s, f) => s + f.iva, 0)
  const totalRecargo   = facturas.reduce((s, f) => s + f.recargo, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="text-green-400" size={26} />
            {terminology.ventas}
          </h1>
          <p className="text-secondary text-sm mt-1">
            {userNivel === 3
              ? `Zona ${userZona} · Mis ${terminology.ventas.toLowerCase()}`
              : `Historial consolidado de ${terminology.ventas.toLowerCase()} por zona`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <SharedPeriodFilter 
            currentPeriod={selectedPeriod} 
            onPeriodChange={setSelectedPeriod} 
          />
        </div>
      </div>

      {/* Zone Filter */}
      {userNivel < 3 && (
        <div className="glass-panel card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center border border-white/5">
          <div className="flex items-center gap-2 text-secondary text-sm font-semibold">
            <Globe size={15} />
            <span>Zona:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedZone('todas')}
              className={`btn-toggle ${
                selectedZone === 'todas' ? 'active' : ''
              }`}
            >
              Todas las Zonas
            </button>
            {availableZones.map(z => (
              <button
                key={z}
                onClick={() => setSelectedZone(z)}
                className={`btn-toggle ${
                selectedZone === z ? 'active' : ''
              }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total Facturado',    value: fmt(totalFacturado), icon: DollarSign, color: 'text-green-400',  bg: 'bg-green-400/10' },
          { label: 'Factura A (c/IVA)', value: fmt(totalA),         icon: FileText,   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
          { label: 'Fact. B / Remito',  value: fmt(totalB),         icon: FileText,   color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Comprobantes',       value: facturas.length,     icon: BarChart3,  color: 'text-primary',    bg: 'bg-primary/10' },
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

      {/* Resumen fiscal */}
      {facturas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-panel card p-4 border border-white/5">
            <p className="text-[10px] uppercase font-black text-secondary mb-2">Desglose Fiscal</p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-secondary">Base imponible (sin IVA)</span>
                <span className="text-white font-bold">{fmt(facturas.reduce((s, f) => s + f.subtotal, 0))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary">IVA 21% total</span>
                <span className="text-blue-400 font-bold">+ {fmt(totalIVA)}</span>
              </div>
              {totalRecargo > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Recargo Financiera 3%</span>
                  <span className="text-orange-400 font-bold">+ {fmt(totalRecargo)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                <span className="text-white font-black">TOTAL</span>
                <span className="text-green-400 font-black">{fmt(totalFacturado)}</span>
              </div>
            </div>
          </div>
          <div className="glass-panel card p-4 border border-white/5">
            <p className="text-[10px] uppercase font-black text-secondary mb-2">Distribución por Tipo</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-400/10 text-blue-400 border border-blue-400/20">A</span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: totalFacturado > 0 ? `${(totalA / totalFacturado) * 100}%` : '0%' }} />
                </div>
                <span className="text-white text-xs font-bold">{totalFacturado > 0 ? ((totalA / totalFacturado) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">B</span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: totalFacturado > 0 ? `${(totalB / totalFacturado) * 100}%` : '0%' }} />
                </div>
                <span className="text-white text-xs font-bold">{totalFacturado > 0 ? ((totalB / totalFacturado) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>
          </div>
          <div className="glass-panel card p-4 border border-white/5">
            <p className="text-[10px] uppercase font-black text-secondary mb-2">Conteo por Tipo</p>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Facturas A</span>
                <span className="text-blue-400 font-black">{facturasA.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Facturas B / Remitos</span>
                <span className="text-yellow-400 font-black">{facturasB.length}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="text-white font-bold">Total</span>
                <span className="text-white font-black">{facturas.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facturas Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">Facturas y Comprobantes</span>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 text-[10px] font-black border border-blue-400/20">A · con IVA</span>
            <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-[10px] font-black border border-yellow-400/20">B · Remito</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Nº Factura', 'Tipo', 'Cliente', 'Zona', 'Vendedor', 'Pedido', 'Base s/IVA', 'IVA 21%', 'Recargo Fin.', 'Total', 'Estado', 'Fecha', ''].map(col => (
                  <th key={col} className="px-3 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando facturas...</span>
                    </div>
                  </td>
                </tr>
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">Sin facturación en este período</p>
                      <p className="text-white/30 text-xs">Las facturas se generan automáticamente al aprobar un pedido</p>
                    </div>
                  </td>
                </tr>
              ) : (
                facturas.map(f => (
                  <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 text-primary font-black text-xs">{f.numeroFactura}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${TIPO_BADGES[f.tipo] || ''}`}>
                        {f.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white font-semibold text-xs max-w-[140px] truncate">{f.pedido.empresa.nombre}</td>
                    <td className="px-3 py-3 text-secondary text-xs">{f.pedido.zona}</td>
                    <td className="px-3 py-3 text-secondary text-xs">{f.pedido.vendedorAlias}</td>
                    <td className="px-3 py-3 text-secondary text-xs">{f.pedido.numeroPedido}</td>
                    <td className="px-3 py-3 text-white text-xs">{fmt(f.subtotal)}</td>
                    <td className="px-3 py-3 text-blue-400 text-xs font-semibold">{f.iva > 0 ? fmt(f.iva) : '—'}</td>
                    <td className="px-3 py-3 text-orange-400 text-xs font-semibold">{f.recargo > 0 ? fmt(f.recargo) : '—'}</td>
                    <td className="px-3 py-3 text-white font-black text-xs">{fmt(f.total)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold capitalize ${ESTADO_FAC[f.estado] || 'text-secondary'}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-secondary text-xs whitespace-nowrap">
                      {formatDate(f.creadoEn)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => fetchDetallePedido(f.pedidoId)}
                          disabled={isFetchingPedido === f.pedidoId}
                          className="btn-action text-secondary hover:text-white"
                          title="Ver detalles del pedido"
                        >
                          {isFetchingPedido === f.pedidoId ? (
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Eye size={13} />
                          )}
                        </button>
                        {userNivel < 3 && f.pedido && (f.pedido as any).estado === 'aprobado' && (
                          <button
                            onClick={() => {
                              setPedidoEntrega({ pedidoId: f.pedidoId, numero: f.pedido.numeroPedido })
                              setFechaEntregaReal(new Date().toISOString().split('T')[0])
                            }}
                            className="btn-action text-green-400 border-green-400/20 hover:bg-green-400/10"
                            title="Confirmar entrega de mercancía"
                          >
                            <Truck size={13} />
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

        {facturas.length > 0 && (
          <div className="p-4 border-t border-white/5 flex justify-between items-center text-xs">
            <span className="text-secondary">{facturas.length} comprobante{facturas.length !== 1 ? 's' : ''}</span>
            <span className="text-green-400 font-black text-sm">Total: {fmt(totalFacturado)}</span>
          </div>
        )}
      </div>

      {/* Modal de Pedido Global */}
      {selectedPedidoDetalle && (
        <PedidoDetalleModal
          pedido={selectedPedidoDetalle}
          onClose={() => setSelectedPedidoDetalle(null)}
        />
      )}

      {/* Modal: Confirmar Entrega de Mercancía */}
      {pedidoEntrega && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B0F19] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center gap-3">
              <div className="p-2 bg-green-400/10 rounded-xl">
                <Truck size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Confirmar Entrega</h3>
                <p className="text-secondary text-xs mt-0.5">Pedido: <strong className="text-primary">{pedidoEntrega.numero}</strong></p>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-secondary text-xs leading-relaxed">
                Al confirmar la entrega, las cobranzas de este pedido se activarán y el vencimiento se calculará desde esta fecha.
              </p>
              <div>
                <label className="block text-[10px] text-secondary uppercase font-bold mb-1.5 flex items-center gap-1.5">
                  <Calendar size={11} /> Fecha Real de Entrega
                </label>
                <input
                  type="date"
                  value={fechaEntregaReal}
                  onChange={e => setFechaEntregaReal(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary cursor-pointer"
                />
              </div>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-3">
              <button
                onClick={() => setPedidoEntrega(null)}
                className="btn btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEntrega}
                disabled={confirmandoEntrega || !fechaEntregaReal}
                className="btn btn-primary text-xs flex items-center gap-2 font-bold"
              >
                {confirmandoEntrega ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
