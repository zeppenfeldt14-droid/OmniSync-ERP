'use client'

import { useState, useEffect } from 'react'
import { FileText, Search, FileDown, CheckCircle, Clock } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Utilidad para formatear moneda
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

export default function FacturacionClient({ userNivel, userAlias, userZona, zonasHabilitadas }: any) {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const fetchPedidos = async () => {
    try {
      const res = await fetch('/api/pedidos?estado=todos')
      const data = await res.json()
      if (Array.isArray(data)) {
        // Filtrar solo aprobados o facturados
        let filtrados = data.filter(p => p.estado === 'aprobado' || p.estado === 'facturado')
        
        // Si es nivel 3, solo ver los propios
        if (userNivel === 3) {
          filtrados = filtrados.filter(p => p.vendedorAlias === userAlias)
        }
        
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
  }, [])

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

  if (loading) {
    return <div className="text-white p-4">Cargando módulo de facturación...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="text-primary" size={26} />
            Módulo de Facturación
          </h1>
          <p className="text-secondary text-sm mt-1">
            Gestión de facturas pendientes de emisión
          </p>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
        <Search size={18} className="text-secondary" />
        <input 
          type="text" 
          placeholder="Buscar por pedido o cliente..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="bg-transparent text-white outline-none w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pedidosFiltrados.length === 0 ? (
          <p className="text-secondary p-4 text-center">No hay pedidos pendientes de facturar.</p>
        ) : (
          pedidosFiltrados.map(p => (
            <div key={p.id} className="glass-panel card p-4 border border-white/5 flex flex-col md:flex-row justify-between gap-4 md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-bold">{p.numeroPedido}</span>
                  {p.estado === 'facturado' ? (
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle size={12} /> Facturado
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase flex items-center gap-1">
                      <Clock size={12} /> Pendiente
                    </span>
                  )}
                </div>
                <p className="text-secondary text-sm">{p.empresa?.nombre}</p>
                <p className="text-secondary text-xs">Vendedor: {p.vendedorAlias}</p>
              </div>

              {/* Acciones solo para Nivel 1, 2, 4 */}
              {userNivel !== 3 && p.estado === 'aprobado' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDownloadPDF(p.id, 'A')}
                      className="btn bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/50 flex items-center gap-2 text-xs py-1"
                    >
                      <FileDown size={14} /> Factura A
                    </button>
                    <button 
                      onClick={() => handleDownloadPDF(p.id, 'X')}
                      className="btn bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/50 flex items-center gap-2 text-xs py-1"
                    >
                      <FileDown size={14} /> Remito X
                    </button>
                  </div>
                  <button 
                    onClick={() => handleMarcarFacturado(p.id)}
                    className="btn btn-primary w-full flex justify-center items-center gap-2 text-xs py-2"
                  >
                    <CheckCircle size={14} /> Marcar como Facturado
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
