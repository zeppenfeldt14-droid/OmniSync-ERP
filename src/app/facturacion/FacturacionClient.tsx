'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, Clock, Download, CheckCircle2 } from 'lucide-react'
import SharedPeriodFilter from '@/components/SharedPeriodFilter'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatDate } from '@/lib/date'

// Utilidad para formatear moneda
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

export default function FacturacionClient({ userNivel, userAlias, userZona, zonasHabilitadas }: any) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mes')
  const [selectedEstado, setSelectedEstado] = useState('todos') // 'todos', 'aprobado', 'facturado'

  const fetchPedidos = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pedidos?estado=todos')
      const data = await res.json()
      if (Array.isArray(data)) {
        // Filtrar solo aprobados o facturados
        let filtrados = data.filter(p => p.estado === 'aprobado' || p.estado === 'facturado')
        
        // Si es nivel 3, solo ver los propios
        if (userNivel === 3) {
          filtrados = filtrados.filter(p => p.vendedorAlias === userAlias)
        }

        // Filtro por estado
        if (selectedEstado !== 'todos') {
          filtrados = filtrados.filter(p => p.estado === selectedEstado)
        }

        // Filtro por periodo
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

  const handleDownloadPDF = async (pedidoId: number, tipo: 'A' | 'X') => {
    const p = pedidos.find(x => x.id === pedidoId)
    if (!p) return

    const div = document.createElement('div')
    // We create a container that looks exactly like a printed invoice
    const isFacturaA = tipo === 'A'
    
    // Filter details based on the invoice type split
    const detallesFiltrados = p.detalles.filter((d: any) => {
      const q = isFacturaA ? d.cajasFacturaA : d.cajasFacturaX
      return q > 0
    })

    const totalCajas = detallesFiltrados.reduce((acc: number, d: any) => acc + (isFacturaA ? d.cajasFacturaA : d.cajasFacturaX), 0)
    let subtotal = 0
    detallesFiltrados.forEach((d: any) => {
      const q = isFacturaA ? d.cajasFacturaA : d.cajasFacturaX
      subtotal += q * (d.precioCajaSnapshot || 0)
    })
    
    // Si es Factura A, IVA = 21% de la base. Si es X, sin IVA o recargo 3% si es transferencia
    const iva = isFacturaA ? subtotal * 0.21 : 0
    let recargo = 0
    if (!isFacturaA && p.metodoPagoB === 'transferencia') {
      recargo = subtotal * 0.03
    }
    const total = subtotal + iva + recargo

    const fecha = new Date(p.creadoEn).toLocaleDateString('es-AR')
    
    const logoHtml = `<img src="/logo.png" style="max-height: 40px; margin-bottom: 5px;" onerror="this.style.display='none'" />`

    div.innerHTML = `
      <div style="font-family: 'Helvetica', sans-serif; font-size: 12px; padding: 40px; color: #000; background: white; width: 800px; min-height: 1100px; box-sizing: border-box;">
        
        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; border-radius: 8px; padding: 20px; position: relative;">
          <!-- Tipo Letra Central -->
          <div style="position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%); background: white; padding: 0 10px; text-align: center;">
            <div style="font-size: 36px; font-weight: bold; border: 2px solid #000; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; margin: 0 auto; background: white;">${isFacturaA ? 'A' : 'X'}</div>
            <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">CÓD. 01</div>
          </div>

          <!-- Izquierda -->
          <div style="width: 45%;">
            ${isFacturaA ? logoHtml : ''}
            <div style="font-size: 28px; font-weight: 900; letter-spacing: 1px;">${isFacturaA ? 'NEOSOL' : 'LOS AMIGOS'}</div>
            <div style="font-size: 11px; margin-top: 10px;">
              <strong>Razón Social:</strong> ${isFacturaA ? 'Neosol S.A.' : 'Los Amigos S.R.L.'}<br/>
              <strong>Domicilio Comercial:</strong> Av. Siempre Viva 123, CABA<br/>
              <strong>Condición frente al IVA:</strong> Responsable Inscripto
            </div>
          </div>

          <!-- Derecha -->
          <div style="width: 45%; text-align: right;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">${isFacturaA ? 'FACTURA' : 'DOCUMENTO NO VÁLIDO COMO FACTURA'}</div>
            <div style="font-size: 12px; line-height: 1.6;">
              <strong>Punto de Venta:</strong> 0001 &nbsp;&nbsp; <strong>Comp. Nro:</strong> ${String(p.id).padStart(8, '0')}<br/>
              <strong>Fecha de Emisión:</strong> ${fecha}<br/>
              <strong>CUIT:</strong> 30-12345678-9<br/>
              <strong>Ingresos Brutos:</strong> 30-12345678-9<br/>
              <strong>Inicio de Actividades:</strong> 01/01/2020
            </div>
          </div>
        </div>

        <!-- CLIENTE -->
        <div style="border: 2px solid #000; border-radius: 8px; padding: 15px; margin-top: 15px;">
          <table style="width: 100%; font-size: 12px;">
            <tr>
              <td style="width: 50%;"><strong>CUIT:</strong> ${p.empresa?.cuit || 'Consumidor Final'}</td>
              <td style="width: 50%;"><strong>Razón Social:</strong> ${p.empresa?.nombre}</td>
            </tr>
            <tr>
              <td><strong>Condición frente al IVA:</strong> Responsable Inscripto</td>
              <td><strong>Domicilio:</strong> ${p.empresa?.direccion || 'S/D'}</td>
            </tr>
            <tr>
              <td><strong>Condición de Venta:</strong> Cuenta Corriente</td>
              <td></td>
            </tr>
          </table>
        </div>

        <!-- ITEMS -->
        <table style="width: 100%; margin-top: 15px; border-collapse: collapse; border: 2px solid #000;">
          <thead style="background: #eee; border-bottom: 2px solid #000;">
            <tr>
              <th style="padding: 8px; border-right: 1px solid #000; text-align: left; width: 10%;">Código</th>
              <th style="padding: 8px; border-right: 1px solid #000; text-align: left; width: 40%;">Producto / Servicio</th>
              <th style="padding: 8px; border-right: 1px solid #000; text-align: center; width: 10%;">Cantidad</th>
              <th style="padding: 8px; border-right: 1px solid #000; text-align: center; width: 10%;">U. Medida</th>
              <th style="padding: 8px; border-right: 1px solid #000; text-align: right; width: 15%;">Precio Unit.</th>
              <th style="padding: 8px; text-align: right; width: 15%;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${detallesFiltrados.map((d: any) => {
              const q = isFacturaA ? d.cajasFacturaA : d.cajasFacturaX;
              return `
                <tr>
                  <td style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #ddd; text-align: left;">${d.producto?.codigoInterno || 'N/A'}</td>
                  <td style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #ddd; text-align: left;">${d.producto?.nombre}</td>
                  <td style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #ddd; text-align: center;">${q}</td>
                  <td style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #ddd; text-align: center;">Cajas</td>
                  <td style="padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #ddd; text-align: right;">${fmt(d.precioCajaSnapshot)}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${fmt(q * (d.precioCajaSnapshot || 0))}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- TOTALES -->
        <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
          <div style="border: 2px solid #000; border-radius: 8px; width: 350px; padding: 15px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span><strong>Importe Neto Gravado:</strong></span>
              <span>${fmt(subtotal)}</span>
            </div>
            ${isFacturaA ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span><strong>IVA 21%:</strong></span>
              <span>${fmt(iva)}</span>
            </div>
            ` : ''}
            ${recargo > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span><strong>Recargo 3%:</strong></span>
              <span>${fmt(recargo)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; font-size: 16px;">
              <span><strong>Total:</strong></span>
              <span><strong>${fmt(total)}</strong></span>
            </div>
          </div>
        </div>

        <div style="margin-top: 40px; font-size: 10px; color: #555;">
          <p>Comprobante generado automáticamente por CRM Visitas - Pedido #${p.numeroPedido}</p>
        </div>
      </div>
    `
    div.style.position = 'absolute'
    div.style.top = '-9999px'
    div.style.left = '-9999px'
    document.body.appendChild(div)

    try {
      const canvas = await html2canvas(div.firstElementChild as HTMLElement, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${isFacturaA ? 'FacturaA' : 'RemitoX'}_${p.numeroPedido}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Error generando el PDF')
    } finally {
      document.body.removeChild(div)
    }
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
                        {userNivel < 3 && p.estado === 'aprobado' && (
                          <button
                            onClick={() => handleMarcarFacturado(p.id)}
                            className="btn-action text-green-400 border-green-400/20 hover:bg-green-400/10"
                            title="Marcar como Facturado"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        {/* Descarga Factura A */}
                        <button
                          onClick={() => handleDownloadPDF(p.id, 'A')}
                          className="btn-action text-blue-400 border-blue-400/20 hover:bg-blue-400/10"
                          title="Descargar Factura A"
                        >
                          <span className="text-[10px] font-bold">A</span>
                          <Download size={12} className="ml-1" />
                        </button>
                        {/* Descarga Factura X */}
                        <button
                          onClick={() => handleDownloadPDF(p.id, 'X')}
                          className="btn-action text-orange-400 border-orange-400/20 hover:bg-orange-400/10"
                          title="Descargar Remito X"
                        >
                          <span className="text-[10px] font-bold">X</span>
                          <Download size={12} className="ml-1" />
                        </button>
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
                    {userNivel < 3 && p.estado === 'aprobado' && (
                      <button
                        onClick={() => handleMarcarFacturado(p.id)}
                        className="btn-action text-green-400 border-green-400/20 hover:bg-green-400/10"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadPDF(p.id, 'A')}
                      className="btn-action text-blue-400 border-blue-400/20 hover:bg-blue-400/10 px-2"
                    >
                      <span className="font-bold text-[10px] mr-1">A</span> <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(p.id, 'X')}
                      className="btn-action text-orange-400 border-orange-400/20 hover:bg-orange-400/10 px-2"
                    >
                      <span className="font-bold text-[10px] mr-1">X</span> <Download size={14} />
                    </button>
                  </div>
                  <span className="text-secondary text-[10px]">{formatDate(p.creadoEn)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
