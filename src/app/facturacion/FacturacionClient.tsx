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
      const pages = invoiceRef.current.querySelectorAll('.pdf-page')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage()
        const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true })
        const imgData = canvas.toDataURL('image/png')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }
      
      pdf.save(`${previewInvoice.tipo === 'A' ? 'FacturaA' : 'RemitoX'}_${p.numeroPedido}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Error generando el PDF')
    } finally {
      setIsGenerating(false)
      setPreviewInvoice(null)
    }
  }

  const renderInvoicePreview = () => {
    if (!previewInvoice) return null
    const p = pedidos.find(x => x.id === previewInvoice.id)
    if (!p) return null

    const isFacturaA = previewInvoice.tipo === 'A'
    
    // Calcular la distribución de cajas
    const todosConSplit = p.detalles.every((d: any) => (d.cajasFacturaA + d.cajasFacturaX) > 0)

    const lineasNormales: any[] = []
    const lineasBonificadas: any[] = []

    let subtotal = 0
    let totalUnidades = 0
    let totalBultos = 0

    p.detalles.forEach((d: any) => {
      let cajasAsignadas = 0
      let cajasBonusAsignadas = 0
      
      if (todosConSplit) {
        cajasAsignadas = isFacturaA ? (d.cajasFacturaA || 0) : (d.cajasFacturaX || 0)
        cajasBonusAsignadas = isFacturaA ? (d.cajasBonusFacturaA || 0) : (d.cajasBonusFacturaX || 0)
      } else {
        const total = d.cantidadCajas || 0
        const mitad = Math.floor(total / 2)
        cajasAsignadas = isFacturaA ? mitad : (total - mitad)
        cajasBonusAsignadas = !isFacturaA ? (d.cajasBonus || 0) : 0
      }

      const isPromoItem = d.esPromocion || d.precioCajaSnapshot === 0 || d.subtotal === 0

      if (cajasAsignadas > 0) {
        lineasNormales.push({ ...d, cajasParaFactura: cajasAsignadas, esLineaBonus: isPromoItem })
        const sub = isPromoItem ? 0 : cajasAsignadas * (d.precioCajaSnapshot || 0)
        subtotal += sub
        totalBultos += cajasAsignadas
        totalUnidades += cajasAsignadas * (d.paqPorCajaSnapshot || 0)
      }
      
      if (cajasBonusAsignadas > 0) {
        lineasBonificadas.push({ ...d, cajasParaFactura: cajasBonusAsignadas, esLineaBonus: true })
        totalBultos += cajasBonusAsignadas
        totalUnidades += cajasBonusAsignadas * (d.paqPorCajaSnapshot || 0)
      }
    })

    const todosLosItems = [...lineasNormales, ...lineasBonificadas]
    
    const ITEMS_PER_PAGE = 15
    const pages = []
    for (let i = 0; i < Math.max(1, todosLosItems.length); i += ITEMS_PER_PAGE) {
      pages.push(todosLosItems.slice(i, i + ITEMS_PER_PAGE))
    }

    const pallets = Math.ceil(totalBultos / 60)
    
    const iva = isFacturaA ? subtotal * 0.21 : 0
    let recargo = 0
    if (!isFacturaA && p.metodoPagoB === 'transferencia') {
      recargo = subtotal * 0.03
    }
    const total = subtotal + iva + recargo
    
    const formateaFecha = (fechaStr: string) => {
      const f = new Date(fechaStr)
      return `${f.getDate().toString().padStart(2, '0')}/${(f.getMonth() + 1).toString().padStart(2, '0')}/${f.getFullYear()}`
    }
    const fecha = formateaFecha(p.creadoEn)
    const fechaVto = formateaFecha(p.fechaPagoA || p.fechaEntrega || p.creadoEn)

    return (
      <div ref={invoiceRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#333', padding: '20px' }}>
        {pages.map((pageItems, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1
          return (
            <div 
              key={pageIndex}
              className="pdf-page"
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '11px', 
                padding: '40px', 
                color: '#000', 
                background: 'white', 
                width: '794px', 
                height: '1123px', 
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {/* HEADER TOP ROW */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '40%', paddingTop: '10px' }}>
                  {logo && (
                    <img 
                      src={logo}
                      crossOrigin={logo.startsWith('data:') ? undefined : 'anonymous'}
                      style={{ maxHeight: '70px', marginBottom: '10px', display: 'block', objectFit: 'contain' }} 
                      alt="Logo" 
                    />
                  )}
                  <div style={{ fontSize: '12px' }}>
                    General Lavalle 399 Piso:0 - Avellaneda, Buenos Aires
                  </div>
                </div>

                <div style={{ width: '20%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ border: '1px solid #000', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                    {isFacturaA ? 'A' : 'X'}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '5px', fontWeight: 'bold' }}>
                    {isFacturaA ? 'COD. 1' : 'COD. 901'}
                  </div>
                </div>

                <div style={{ width: '40%', textAlign: 'center', marginTop: '10px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                    {isFacturaA ? 'FACTURA A' : 'FACTURA X'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
                    N° {isFacturaA ? '00005' : '00001'} - {String(p.id).padStart(8, '0')}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '5px' }}>
                    Fecha: {fecha}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    Vto. para el pago: {fechaVto}
                  </div>
                </div>
              </div>

              {/* HEADER BOTTOM ROW */}
              <div style={{ display: 'flex', marginTop: '30px' }}>
                <div style={{ width: '50%', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '5px' }}>
                    HOJA {pageIndex + 1}/{pages.length}
                  </div>
                  <div>IVA: Responsable Inscripto</div>
                </div>
                <div style={{ width: '1px', background: '#000' }}></div>
                <div style={{ width: '50%', textAlign: 'center', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>CUIT: 30718104137</div>
                  <div>IIBB: {isFacturaA ? '30718104137' : ''}</div>
                  <div>Inicio de actividad: {isFacturaA ? '01/09/2023' : '-'}</div>
                </div>
              </div>

              <div style={{ height: '1px', background: '#000', width: '100%', margin: '10px 0' }}></div>

              {/* DATOS DEL CLIENTE */}
              <div style={{ fontSize: '11px', lineHeight: '1.8' }}>
                <div>Señor(es): <strong>{p.empresa?.nombre}</strong></div>
                <div>Domicilio: {p.empresa?.direccion || 'S/D'}</div>
                <div>CUIT: {p.empresa?.cuit || 'Consumidor Final'}</div>
                <div>IVA: Responsable Inscripto</div>
              </div>

              <div style={{ height: '1px', background: '#000', width: '100%', margin: '15px 0' }}></div>

              {/* DATOS DE VENTA */}
              <div style={{ fontSize: '11px', lineHeight: '1.8', marginBottom: '15px' }}>
                <div>Remito: {String(p.id).padStart(5, '0')}-00000000</div>
                <div>Orden de Compra: {p.id}</div>
              </div>

              {/* TABLA DE PRODUCTOS */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 'bold', width: '10%' }}>Código</th>
                    <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 'bold', width: '45%' }}>Descripcion</th>
                    <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 'bold', width: '8%' }}>Cantidad</th>
                    <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', width: '12%' }}>Precio unitario</th>
                    <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', width: '12%' }}>Bonif.</th>
                    <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', width: '5%' }}>IVA</th>
                    <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', width: '8%' }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((d: any, idx: number) => {
                    const q = d.cajasParaFactura
                    const desc = `${d.producto?.codigoInterno || ''} - NEOSOL - ${d.producto?.nombre} ${d.producto?.descripcion || ''}`.trim()
                    const unitPrice = d.esLineaBonus ? (d.producto?.precioCaja || d.precioCajaOriginal || 0) : (d.precioCajaSnapshot || 0)
                    const sub = d.esLineaBonus ? 0 : q * unitPrice
                    const bonifText = d.esLineaBonus ? `${fmt(unitPrice)} (100.00%)` : '$ 0,00 (0.00%)'
                    
                    return (
                      <tr key={idx} style={{ verticalAlign: 'top' }}>
                        <td style={{ padding: '8px 0', textAlign: 'left' }}>{d.producto?.codigoInterno || 'N/A'}</td>
                        <td style={{ padding: '8px 0', textAlign: 'left', maxWidth: '300px' }}>{desc}</td>
                        <td style={{ padding: '8px 0', textAlign: 'center' }}>{q.toFixed(2)}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                          {fmt(unitPrice)}
                        </td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>{bonifText}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>$ 0,00</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>{fmt(sub)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* FOOTER: KPI LOGISTICOS Y TOTALES (SOLO EN LA ÚLTIMA HOJA) */}
              {isLastPage && (
                <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
                  <div style={{ height: '1px', background: '#ddd', width: '100%', margin: '15px 0' }}></div>
                  
                  {/* KPIs */}
                  <div style={{ display: 'flex', gap: '40px', fontSize: '11px', textAlign: 'left', marginBottom: '20px' }}>
                    <div>
                      <div style={{ marginBottom: '5px' }}>Bultos</div>
                      <div>{totalBultos}</div>
                    </div>
                    <div>
                      <div style={{ marginBottom: '5px' }}>Pallets</div>
                      <div>{pallets}</div>
                    </div>
                    <div>
                      <div style={{ marginBottom: '5px' }}>Peso (Kgs)</div>
                      <div>0.00</div>
                    </div>
                    <div>
                      <div style={{ marginBottom: '5px' }}>Unidades</div>
                      <div>{totalUnidades}</div>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#ddd', width: '100%', margin: '15px 0' }}></div>

                  {/* Totales */}
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Importe Exento</span>
                      <span>$ 0,00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Importe Neto No Gravado</span>
                      <span>{isFacturaA ? '$ 0,00' : fmt(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Importe Neto Gravado</span>
                      <span>{isFacturaA ? fmt(subtotal) : '$ 0,00'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>IVA {isFacturaA ? '21%' : ''}</span>
                      <span>{fmt(iva)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '5px', fontWeight: 'bold' }}>
                      <span>TOTAL</span>
                      <span>{fmt(total)}</span>
                    </div>
                  </div>

                  {/* QR y CAE */}
                  {isFacturaA && (
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ width: '80px', height: '80px', background: 'url(https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg)', backgroundSize: 'cover' }}></div>
                      <div style={{ textAlign: 'right', fontSize: '10px' }}>
                        <div>CAE Nº: 86240091668438</div>
                        <div>Fecha Vto. de CAE: 27/06/2026</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
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
