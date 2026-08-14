import { useEffect, useState } from 'react'
import {
  ShoppingCart,
  Download,
  XCircle,
  Package,
  FileText,
  Globe,
  Calendar,
  Calculator,
  User
} from 'lucide-react'
import { formatDate } from '@/lib/date'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Props {
  pedido: any
  onClose: () => void
  onStateChange?: (id: number, action: string, data?: any) => void
  onRequestFacturar?: () => void
  userNivel?: number
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_supervisor: 'Pendiente',
  aprobado: 'Aprobado',
  cancelado: 'Cancelado',
}

const ESTADO_BADGES: Record<string, string> = {
  borrador: 'bg-white/5 text-secondary border-white/10',
  pendiente_supervisor: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  aprobado: 'bg-green-400/10 text-green-400 border-green-400/20',
  cancelado: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export function PedidoDetalleModal({ pedido, onClose, onStateChange, onRequestFacturar, userNivel = 3 }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const [activeList, setActiveList] = useState<any>(null)
  const [loadingList, setLoadingList] = useState(true)
  
  // Modal de Aprobación/Facturación
  const [showFacturaModal, setShowFacturaModal] = useState(false)
  const [facturaSplits, setFacturaSplits] = useState<Record<string, { A: number, X: number }>>({})
  const [fechaEntrega, setFechaEntrega] = useState(pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toISOString().split('T')[0] : '')
  const [metodoPagoB, setMetodoPagoB] = useState('Efectivo')

  useEffect(() => {
    fetch('/api/configuracion/tarifas')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const list = data.find((l: any) => l.activa && new Date(l.vigenteDesde) <= new Date())
          if (list) setActiveList(list)
        }
        setLoadingList(false)
      })
      .catch((e) => {
        console.error(e)
        setLoadingList(false)
      })
  }, [])

  const handlePrintPedido = async () => {
    const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    const div = document.createElement('div')
    div.innerHTML = `
      <div style="font-family: 'Helvetica Neue', sans-serif; font-size: 11px; padding: 20px; color: #222; background: white; width: 800px;">
        <div style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 20px; font-weight: 900; color: #444;">NEOSOL</div>
            <p><strong>${pedido.estado === 'presupuesto' ? 'Presupuesto' : 'Pedido'}:</strong> ${pedido.numeroPedido}</p>
            <p><strong>Cliente:</strong> ${pedido.empresa?.nombre || ''} ${pedido.empresa?.cuit ? `(CUIT: ${pedido.empresa.cuit})` : ''}</p>
            <p><strong>Vendedor:</strong> ${pedido.vendedorAlias || ''} | <strong>Zona:</strong> ${pedido.zona || ''}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Fecha:</strong> ${new Date(pedido.creadoEn).toLocaleString('es-AR')}</p>
            <p><strong>Estado:</strong> ${ESTADO_LABELS[pedido.estado] || pedido.estado}</p>
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
            ${pedido.detalles.map((d: any) => `
              <tr>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left;">${d.producto?.codigoInterno || d.productoId}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left;">${d.productoNombre}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center;">${d.producto?.paqPorCaja || '-'}</td>
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
            <tr><td style="padding: 4px; text-align: left;">Subtotal Neto:</td><td style="padding: 4px; text-align: right;">${fmt(pedido.subtotalSinIVA)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;">IVA (21%):</td><td style="padding: 4px; text-align: right;">${fmt(pedido.montoIVA)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;">Recargo Financiación:</td><td style="padding: 4px; text-align: right;">${fmt(pedido.montoFinanciera)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;"><h3>Total General:</h3></td><td style="padding: 4px; text-align: right;"><h3>${fmt(pedido.totalGeneral)}</h3></td></tr>
          </table>
        </div>
        <div style="margin-top: 30px; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          ${pedido.observaciones ? `<p><strong>Observaciones:</strong> ${pedido.observaciones}</p>` : ''}
          <p>Condición de Pago: ${pedido.condicionPago || 'N/A'}</p>
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
      pdf.save(`${pedido.estado === 'presupuesto' ? 'Presupuesto' : 'Pedido'}_${pedido.numeroPedido}.pdf`)
    } finally {
      document.body.removeChild(div)
    }
  }

  // Determinar motivo de aprobación si es necesario
  let approvalReason = '';
  if (pedido.estado === 'pendiente_supervisor' && pedido.tienePrecioNegociado) {
    let hasCustomPrice = false;
    for (const d of pedido.detalles) {
      const priceRecords = activeList?.precios || [];
      const pRecord = priceRecords.find((pr: any) => pr.productoId === d.productoId);
      const priceA = pRecord ? pRecord.precioCajaMax : (d.producto?.precioCaja || d.precioCajaOriginal);
      const priceB = pRecord ? pRecord.precioCajaMin : (d.producto?.precioCaja || d.precioCajaOriginal);
      const val = parseFloat(d.precioCajaSnapshot);
      
      const isListA = Math.abs(val - priceA) < 0.01;
      const isListB = Math.abs(val - priceB) < 0.01;
      const isCustom = !isListA && !isListB && Math.abs(val - d.precioCajaOriginal) > 0.01;
      
      if (isCustom) hasCustomPrice = true;
    }
    approvalReason = hasCustomPrice ? '(Precio individual modificado)' : '(Excede límite tarifa volumen)';
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-white/10 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-primary" size={20} />
            <h3 className="text-white font-bold text-lg">{pedido.estado === 'presupuesto' ? 'Presupuesto' : 'Pedido'} {pedido.numeroPedido}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
              pedido.estado === 'pendiente_supervisor' 
                ? (pedido.tienePrecioNegociado ? 'bg-orange-400/10 text-orange-400 border-orange-400/20' : 'bg-purple-400/10 text-purple-400 border-purple-400/20')
                : ESTADO_BADGES[pedido.estado] || ''
            }`}>
              {pedido.estado === 'pendiente_supervisor' 
                ? (pedido.tienePrecioNegociado ? 'Pend. Aprob.' : 'Pend. Factura')
                : ESTADO_LABELS[pedido.estado] || pedido.estado}
            </span>
            {approvalReason && (
              <span className="text-orange-400/80 text-[10px] italic font-semibold ml-1">
                {approvalReason}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPedido}
              className="btn btn-secondary text-xs p-2 flex items-center justify-center font-bold"
              style={{ minWidth: '32px', minHeight: '32px', borderRadius: '8px' }}
              title="Descargar Pedido"
            >
              <Download size={14} />
            </button>
            <button
              onClick={onClose}
              className="btn-action ml-2 w-8 h-8"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
          {/* Info General */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl text-xs">
            <div>
              <span className="text-secondary block mb-1">Cliente</span>
              <strong className="text-white text-sm">{pedido.empresa.nombre}</strong>
              {pedido.empresa.cuit && <span className="block text-[10px] text-white/50 mt-0.5">CUIT: {pedido.empresa.cuit}</span>}
            </div>
            <div>
              <span className="text-secondary block mb-1">Zona</span>
              <strong className="text-white text-sm uppercase">{pedido.zona}</strong>
            </div>
            <div>
              <span className="text-secondary block mb-1">Vendedor</span>
              <strong className="text-white text-sm">{pedido.vendedorAlias}</strong>
            </div>
            <div>
              <span className="text-secondary block mb-1">Fecha de Creación</span>
              <strong className="text-white text-sm">
                {formatDate(pedido.creadoEn)} {new Date(pedido.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </strong>
            </div>
          </div>

          {/* Detalles de Productos */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package size={14} className="text-primary" /> Productos del Pedido
            </h4>
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-secondary uppercase tracking-widest">
                    <th className="px-4 py-2">Cód</th>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2 text-center">Paq/Caja</th>
                    <th className="px-4 py-2 text-right">Precio Caja</th>
                    <th className="px-4 py-2 text-center">Cantidad</th>
                    <th className="px-4 py-2 text-center">Bonus</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.detalles.map((d: any) => {
                    const priceRecords = activeList?.precios || [];
                    const pRecord = priceRecords.find((pr: any) => pr.productoId === d.productoId);
                    const priceA = pRecord ? pRecord.precioCajaMax : (d.producto?.precioCaja || d.precioCajaOriginal);
                    const priceB = pRecord ? pRecord.precioCajaMin : (d.producto?.precioCaja || d.precioCajaOriginal);
                    const val = parseFloat(d.precioCajaSnapshot);
                    
                    const isListA = Math.abs(val - priceA) < 0.01;
                    const isListB = Math.abs(val - priceB) < 0.01;
                    const isCustom = !isListA && !isListB && Math.abs(val - d.precioCajaOriginal) > 0.01;
                    
                    let tagText = '';
                    let tagColor = '';
                    
                    if (isCustom) {
                      tagText = 'Cambio de Tarifa';
                      tagColor = 'text-red-500';
                    } else if (isListA) {
                      tagText = 'Lista A';
                      tagColor = 'text-green-400';
                    } else if (isListB) {
                      tagText = 'Lista B';
                      tagColor = 'text-yellow-400';
                    } else if (Math.abs(val - d.precioCajaOriginal) > 0.01) {
                      tagText = 'Negociada';
                      tagColor = 'text-yellow-400';
                    }

                    return (
                      <tr key={d.id} className="border-b border-white/5 text-white/90">
                        <td className="px-4 py-3 text-primary font-bold">{d.producto?.codigoInterno || '—'}</td>
                        <td className="px-4 py-3 font-semibold">{d.productoNombre}</td>
                        <td className="px-4 py-3 text-center text-secondary">{d.producto?.paqPorCaja || '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {fmt(d.precioCajaSnapshot)}
                          {loadingList ? (
                            <span className="block text-[9px] font-bold uppercase mt-0.5 text-secondary">
                              [Cargando Tarifa...]
                            </span>
                          ) : (
                            tagText && (
                              <span className={`block text-[9px] font-bold uppercase mt-0.5 ${tagColor}`}>
                                [{tagText}]
                              </span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-white">{d.cantidadCajas}</td>
                        <td className="px-4 py-3 text-center">
                          {d.cajasBonus > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black" title={d.descripcionBonus || ''}>
                              +{d.cajasBonus} reg
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-white">{fmt(d.subtotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Negociación & Logística */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <FileText size={14} className="text-secondary" /> Condiciones de Venta
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-secondary block mb-0.5">Condición de Pago</span>
                  <strong className="text-white">{pedido.condicionPago || '—'}</strong>
                </div>
                <div>
                  <span className="text-secondary block mb-0.5">Recargo Financiera (3%)</span>
                  <strong className={pedido.aplicaFinanciera ? 'text-primary font-black' : 'text-white/40'}>
                    {pedido.aplicaFinanciera ? 'SÍ' : 'NO'}
                  </strong>
                </div>
                {pedido.plazosPago && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Plazos Especiales</span>
                    <strong className="text-white">{pedido.plazosPago}</strong>
                  </div>
                )}
                {pedido.acuerdosComerciales && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Acuerdos Comerciales</span>
                    <strong className="text-yellow-400 font-semibold">{pedido.acuerdosComerciales}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <Globe size={14} className="text-secondary" /> Logística e Indicadores
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-secondary block mb-0.5">Requiere Presupuesto</span>
                  <strong className="text-white">{pedido.requierePresupuesto ? 'SÍ' : 'NO'}</strong>
                </div>
                <div>
                  <span className="text-secondary block mb-0.5">Turno de Entrega</span>
                  <strong className="text-white">{pedido.turnoEntrega || '—'}</strong>
                </div>
                {pedido.fechaEntrega && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Día de Entrega Acordado</span>
                    <strong className="text-green-400 flex items-center gap-1 font-bold text-sm bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg w-max mt-1">
                      <Calendar size={13} />
                      {formatDate(pedido.fechaEntrega)}
                    </strong>
                  </div>
                )}
                {pedido.observaciones && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Observaciones</span>
                    <strong className="text-white font-normal">{pedido.observaciones}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Totales y Facturación Split */}
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl flex flex-col gap-4">
            <h4 className="text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-primary/20 pb-2">
              <Calculator size={14} className="text-primary" /> Liquidación e Impuestos
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-primary/70 block text-[10px] uppercase font-black tracking-wider mb-1">Subtotal s/IVA</span>
                <strong className="text-white font-bold">{fmt(pedido.subtotalSinIVA)}</strong>
              </div>
              <div>
                <span className="text-primary/70 block text-[10px] uppercase font-black tracking-wider mb-1">IVA (21% s/Parte A)</span>
                <strong className="text-blue-400 font-bold">{fmt(pedido.montoIVA)}</strong>
                <span className="block text-[9px] text-secondary font-semibold mt-0.5">({pedido.porcentajePagoA}% facturado en A)</span>
              </div>
              <div>
                <span className="text-primary/70 block text-[10px] uppercase font-black tracking-wider mb-1">Cargo Fin. (3%)</span>
                <strong className="text-orange-400 font-bold">{fmt(pedido.montoFinanciera)}</strong>
              </div>
              <div>
                <span className="text-primary block text-[10px] uppercase font-black tracking-wider mb-1">TOTAL GENERAL</span>
                <strong className="text-green-400 font-black text-xl">{fmt(pedido.totalGeneral)}</strong>
              </div>
            </div>
          </div>
          {/* Auditoría */}
          {pedido.aprobadoPorAlias && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2">
              <User size={13} />
              Aprobado por: <strong>{pedido.aprobadoPorAlias}</strong> el <strong>{pedido.aprobadoEn ? formatDate(pedido.aprobadoEn) : '—'}</strong>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex items-center justify-between shrink-0 bg-black/40 rounded-b-2xl">
          <div className="flex gap-2">
            {pedido.estado === 'pendiente_supervisor' && userNivel < 3 && onStateChange && (
              <>
                {pedido.tienePrecioNegociado ? (
                  <button
                    onClick={() => {
                      if (userNivel === 1) {
                        if (confirm('¿Aprobar Tarifa Negociada para este pedido? El pedido pasará a Pendiente de Factura.')) {
                          onStateChange(pedido.id, 'aprobar_precio');
                        }
                      } else {
                        alert('Este pedido contiene precios/tarifas negociadas y requiere aprobación de Gerencia (Nivel 1).');
                      }
                    }}
                    className="btn btn-primary text-xs bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30 font-bold"
                  >
                    Aprobar Tarifa
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onRequestFacturar) {
                        onRequestFacturar();
                      } else {
                        // Calcular defaults
                        const defaults: Record<number, { A: number, X: number }> = {}
                        pedido.detalles.forEach((l: any) => {
                          const total = l.cantidadCajas
                          // Por defecto cajas bonificadas van a Factura X
                          if (l.esPromocion || l.precioCajaSnapshot === 0 || l.subtotal === 0) {
                            defaults[l.productoId] = { A: 0, X: total }
                          } else if (total === 15) { defaults[l.productoId] = { A: 7, X: 8 } }
                          else if (total === 5) { defaults[l.productoId] = { A: 2, X: 3 } }
                          else {
                            const halfA = Math.floor(total / 2)
                            defaults[l.productoId] = { A: halfA, X: total - halfA }
                          }
                        })
                        setFacturaSplits(defaults)
                        setShowFacturaModal(true)
                      }
                    }}
                    className="btn btn-primary text-xs bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 font-bold"
                  >
                    Asignar Fecha y Facturar
                  </button>
                )}
                <button
                  onClick={() => onStateChange(pedido.id, 'cancelar')}
                  className="btn btn-outline border-red-500/30 text-red-500 hover:bg-red-500/20 text-xs font-bold"
                >
                  Cancelar Pedido
                </button>
              </>
            )}
            {pedido.estado === 'borrador' && onStateChange && (
              <button
                onClick={() => onStateChange(pedido.id, 'enviar')}
                className="btn btn-primary text-xs font-bold"
              >
                Enviar a Supervisor
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary text-xs"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>

      {showFacturaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Aprobar Pedido y Desglosar Facturación
              </h2>
              <button onClick={() => setShowFacturaModal(false)} className="text-secondary hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-secondary uppercase font-bold mb-1">Fecha de Entrega</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={fechaEntrega}
                      onChange={e => setFechaEntrega(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-secondary uppercase font-bold mb-1">Modo de Pago (Remito)</label>
                  <select
                    value={metodoPagoB}
                    onChange={e => setMetodoPagoB(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
              </div>

              <h3 className="text-white font-bold text-xs mt-2 border-b border-white/10 pb-2">Distribución de Cajas</h3>

              <div className="flex flex-col gap-2">
                {pedido.detalles.map((l: any) => {
                  const split = facturaSplits[l.productoId] || { A: 0, X: 0 }
                  const valid = split.A + split.X === l.cantidadCajas
                  const esPromo = l.esPromocion || l.precioCajaSnapshot === 0 || l.subtotal === 0
                  
                  return (
                    <div key={l.productoId} className={`p-3 rounded-xl border ${valid ? 'border-white/10 bg-black/30' : 'border-red-500/50 bg-red-500/10'}`}>
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div className="flex flex-col flex-1">
                          <span className="text-white text-sm font-bold flex items-center gap-2">
                            {l.productoNombre}
                            {esPromo && <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Bonificadas 100%</span>}
                          </span>
                          <span className="text-secondary text-xs">Total Pedido: <strong className="text-white">{l.cantidadCajas} cajas</strong></span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase font-black text-secondary">Factura A:</label>
                            <input
                              type="number" min="0" max={l.cantidadCajas}
                              value={split.A}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0
                                setFacturaSplits(prev => ({
                                  ...prev,
                                  [l.productoId]: { A: val, X: l.cantidadCajas - val }
                                }))
                              }}
                              className="w-16 bg-black border border-white/20 rounded-lg px-2 py-1 text-white text-center text-sm focus:border-primary outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase font-black text-secondary">Factura X:</label>
                            <input
                              type="number" min="0" max={l.cantidadCajas}
                              value={split.X}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0
                                setFacturaSplits(prev => ({
                                  ...prev,
                                  [l.productoId]: { A: l.cantidadCajas - val, X: val }
                                }))
                              }}
                              className={`w-16 bg-black border rounded-lg px-2 py-1 text-center text-sm outline-none ${valid ? 'border-white/20 text-white focus:border-primary' : 'border-red-500 text-red-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Sección Cajas Bonificadas (Promoción) */}
              {pedido.detalles.some((l: any) => l.cajasBonus > 0) && (
                <>
                  <h3 className="text-yellow-400 font-bold text-xs mt-2 border-b border-yellow-400/20 pb-2 flex items-center gap-2">
                    🎁 Cajas Bonificadas — Promoción (Bonif. 100%)
                  </h3>
                  <p className="text-secondary text-[10px] -mt-2">Por defecto van a Factura X (Remito). Editables para ajuste si es necesario.</p>
                  <div className="flex flex-col gap-2">
                    {pedido.detalles.filter((l: any) => l.cajasBonus > 0).map((l: any) => {
                      const bonusSplit = facturaSplits[`bonus_${l.productoId}`] || { A: 0, X: l.cajasBonus }
                      const bonusValid = bonusSplit.A + bonusSplit.X === l.cajasBonus
                      return (
                        <div key={`bonus_${l.productoId}`} className="p-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5">
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                            <div className="flex flex-col flex-1">
                              <span className="text-yellow-400 text-sm font-bold flex items-center gap-2">
                                {l.productoNombre}
                                <span className="bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Bonif. 100%</span>
                              </span>
                              <span className="text-secondary text-xs">Cajas bonus: <strong className="text-yellow-400">{l.cajasBonus} cajas</strong></span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] uppercase font-black text-secondary">Fact. A:</label>
                                <input
                                  type="number" min="0" max={l.cajasBonus}
                                  value={bonusSplit.A}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0
                                    setFacturaSplits(prev => ({
                                      ...prev,
                                      [`bonus_${l.productoId}`]: { A: val, X: l.cajasBonus - val }
                                    }))
                                  }}
                                  className="w-16 bg-black border border-yellow-400/30 rounded-lg px-2 py-1 text-yellow-400 text-center text-sm focus:border-yellow-400 outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] uppercase font-black text-secondary">Fact. X:</label>
                                <input
                                  type="number" min="0" max={l.cajasBonus}
                                  value={bonusSplit.X}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0
                                    setFacturaSplits(prev => ({
                                      ...prev,
                                      [`bonus_${l.productoId}`]: { A: l.cajasBonus - val, X: val }
                                    }))
                                  }}
                                  className={`w-16 bg-black border rounded-lg px-2 py-1 text-center text-sm outline-none ${bonusValid ? 'border-yellow-400/30 text-yellow-400 focus:border-yellow-400' : 'border-red-500 text-red-400'}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-black/50">
              <button 
                onClick={() => setShowFacturaModal(false)}
                className="btn text-secondary hover:text-white px-4 py-2"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const allValid = pedido.detalles.every((l: any) => {
                    const split = facturaSplits[l.productoId] || { A: 0, X: 0 }
                    return split.A + split.X === l.cantidadCajas
                  })
                  if (!allValid) {
                    alert("La suma de cajas A y X debe ser igual al total pedido para todos los productos.")
                    return
                  }
                  if (!fechaEntrega) {
                    alert("Por favor ingrese una fecha de entrega.")
                    return
                  }
                  
                  if (onStateChange) {
                    onStateChange(pedido.id, 'aprobar', { 
                      splits: facturaSplits, 
                      fechaEntrega, 
                      metodoPagoB 
                    })
                  }
                  setShowFacturaModal(false)
                  onClose()
                }}
                className="btn btn-primary px-6 py-2 shadow-lg shadow-primary/20 flex items-center gap-2 font-bold"
              >
                Confirmar y Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

