'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, Clock, Download, CheckCircle2, Eye, Trash2, X } from 'lucide-react'
import SharedPeriodFilter from '@/components/SharedPeriodFilter'
import { PedidoDetalleModal } from '@/components/PedidoDetalleModal'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatDate } from '@/lib/date'

// Utilidad para formatear moneda
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

export default function FacturacionClient({ userNivel, userAlias, userZona, zonasHabilitadas, logo }: any) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mes')
  const [selectedEstado, setSelectedEstado] = useState('todos') // 'todos', 'aprobado', 'facturado'
  const [selectedPedido, setSelectedPedido] = useState<any>(null)
  
  // Estado para la vista previa
  const [previewInvoice, setPreviewInvoice] = useState<{ id: number, tipo: 'A' | 'X' } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const fetchPedidos = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pedidos?estado=todos')
      const data = await res.json()
      if (Array.isArray(data)) {
        let filtrados = data.filter(p => p.estado === 'aprobado' || p.estado === 'facturado')
        if (userNivel === 3) {
          filtrados = filtrados.filter(p => p.vendedorAlias === userAlias)
        }
        if (selectedEstado !== 'todos') {
          filtrados = filtrados.filter(p => p.estado === selectedEstado)
        }
        const now = new Date()
        filtrados = filtrados.filter(p => {
          const d = new Date(p.creadoEn)
          if (selectedPeriod === 'todo') return true
          if (selectedPeriod === 'hoy') return d.toDateString() === now.toDateString()
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
        setPedidos(filtrados)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPedidos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedEstado])

  const handleMarcarFacturado = async (id: number) => {
    if (!confirm('¿Confirmar que este pedido ya fue facturado?')) return
    try {
      await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'facturar' })
      })
      fetchPedidos()
    } catch (e) {
      alert('Error al actualizar')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿ELIMINAR DEFINITIVAMENTE este pedido del sistema? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchPedidos()
      else { const d = await res.json(); alert(d.error) }
    } catch { alert('Error de conexión') }
  }

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !previewInvoice) return
    setIsGenerating(true)
    const p = pedidos.find(x => x.id === previewInvoice.id)
    if (!p) return

    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${previewInvoice.tipo === 'A' ? 'FacturaA' : 'RemitoX'}_${p.numeroPedido}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Error generando el PDF')
    } finally {
      setIsGenerating(false)
      setPreviewInvoice(null) // Cerrar el modal tras descargar si se desea
    }
  }

  const renderInvoicePreview = () => {
    if (!previewInvoice) return null
    const p = pedidos.find(x => x.id === previewInvoice.id)
    if (!p) return null

    const isFacturaA = previewInvoice.tipo === 'A'
    
    // Calcular la distribución de cajas
    // Si cajasFacturaA/X no están seteadas (pedidos anteriores a la feature), distribuir proporcionalmente
    const todosTotalCajas = p.detalles.reduce((acc: number, d: any) => acc + (d.cantidadCajas || 0), 0)
    const todosConSplit = p.detalles.every((d: any) => (d.cajasFacturaA + d.cajasFacturaX) > 0)

    const detallesFiltrados = p.detalles.map((d: any) => {
      let cajas
      if (todosConSplit) {
        cajas = isFacturaA ? (d.cajasFacturaA || 0) : (d.cajasFacturaX || 0)
      } else {
        // Fallback: distribuir 50/50 si son pares, o mayoría en X
        const total = d.cantidadCajas || 0
        const mitad = Math.floor(total / 2)
        cajas = isFacturaA ? mitad : (total - mitad)
      }
      return { ...d, cajasParaFactura: cajas }
    }).filter((d: any) => d.cajasParaFactura > 0)

    let subtotal = 0
    detallesFiltrados.forEach((d: any) => {
      subtotal += d.cajasParaFactura * (d.precioCajaSnapshot || 0)
    })
    
    const iva = isFacturaA ? subtotal * 0.21 : 0
    let recargo = 0
    if (!isFacturaA && p.metodoPagoB === 'transferencia') {
      recargo = subtotal * 0.03
    }
    const total = subtotal + iva + recargo
    const fecha = new Date(p.creadoEn).toLocaleDateString('es-AR')

    return (
      <div 
        ref={invoiceRef} 
        style={{ 
          fontFamily: 'Helvetica, sans-serif', 
          fontSize: '12px', 
          padding: '40px', 
          color: '#000', 
          background: 'white', 
          width: '800px', 
          minHeight: '1100px', 
          boxSizing: 'border-box' 
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', border: '2px solid #000', borderRadius: '8px', padding: '20px', position: 'relative' }}>
          {/* Tipo Letra Central */}
          <div style={{ position: 'absolute', left: '50%', top: '0', transform: 'translate(-50%, -50%)', background: 'white', padding: '0 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', border: '2px solid #000', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: 'white' }}>{isFacturaA ? 'A' : 'X'}</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>CÓD. 01</div>
          </div>

          {/* Izquierda */}
          <div style={{ width: '45%' }}>
            {isFacturaA && (
            <img 
              src={logo || '/omnisync-logo.png'} 
              crossOrigin="anonymous"
              style={{ maxHeight: '40px', marginBottom: '5px', display: 'block' }} 
              alt="Logo" 
            />
          )}
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '1px' }}>{isFacturaA ? 'NEOSOL' : 'LOS AMIGOS'}</div>
            <div style={{ fontSize: '11px', marginTop: '10px' }}>
              <strong>Razón Social:</strong> {isFacturaA ? 'Neosol S.A.' : 'Los Amigos S.R.L.'}<br/>
              <strong>Domicilio Comercial:</strong> Av. Siempre Viva 123, CABA<br/>
              <strong>Condición frente al IVA:</strong> Responsable Inscripto
            </div>
          </div>

          {/* Derecha */}
          <div style={{ width: '45%', textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>{isFacturaA ? 'FACTURA' : 'DOCUMENTO NO VÁLIDO COMO FACTURA'}</div>
            <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
              <strong>Punto de Venta:</strong> 0001 &nbsp;&nbsp; <strong>Comp. Nro:</strong> {String(p.id).padStart(8, '0')}<br/>
              <strong>Fecha de Emisión:</strong> {fecha}<br/>
              <strong>CUIT:</strong> 30-12345678-9<br/>
              <strong>Ingresos Brutos:</strong> 30-12345678-9<br/>
              <strong>Inicio de Actividades:</strong> 01/01/2020
            </div>
          </div>
        </div>

        {/* CLIENTE */}
        <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '15px', marginTop: '15px' }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%' }}><strong>CUIT:</strong> {p.empresa?.cuit || 'Consumidor Final'}</td>
                <td style={{ width: '50%' }}><strong>Razón Social:</strong> {p.empresa?.nombre}</td>
              </tr>
              <tr>
                <td><strong>Condición frente al IVA:</strong> Responsable Inscripto</td>
                <td><strong>Domicilio:</strong> {p.empresa?.direccion || 'S/D'}</td>
              </tr>
              <tr>
                <td><strong>Condición de Venta:</strong> Cuenta Corriente</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ITEMS */}
        <table style={{ width: '100%', marginTop: '15px', borderCollapse: 'collapse', border: '2px solid #000' }}>
          <thead style={{ background: '#eee', borderBottom: '2px solid #000' }}>
            <tr>
              <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'left', width: '10%' }}>Código</th>
              <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'left', width: '40%' }}>Producto / Servicio</th>
              <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', width: '10%' }}>Cantidad</th>
              <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', width: '10%' }}>U. Medida</th>
              <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'right', width: '15%' }}>Precio Unit.</th>
              <th style={{ padding: '8px', textAlign: 'right', width: '15%' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {detallesFiltrados.map((d: any, idx: number) => {
              const q = d.cajasParaFactura
              return (
                <tr key={idx}>
                  <td style={{ padding: '8px', borderRight: '1px solid #000', borderBottom: '1px solid #ddd', textAlign: 'left' }}>{d.producto?.codigoInterno || 'N/A'}</td>
                  <td style={{ padding: '8px', borderRight: '1px solid #000', borderBottom: '1px solid #ddd', textAlign: 'left' }}>{d.producto?.nombre}</td>
                  <td style={{ padding: '8px', borderRight: '1px solid #000', borderBottom: '1px solid #ddd', textAlign: 'center' }}>{q}</td>
                  <td style={{ padding: '8px', borderRight: '1px solid #000', borderBottom: '1px solid #ddd', textAlign: 'center' }}>Cajas</td>
                  <td style={{ padding: '8px', borderRight: '1px solid #000', borderBottom: '1px solid #ddd', textAlign: 'right' }}>{fmt(d.precioCajaSnapshot)}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>{fmt(q * (d.precioCajaSnapshot || 0))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* TOTALES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
          <div style={{ border: '2px solid #000', borderRadius: '8px', width: '350px', padding: '15px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span><strong>Importe Neto Gravado:</strong></span>
              <span>{fmt(subtotal)}</span>
            </div>
            {isFacturaA && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span><strong>IVA 21%:</strong></span>
              <span>{fmt(iva)}</span>
            </div>
            )}
            {recargo > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span><strong>Recargo 3%:</strong></span>
              <span>{fmt(recargo)}</span>
            </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #000', fontSize: '16px' }}>
              <span><strong>Total:</strong></span>
              <span><strong>{fmt(total)}</strong></span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '40px', fontSize: '10px', color: '#555' }}>
          <p>Comprobante generado automáticamente por CRM Visitas - Pedido #{p.numeroPedido}</p>
        </div>
      </div>
    )
  }

  const pedidosFiltrados = pedidos.filter(p => 
    p.numeroPedido.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.empresa?.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const counts = {
    todos: pedidos.length,
    aprobado: pedidos.filter(p => p.estado === 'aprobado').length,
    facturado: pedidos.filter(p => p.estado === 'facturado').length,
  }

  const ESTADOS = [
    { key: 'todos', label: 'Todos', color: 'text-secondary' },
    { key: 'aprobado', label: 'Aprobados (Pendientes)', color: 'text-blue-400' },
    { key: 'facturado', label: 'Facturados', color: 'text-green-400' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="text-primary" size={26} />
            Facturación
          </h1>
          <p className="text-secondary text-sm mt-1">
            Gestión de facturas pendientes de emisión y comprobantes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SharedPeriodFilter 
            currentPeriod={selectedPeriod} 
            onPeriodChange={setSelectedPeriod} 
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <div className="glass-panel card p-4 flex flex-col gap-3 border border-white/5 justify-center">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-secondary" />
            <input 
              type="text" 
              placeholder="Buscar por número o cliente..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-transparent text-sm text-white outline-none w-full placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="glass-panel card p-4 flex flex-col gap-3 border border-white/5">
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

      {/* Orders Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">Lista de Comprobantes</span>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Nº Pedido', 'Empresa', 'Vendedor', 'Fecha', 'Estado', 'Acciones'].map(col => (
                  <th key={col} className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando facturas...</span>
                    </div>
                  </td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">No hay comprobantes</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-primary font-black text-xs">{p.numeroPedido}</td>
                    <td className="px-4 py-3 text-white font-semibold text-xs">{p.empresa?.nombre}</td>
                    <td className="px-4 py-3 text-secondary text-xs">{p.vendedorAlias}</td>
                    <td className="px-4 py-3 text-secondary text-xs whitespace-nowrap">
                      {formatDate(p.creadoEn)}
                    </td>
                    <td className="px-4 py-3">
                      {p.estado === 'facturado' ? (
                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-black uppercase inline-flex items-center gap-1 border border-green-500/20">
                          <CheckCircle2 size={10} /> Facturado
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase inline-flex items-center gap-1 border border-blue-500/20">
                          <Clock size={10} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Ver detalles */}
                        <button
                          onClick={() => setSelectedPedido(p)}
                          className="btn-action text-secondary border-white/5 hover:bg-white/5"
                          title="Ver detalles"
                        >
                          <Eye size={12} />
                        </button>
                        {userNivel < 3 && p.estado === 'aprobado' && (
                          <button
                            onClick={() => handleMarcarFacturado(p.id)}
                            className="btn-action text-green-400 border-green-400/20 hover:bg-green-400/10"
                            title="Marcar como Facturado"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        {/* Vista previa Factura A */}
                        <button
                          onClick={() => setPreviewInvoice({ id: p.id, tipo: 'A' })}
                          className="btn-action text-blue-400 border-blue-400/20 hover:bg-blue-400/10"
                          title="Ver Factura A"
                        >
                          <span className="text-[10px] font-bold">A</span>
                        </button>
                        {/* Vista previa Factura X */}
                        <button
                          onClick={() => setPreviewInvoice({ id: p.id, tipo: 'X' })}
                          className="btn-action text-orange-400 border-orange-400/20 hover:bg-orange-400/10"
                          title="Ver Remito X"
                        >
                          <span className="text-[10px] font-bold">X</span>
                        </button>
                        {/* Eliminar (Solo Nivel 1) */}
                        {userNivel === 1 && (
                          <button
                            onClick={() => handleDelete(p.id)}
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
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 p-4">
          {loading ? (
            <div className="py-8 text-center text-secondary text-sm">Cargando...</div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="py-8 text-center text-secondary text-sm">No hay comprobantes</div>
          ) : (
            pedidosFiltrados.map(p => (
              <div key={p.id} className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-primary font-bold text-sm">{p.numeroPedido}</p>
                    <p className="text-white font-semibold text-sm mt-1">{p.empresa?.nombre}</p>
                  </div>
                  {p.estado === 'facturado' ? (
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-black uppercase">
                      Facturado
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase">
                      Pendiente
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPedido(p)}
                      className="btn-action text-secondary border-white/5 hover:bg-white/5"
                    >
                      <Eye size={14} />
                    </button>
                    {userNivel < 3 && p.estado === 'aprobado' && (
                      <button
                        onClick={() => handleMarcarFacturado(p.id)}
                        className="btn-action text-green-400 border-green-400/20 hover:bg-green-400/10"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setPreviewInvoice({ id: p.id, tipo: 'A' })}
                      className="btn-action text-blue-400 border-blue-400/20 hover:bg-blue-400/10 px-2"
                    >
                      <span className="font-bold text-[10px]">A</span>
                    </button>
                    <button
                      onClick={() => setPreviewInvoice({ id: p.id, tipo: 'X' })}
                      className="btn-action text-orange-400 border-orange-400/20 hover:bg-orange-400/10 px-2"
                    >
                      <span className="font-bold text-[10px]">X</span>
                    </button>
                    {userNivel === 1 && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="btn-action text-red-500 border-red-500/20 hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <span className="text-secondary text-[10px]">{formatDate(p.creadoEn)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedPedido && (
        <PedidoDetalleModal 
          pedido={selectedPedido} 
          onClose={() => setSelectedPedido(null)} 
        />
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4 bg-[#111] p-4 rounded-xl border border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Vista Previa - {previewInvoice.tipo === 'A' ? 'Factura A' : 'Remito X'}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadPDF} 
                  disabled={isGenerating}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {isGenerating ? 'Generando...' : 'Descargar PDF'}
                </button>
                <button 
                  onClick={() => setPreviewInvoice(null)} 
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <X size={16} /> Cerrar
                </button>
              </div>
            </div>
            
            {/* Document Preview Area */}
            <div className="flex-1 overflow-auto flex justify-center bg-gray-900 rounded-xl border border-white/5 p-4 sm:p-8">
              <div className="shadow-2xl">
                {renderInvoicePreview()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
