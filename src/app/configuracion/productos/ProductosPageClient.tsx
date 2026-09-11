'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Package, Plus, Pencil, Trash2, Download, Search,
  Save, X, CheckCircle2, AlertCircle, RefreshCw,
  Printer, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Percent, Link2, Check, FileSpreadsheet
} from 'lucide-react'
import BulkPriceSheetSyncModal from '@/components/precios/BulkPriceSheetSyncModal'

interface Producto {
  id: number
  codigoInterno: string
  nombre: string
  linea: string
  precioPaquete: number
  paqPorCaja: number
  precioCaja: number
  activo: boolean
  precioPaqueteMin?: number
  precioCajaMin?: number
  precioPaqueteMax?: number
  precioCajaMax?: number
}

interface Props {
  userNivel: number
}

const LINEAS: Record<string, string> = {
  pack_individual: 'Línea Pack Individual',
  tripack:         'Línea Tripack',
  minis:           'Línea Minis',
  snacks:          'Línea Snacks Horneados',
}

const LINEAS_OPTS = Object.entries(LINEAS)
const IVA = 0.21

const EMPTY_FORM = {
  codigoInterno: '', nombre: '', linea: 'pack_individual',
  precioPaquete: '', paqPorCaja: '', precioCaja: '',
}

export function ProductosPageClient({ userNivel }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading]     = useState(true)
  const [seeding, setSeeding]     = useState(false)
  const [search, setSearch]       = useState('')
  const [filtroLinea, setFiltroLinea] = useState<string>('todas')
  const [showInactivos, setShowInactivos] = useState(false)
  const [tarifaVer, setTarifaVer] = useState<'min' | 'max'>('max')
  const [priceLists, setPriceLists] = useState<any[]>([])
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [selectedUnidadFiltro, setSelectedUnidadFiltro] = useState<string | null>(null)
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<string[]>([])
  const [copiedPrecios, setCopiedPrecios] = useState(false)

  const handleCopyPreciosLink = () => {
    const link = `${window.location.origin}/precios-publicos`
    navigator.clipboard.writeText(link)
      .then(() => { setCopiedPrecios(true); setTimeout(() => setCopiedPrecios(false), 2500) })
      .catch(err => console.error('Error al copiar link:', err))
  }

  // Modal state
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [editTarget, setEditTarget] = useState<Producto | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [msgOk, setMsgOk]     = useState('')
  const [msgErr, setMsgErr]   = useState('')

  // Tarifa / Aumento Masivo State
  const [showAumentoModal, setShowAumentoModal] = useState(false)
  const [showSyncSheetModal, setShowSyncSheetModal] = useState(false)
  const [isNewList, setIsNewList] = useState(true)
  const [newListNombre, setNewListNombre] = useState('')
  const [newListVigencia, setNewListVigencia] = useState('')
  const [aumentoPorcentaje, setAumentoPorcentaje] = useState('')
  const [aumentoTarifaTipo, setAumentoTarifaTipo] = useState<'ambas'|'min'|'max'>('ambas')
  const [editListTarget, setEditListTarget] = useState<any | null>(null)
  const [processingTarifa, setProcessingTarifa] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const getProductPrices = useCallback((p: Producto) => {
    const selectedList = priceLists.find(l => l.id === selectedListId)
    const priceRecord = selectedList?.precios.find((pr: any) => pr.productoId === p.id)
    
    if (priceRecord) {
      return {
        precioPaquete: tarifaVer === 'min' ? priceRecord.precioPaqueteMin : priceRecord.precioPaqueteMax,
        precioCaja: tarifaVer === 'min' ? priceRecord.precioCajaMin : priceRecord.precioCajaMax,
      }
    }
    
    return {
      precioPaquete: tarifaVer === 'min' ? Number((p.precioPaquete * 1.15).toFixed(2)) : p.precioPaquete,
      precioCaja: tarifaVer === 'min' ? Number((p.precioCaja * 1.15).toFixed(2)) : p.precioCaja,
    }
  }, [priceLists, selectedListId, tarifaVer])

  // ─── Fetch products ────────────────────────────────────────────────────
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/productos')
      const data = await res.json()
      setProductos(Array.isArray(data) ? data : [])
      
      const listsRes = await fetch('/api/configuracion/tarifas')
      const listsData = await listsRes.json()
      if (Array.isArray(listsData) && listsData.length > 0) {
        setPriceLists(listsData)
        
        // Extract unique Business Units
        const uniqueUnidades = Array.from(new Set(listsData.map((l: any) => l.unidadNegocio || 'Gerencia Comercial'))) as string[]
        setUnidadesDisponibles(uniqueUnidades)
        
        let initialUnidad = uniqueUnidades[0]
        if (selectedUnidadFiltro && uniqueUnidades.includes(selectedUnidadFiltro)) {
          initialUnidad = selectedUnidadFiltro
        } else {
          setSelectedUnidadFiltro(initialUnidad)
        }

        const listsForUnidad = listsData.filter((l: any) => (l.unidadNegocio || 'Gerencia Comercial') === initialUnidad)

        const now = new Date()
        let active = listsForUnidad.find((l: any) => l.activa && new Date(l.vigenteDesde) <= now)
        if (!active && listsForUnidad.length > 0) {
           active = listsForUnidad[0]
        }
        
        if (active) {
          setSelectedListId(active.id)
        } else if (listsData[0]) {
          setSelectedListId(listsData[0].id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProductos() }, [fetchProductos])

  // Auto-seed if empty
  useEffect(() => {
    if (!loading && productos.length === 0) {
      handleSeed()
    }
  }, [loading, productos.length])

  // ─── Seed handler ──────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/productos/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) await fetchProductos()
    } finally {
      setSeeding(false)
    }
  }

  // ─── Filter ───────────────────────────────────────────────────────────
  const filtered = productos.filter(p => {
    if (!showInactivos && !p.activo) return false
    if (filtroLinea !== 'todas' && p.linea !== filtroLinea) return false
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase()) &&
        !p.codigoInterno.includes(search)) return false
    return true
  })

  const byLinea = filtered.reduce((acc, p) => {
    const l = p.linea || 'otros'
    if (!acc[l]) acc[l] = []
    acc[l].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  // ─── Open modals ───────────────────────────────────────────────────────
  const openCrear = () => {
    setForm(EMPTY_FORM)
    setMsgOk(''); setMsgErr('')
    setModal('crear')
  }

  const openEditar = (p: Producto) => {
    setEditTarget(p)
    setForm({
      codigoInterno: p.codigoInterno,
      nombre: p.nombre,
      linea: p.linea,
      precioPaquete: String(p.precioPaquete),
      paqPorCaja: String(p.paqPorCaja),
      precioCaja: String(p.precioCaja),
    })
    setMsgOk(''); setMsgErr('')
    setModal('editar')
  }

  // ─── Save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nombre || !form.codigoInterno || !form.precioCaja || !form.paqPorCaja) {
      setMsgErr('Completá todos los campos requeridos.')
      return
    }

    setSaving(true)
    setMsgErr('')
    try {
      const payload = {
        codigoInterno: form.codigoInterno.trim().toUpperCase(),
        nombre: form.nombre.trim().toUpperCase(),
        linea: form.linea,
        precioPaquete: parseFloat(form.precioPaquete) || 0,
        paqPorCaja: parseInt(form.paqPorCaja) || 0,
        precioCaja: parseFloat(form.precioCaja) || 0,
      }

      let res: Response
      if (modal === 'crear') {
        res = await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/productos/${editTarget!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMsgOk(modal === 'crear' ? 'Producto creado exitosamente.' : 'Producto actualizado.')
      await fetchProductos()
      setTimeout(() => { setModal(null); setMsgOk('') }, 1500)
    } catch (e: any) {
      setMsgErr(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ─── Toggle activo / Soft delete ──────────────────────────────────────
  const toggleActivo = async (p: Producto) => {
    const action = p.activo
      ? (confirm(`¿Desactivar "${p.nombre}"? No aparecerá en nuevos pedidos.`) ? 'DELETE' : null)
      : 'reactivar'
    if (!action) return

    if (action === 'DELETE') {
      await fetch(`/api/productos/${p.id}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/productos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true }),
      })
    }
    await fetchProductos()
  }

  // ─── Scheduled Tariffs Handlers ───────────────────────────────────────
  const handleDeleteLista = async (l: any) => {
    if (!confirm(`¿Eliminar la lista programada "${l.nombre}"?`)) return
    try {
      await fetch(`/api/configuracion/tarifas?id=${l.id}`, { method: 'DELETE' })
      await fetchProductos()
    } catch (e) {
      console.error(e)
    }
  }

  const handleTarifaAction = async () => {
    if (!newListNombre || !newListVigencia || !aumentoPorcentaje) {
      alert('Completá nombre, vigencia y porcentaje')
      return
    }
    setProcessingTarifa(true)
    try {
      const payload = {
        nombre: newListNombre,
        vigenteDesdeStr: newListVigencia,
        porcentaje: parseFloat(aumentoPorcentaje),
        tarifaTipo: aumentoTarifaTipo,
        baseListaId: selectedListId,
        action: editListTarget ? 'editar_lista' : undefined,
        listaId: editListTarget?.id
      }
      
      const res = await fetch('/api/configuracion/tarifas', {
        method: editListTarget ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setShowAumentoModal(false)
      setEditListTarget(null)
      await fetchProductos()
    } catch (e: any) {
      alert(e.message || 'Error al procesar tarifa')
    } finally {
      setProcessingTarifa(false)
    }
  }

  // ─── PDF Export ────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const today = new Date().toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

    // Build print-friendly HTML
    const productosPorLinea = productos
      .filter(p => p.activo)
      .reduce((acc, p) => {
        const l = p.linea || 'otros'
        if (!acc[l]) acc[l] = []
        acc[l].push(p)
        return acc
      }, {} as Record<string, Producto[]>)

    const selectedList = priceLists.find(l => l.id === selectedListId)
    const listLabel = selectedList?.nombre || 'Mayo 2026'
    const tarifaLabel = tarifaVer === 'min' ? 'Menos de 300 Cajas (Estándar)' : 'Más de 300 Cajas (Volumen)'

    const tableRows = (prods: Producto[]) =>
      prods.map(p => {
        const { precioPaquete, precioCaja } = getProductPrices(p)
        return `
          <tr>
            <td>${p.codigoInterno}</td>
            <td>${p.nombre}</td>
            <td style="text-align:center">${p.paqPorCaja}</td>
            <td style="text-align:right">${fmt(precioPaquete)}</td>
            <td style="text-align:right">${fmt(precioCaja)}</td>
            <td style="text-align:right">${fmt(precioCaja * (1 + IVA))}</td>
          </tr>
        `
      }).join('')

    const sectionsHTML = Object.entries(productosPorLinea).map(([linea, prods]) => `
      <div class="section">
        <div class="section-header">${LINEAS[linea] || linea}</div>
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Descripción</th><th>Paq/Caja</th>
              <th>Precio Paquete</th><th>Precio Caja</th><th>Total c/IVA</th>
            </tr>
          </thead>
          <tbody>${tableRows(prods)}</tbody>
        </table>
      </div>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Lista de Precios NEOSOL — ${listLabel} [${tarifaLabel}] — ${today}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; font-size: 10px; padding: 20px; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom: 2px solid #6c63ff; padding-bottom:12px; }
          .brand { font-size:22px; font-weight:900; color:#6c63ff; letter-spacing:-0.5px; }
          .brand span { font-size:11px; font-weight:400; color:#666; display:block; margin-top:2px; }
          .date { text-align:right; color:#666; font-size:9px; }
          .date strong { display:block; font-size:13px; color:#1a1a2e; font-weight:800; }
          .section { margin-bottom:16px; }
          .section-header { background:#6c63ff; color:white; font-weight:800; font-size:9px; text-transform:uppercase; letter-spacing:1px; padding:5px 10px; border-radius:4px 4px 0 0; }
          table { width:100%; border-collapse:collapse; font-size:9.5px; }
          thead tr { background:#f0f0f8; }
          th { padding:5px 8px; text-align:left; font-weight:700; font-size:8.5px; text-transform:uppercase; color:#555; letter-spacing:0.5px; }
          td { padding:5px 8px; border-bottom:1px solid #eee; }
          tr:last-child td { border-bottom:none; }
          tr:nth-child(even) td { background:#fafaff; }
          .footer { margin-top:20px; border-top:1px solid #ddd; padding-top:10px; text-align:center; color:#999; font-size:8px; }
          .note { margin-top:10px; font-size:8.5px; color:#888; font-style:italic; }
          @media print { body { padding:10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">NEOSOL<span>Lista de Precios Oficial · ${listLabel} · ${tarifaLabel}</span></div>
            <p class="note">* Precios sin IVA. Total c/IVA incluye el 21% sobre precio de caja.</p>
          </div>
          <div class="date">
            Vigente al<br/>
            <strong>${today}</strong>
            <br/>Sujeto a cambios sin previo aviso
          </div>
        </div>
        ${sectionsHTML}
        <div class="footer">
          NEOSOL · Lista de precios generada el ${today} · Uso interno
        </div>
      </body>
      </html>
    `

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { alert('Habilitá las ventanas emergentes para generar el PDF'); return }
    win.document.write(html)
    win.document.close()
    win.onload = () => { win.focus(); win.print() }
  }

  // Auto-calc precio caja cuando cambian paq/precio
  const handleFormChange = (key: string, val: string) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      // Auto-calc precioCaja = precioPaquete * paqPorCaja
      if (key === 'precioPaquete' || key === 'paqPorCaja') {
        const paq = parseFloat(key === 'precioPaquete' ? val : prev.precioPaquete) || 0
        const num = parseInt(key === 'paqPorCaja' ? val : prev.paqPorCaja) || 0
        if (paq > 0 && num > 0) {
          updated.precioCaja = (paq * num).toFixed(2)
        }
      }
      return updated
    })
  }

  const precioPreview = parseFloat(form.precioCaja) || 0

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="text-primary" size={26} />
            Lista de Precios
          </h1>
          <p className="text-secondary text-sm mt-1">
            {priceLists.find(l => l.id === selectedListId)?.nombre || 'Mayo 2026'} · {productos.filter(p => p.activo).length} productos activos
            {userNivel === 1 && <span className="text-primary ml-2">· Edición habilitada</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {userNivel === 1 && productos.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="btn btn-secondary text-xs flex items-center gap-2 border border-white/10"
            >
              <RefreshCw size={13} className={seeding ? 'animate-spin' : ''} />
              {seeding ? 'Cargando...' : 'Cargar Catálogo'}
            </button>
          )}
          <button
            onClick={() => setShowSyncSheetModal(true)}
            className="btn btn-secondary text-xs flex items-center gap-2 border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold"
            title="Sincronizar precios desde enlace de Google Sheets"
          >
            <FileSpreadsheet size={15} />
            <span>Sincronizar Google Sheet</span>
          </button>
          {userNivel === 1 && (
            <>
              <button 
                onClick={() => { setIsNewList(true); setEditListTarget(null); setShowAumentoModal(true); }}
                className="btn btn-secondary flex items-center justify-center p-2 border border-white/10 text-xs"
                title="Aumento Masivo"
              >
                <Percent size={18} />
              </button>
              <button
                onClick={openCrear}
                className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 font-bold text-sm"
              >
                <Plus size={15} /> Nuevo Producto
              </button>
            </>
          )}

          <button
            onClick={handleCopyPreciosLink}
            className={`flex items-center justify-center p-2 rounded-lg border transition-all text-xs font-bold ${
              copiedPrecios
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-white/5 border-white/10 text-secondary hover:text-white hover:border-white/30'
            }`}
            title="Copiar link público de precios para compartir sin login"
          >
            {copiedPrecios ? <Check size={18} /> : <Link2 size={18} />}
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center w-[38px] h-[38px] rounded-xl bg-white/5 border border-white/10 text-secondary hover:text-white hover:border-white/30 transition-all"
            title="Descargar PDF"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* List Selection & Tariff Selection */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
        <div className="flex flex-col gap-1.5 flex-1 w-full md:w-auto">
          {unidadesDisponibles.length > 0 && (
            <div className="mb-4">
              <label className="text-[10px] uppercase font-black text-secondary tracking-wider block mb-2">Unidad de Negocio</label>
              <div className="flex flex-wrap gap-2">
                {unidadesDisponibles.map(un => (
                  <button
                    key={un}
                    onClick={() => {
                      setSelectedUnidadFiltro(un)
                      const listsForUnidad = priceLists.filter((l: any) => (l.unidadNegocio || 'Gerencia Comercial') === un)
                      const now = new Date()
                      let active = listsForUnidad.find((l: any) => l.activa && new Date(l.vigenteDesde) <= now)
                      if (!active && listsForUnidad.length > 0) active = listsForUnidad[0]
                      if (active) setSelectedListId(active.id)
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedUnidadFiltro === un
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-500'
                        : 'bg-white/5 text-secondary hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {un}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="text-[10px] uppercase font-black text-secondary tracking-wider">Período / Tarifario</label>
          <div className="flex gap-2 flex-wrap">
            {priceLists.filter((l: any) => (l.unidadNegocio || 'Gerencia Comercial') === selectedUnidadFiltro).length === 0 ? (
              <span className="text-secondary text-xs italic">No hay listas para esta unidad</span>
            ) : (
              priceLists
                .filter((l: any) => (l.unidadNegocio || 'Gerencia Comercial') === selectedUnidadFiltro)
                .map((l: any) => {
                const isUpcoming = new Date(l.vigenteDesde) > new Date()
                const monthName = new Date(l.vigenteDesde).toLocaleDateString('es-AR', { month: 'short' })
                return (
                  <div key={l.id} className={`flex items-stretch rounded-xl overflow-hidden transition-all border ${
                    selectedListId === l.id
                      ? 'border-primary shadow-lg shadow-primary/20'
                      : 'border-white/10 hover:border-white/20 bg-black/20'
                  }`}>
                    <button
                      onClick={() => setSelectedListId(l.id)}
                      className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 ${
                        selectedListId === l.id ? 'bg-primary text-white' : 'text-secondary hover:text-white'
                      }`}
                    >
                      <span>{l.nombre}</span>
                      {isUpcoming ? (
                        <span className="px-1 py-0.5 rounded bg-blue-400/20 text-blue-400 text-[8px] font-black uppercase">
                          Próxima ({monthName})
                        </span>
                      ) : (
                        <span className="px-1 py-0.5 rounded bg-green-400/20 text-green-400 text-[8px] font-black uppercase">
                          Vigente
                        </span>
                      )}
                    </button>
                    {isUpcoming && userNivel === 1 && (
                      <div className="flex flex-col border-l border-white/5">
                        <button 
                          onClick={() => {
                            setEditListTarget(l)
                            setNewListNombre(l.nombre)
                            setNewListVigencia(l.vigenteDesde.split('T')[0])
                            setAumentoPorcentaje('')
                            setAumentoTarifaTipo('ambas')
                            setShowAumentoModal(true)
                          }}
                          className="flex-1 px-2 flex items-center justify-center text-secondary hover:text-white hover:bg-white/10"
                          title="Editar tarifario programado"
                        >
                          <Pencil size={11} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLista(l)}
                          className="flex-1 px-2 flex items-center justify-center text-secondary hover:text-red-400 hover:bg-red-400/10 border-t border-white/5"
                          title="Eliminar tarifario programado"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-black text-secondary tracking-wider text-left md:text-right">Volumen del Pedido</label>
          <div className="flex gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setTarifaVer('min')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                tarifaVer === 'min'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-secondary hover:text-white'
              }`}
            >
              Lista B (- 300 cajas)
            </button>
            <button
              onClick={() => setTarifaVer('max')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                tarifaVer === 'max'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-secondary hover:text-white'
              }`}
            >
              Lista A (+ 300 cajas)
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Buscar producto o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input bg-black/40 border border-white/10 rounded-xl pl-9 w-full text-sm py-2"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroLinea('todas')}
            className={`btn-toggle ${filtroLinea === 'todas' ? 'active' : ''}`}
          >
            Todas
          </button>
          {LINEAS_OPTS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltroLinea(key)}
              className={`btn-toggle ${filtroLinea === key ? 'active' : ''}`}
            >
              {label.replace('Línea ', '')}
            </button>
          ))}
        </div>

        {userNivel === 1 && (
          <button
            onClick={() => setShowInactivos(!showInactivos)}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all ${showInactivos ? 'text-primary' : 'text-secondary hover:text-white'}`}
          >
            {showInactivos ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Inactivos
          </button>
        )}
      </div>

      {/* Products by line */}
      {loading || seeding ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-secondary text-sm">{seeding ? 'Cargando catálogo en la base de datos...' : 'Cargando productos...'}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel card border border-white/5 p-16 text-center">
          <Package size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-secondary font-semibold">No se encontraron productos</p>
          {userNivel === 1 && productos.length === 0 && (
            <p className="text-white/30 text-xs mt-2">Usá el botón &ldquo;Cargar Catálogo&rdquo; para importar los productos del Excel</p>
          )}
        </div>
      ) : (
        Object.entries(byLinea)
          .sort(([a], [b]) => {
            const order = Object.keys(LINEAS)
            const idxA = order.indexOf(a)
            const idxB = order.indexOf(b)
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
          })
          .map(([linea, prods]) => (
          <div key={linea} className="glass-panel card border border-white/5 overflow-hidden">
            {/* Line header */}
            <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-white font-bold text-sm">{LINEAS[linea] || linea}</span>
                <span className="text-secondary text-xs">({prods.length} productos)</span>
              </div>
              <span className="text-secondary text-xs hidden md:block">
                Precio sin IVA · Total c/IVA incluye 21%
              </span>
            </div>

            <div className="px-4 pb-4">
              {/* Mobile View (Cards) */}
              <div className="block md:hidden space-y-3 mt-3">
                {prods.map(p => {
                  const { precioPaquete, precioCaja } = getProductPrices(p)
                  return (
                    <div key={p.id} className={`p-4 rounded-xl border border-white/10 bg-black/20 ${!p.activo ? 'opacity-50' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-primary font-black text-xs mb-0.5">{p.codigoInterno}</div>
                          <div className="text-white font-bold text-sm leading-tight">{p.nombre}</div>
                        </div>
                        {userNivel === 1 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ml-2 ${
                            p.activo
                              ? 'bg-green-400/10 text-green-400 border-green-400/20'
                              : 'bg-red-400/10 text-red-400 border-red-400/20'
                          }`}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
                          <div className="text-[10px] text-secondary uppercase font-bold tracking-wider mb-1">Paq/Caja</div>
                          <div className="text-white font-semibold text-xs">{p.paqPorCaja}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
                          <div className="text-[10px] text-secondary uppercase font-bold tracking-wider mb-1">Precio Paq</div>
                          <div className="text-white font-semibold text-xs">{fmt(precioPaquete)}</div>
                        </div>
                      </div>
                      
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex flex-col justify-center items-center">
                        <div className="text-[10px] text-primary uppercase font-black tracking-wider mb-1">Total Caja c/IVA</div>
                        <div className="text-white font-black text-lg leading-none">{fmt(precioCaja)}</div>
                      </div>

                      {userNivel === 1 && (
                        <div className="flex gap-2 pt-3 mt-3 border-t border-white/5">
                          <button
                            onClick={() => openEditar(p)}
                            className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2"
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          <button
                            onClick={() => toggleActivo(p)}
                            className={`flex-1 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 ${
                              p.activo
                                ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                                : 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                            }`}
                          >
                            {p.activo ? (
                              <><Trash2 size={12} /> Desactivar</>
                            ) : (
                              <><CheckCircle2 size={12} /> Activar</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">Cód. Interno</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider">Descripción</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider text-center">Paq / Caja</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider text-right">Precio Paq</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-primary tracking-wider text-right bg-primary/5">Total Caja c/IVA</th>
                      {userNivel === 1 && (
                        <>
                          <th className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider text-center">Estado</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider text-center">Acciones</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {prods.map(p => {
                      const { precioPaquete, precioCaja } = getProductPrices(p)
                      return (
                        <tr key={p.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${!p.activo ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 text-primary font-bold text-xs whitespace-nowrap">{p.codigoInterno}</td>
                          <td className="px-4 py-3 text-white font-semibold text-xs truncate max-w-[250px]" title={p.nombre}>{p.nombre}</td>
                          <td className="px-4 py-3 text-secondary text-xs text-center">{p.paqPorCaja}</td>
                          <td className="px-4 py-3 text-secondary text-xs text-right tabular-nums font-semibold">{fmt(precioPaquete)}</td>
                          <td className="px-4 py-3 text-white font-black text-sm text-right tabular-nums bg-primary/5">
                            {fmt(precioCaja)}
                          </td>
                          {userNivel === 1 && (
                            <>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${
                                  p.activo
                                    ? 'bg-green-400/10 text-green-400 border-green-400/20'
                                    : 'bg-red-400/10 text-red-400 border-red-400/20'
                                }`}>
                                  {p.activo ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openEditar(p)}
                                    className="btn-action text-secondary hover:text-white"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => toggleActivo(p)}
                                    className={`btn-action ${
                                      p.activo
                                        ? 'hover:text-red-400 hover:border-red-400/20'
                                        : 'text-green-400 border-green-400/20 hover:bg-green-400/10'
                                    }`}
                                  >
                                    {p.activo ? <Trash2 size={14} /> : <CheckCircle2 size={14} />}
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-white/[0.01]">
                      <td colSpan={userNivel === 1 ? 7 : 5} className="px-4 py-2 text-[10px] text-secondary text-right">
                        IVA: 21% sobre precio de caja · Precios en ARS
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ))
      )}

      {/* ─── MODAL CREAR / EDITAR ──────────────────────────────────────── */}
      {modal && userNivel === 1 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel card w-full max-w-md border border-white/10 flex flex-col shadow-2xl max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/5 p-6 shrink-0">
              <h3 className="font-black text-white flex items-center gap-2">
                <Package size={18} className="text-primary" />
                {modal === 'crear' ? 'Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button onClick={() => setModal(null)} className="btn-action w-8 h-8">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-[10px] uppercase font-black text-secondary">Código Interno *</label>
                  <input
                    type="text"
                    value={form.codigoInterno}
                    onChange={e => handleFormChange('codigoInterno', e.target.value)}
                    placeholder="Ej: 33001"
                    className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px] uppercase font-black text-secondary">Línea *</label>
                  <select
                    value={form.linea}
                    onChange={e => handleFormChange('linea', e.target.value)}
                    className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                  >
                    {LINEAS_OPTS.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Descripción / Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => handleFormChange('nombre', e.target.value)}
                  placeholder="Ej: SANDW. 176 PAQ X 25 GR"
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-[10px] uppercase font-black text-secondary">Precio Paq. ($)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.precioPaquete}
                    onChange={e => handleFormChange('precioPaquete', e.target.value)}
                    className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px] uppercase font-black text-secondary">Paq/Caja *</label>
                  <input
                    type="number" min="1"
                    value={form.paqPorCaja}
                    onChange={e => handleFormChange('paqPorCaja', e.target.value)}
                    className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px] uppercase font-black text-secondary">Precio Caja ($) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.precioCaja}
                    onChange={e => handleFormChange('precioCaja', e.target.value)}
                    className={`form-input bg-black/40 border rounded-xl text-sm font-bold ${
                      parseFloat(form.precioPaquete || '0') * parseInt(form.paqPorCaja || '0') === parseFloat(form.precioCaja || '0')
                        ? 'border-green-400/30 text-green-400'
                        : 'border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Preview */}
              {precioPreview > 0 && (
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-secondary text-[10px] font-black uppercase">Precio sin IVA</p>
                    <p className="text-white font-black">{fmt(precioPreview)}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-[10px] font-black uppercase">Total c/IVA 21%</p>
                    <p className="text-primary font-black">{fmt(precioPreview * (1 + IVA))}</p>
                  </div>
                </div>
              )}

              {msgErr && (
                <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={14} /> {msgErr}
                </div>
              )}

              {msgOk && (
                <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} /> {msgOk}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 shrink-0 flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="btn btn-secondary flex-1"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 font-bold"
                disabled={saving}
              >
                {saving ? (
                  <><RefreshCw size={16} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Save size={16} /> Guardar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL AUMENTO MASIVO / EDITAR LISTA PROGRAMADA ────────────────── */}
      {showAumentoModal && userNivel === 1 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel card w-full max-w-md border border-white/10 flex flex-col shadow-2xl max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/5 p-6 shrink-0">
              <h3 className="font-black text-white flex items-center gap-2">
                <Percent size={18} className="text-primary" />
                {editListTarget ? 'Editar Lista Programada' : 'Aumento Masivo de Precios'}
              </h3>
              <button 
                onClick={() => {
                  setShowAumentoModal(false)
                  setEditListTarget(null)
                  setIsNewList(false)
                }} 
                className="btn-action w-8 h-8"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto p-6">
              <div className="form-group mb-0">
                    <label className="form-label text-[10px] uppercase font-black text-secondary">Nombre del Tarifario (Ej: Ago 2026)</label>
                    <input
                      type="text"
                      value={newListNombre}
                      onChange={e => setNewListNombre(e.target.value)}
                      placeholder="Nombre de la lista"
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px] uppercase font-black text-secondary">Fecha de Entrada en Vigencia</label>
                    <input
                      type="date"
                      value={newListVigencia}
                      onChange={e => setNewListVigencia(e.target.value)}
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                    />
                  </div>
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">
                  {editListTarget ? 'Recalcular Porcentaje de Aumento (%) (Opcional)' : 'Porcentaje de Aumento (%) *'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={aumentoPorcentaje}
                  onChange={e => setAumentoPorcentaje(e.target.value)}
                  placeholder="Ej: 15"
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Aplicar aumento a:</label>
                <select
                  value={aumentoTarifaTipo}
                  onChange={(e: any) => setAumentoTarifaTipo(e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                >
                  <option value="ambas">Ambas Tarifas (Estándar y Volumen)</option>
                  <option value="min">Solo Tarifa Estándar (&lt; 300 cajas)</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 shrink-0 flex gap-3">
              <button
                onClick={() => {
                  setShowAumentoModal(false)
                  setEditListTarget(null)
                }}
                className="btn btn-secondary flex-1"
                disabled={processingTarifa}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await handleTarifaAction()
                }}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 font-bold"
                disabled={processingTarifa}
              >
                {processingTarifa ? (
                  <><RefreshCw size={16} className="animate-spin" /> Procesando...</>
                ) : (
                  <><Save size={16} /> Aplicar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Bulk Price Sync Modal */}
      <BulkPriceSheetSyncModal
        isOpen={showSyncSheetModal}
        onClose={() => setShowSyncSheetModal(false)}
        onSuccess={() => {
          setShowSyncSheetModal(false)
          fetchProductos()
        }}
        currentListId={selectedListId}
      />
    </div>
  )
}
