'use client'

import React, { useState, useRef } from 'react'
import {
  X,
  FileSpreadsheet,
  Link as LinkIcon,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Layers,
  DollarSign,
  Tag,
  Package,
  Calendar,
  Eye,
  Check,
  Building2
} from 'lucide-react'
import Papa from 'papaparse'
import { useTenant } from '@/lib/tenantContext'

export interface BulkPriceSheetSyncModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentListId?: number | null
}

interface ParsedRow {
  codigoInterno: string
  nombre: string
  linea: string
  tipo: 'PRODUCTO' | 'SERVICIO' | 'ABONO_MENSUAL'
  costoBase: number
  precioUnitario: number
  moneda: string
  margenPorcentaje: number
  comisionPorcentaje: number
  isValid: boolean
  error?: string
}

export default function BulkPriceSheetSyncModal({
  isOpen,
  onClose,
  onSuccess,
  currentListId
}: BulkPriceSheetSyncModalProps) {
  const { activeTenant } = useTenant()
  const [activeTab, setActiveTab] = useState<'sheets' | 'csv'>('sheets')
  const [sheetUrl, setSheetUrl] = useState(activeTenant?.sheetUrl || '')
  const [listaNombre, setListaNombre] = useState(
    activeTenant ? `Lista Precios - ${activeTenant.nombre}` : 'Lista de Precios Principal'
  )
  const [loading, setLoading] = useState(false)
  const [parsedItems, setParsedItems] = useState<ParsedRow[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'Codigo / SKU',
      'Nombre / Servicio',
      'Categoria / Rubro',
      'Tipo (PRODUCTO / SERVICIO / ABONO_MENSUAL)',
      'Descripcion / Alcance',
      'Costo Base',
      'Precio Lista',
      'Margen %',
      'Comision Vendedor %',
      'Moneda (ARS / USD)'
    ]

    const sampleRows = [
      [
        'WEB-LANDING-01',
        'Landing Page Comercial PyME',
        'Desarrollo Web',
        'SERVICIO',
        'Diseño responsive, formulario de contacto, botón de WhatsApp y optimización SEO básica.',
        '45000',
        '120000',
        '166',
        '15',
        'ARS'
      ],
      [
        'WEB-ECOMMERCE-01',
        'Tienda Online E-commerce Completa',
        'Desarrollo Web',
        'SERVICIO',
        'Catálogo autoadministrable, pasarela de Mercado Pago, envíos y panel administrativo.',
        '110000',
        '280000',
        '154',
        '20',
        'ARS'
      ],
      [
        'HOST-ABONO-01',
        'Abono Mensual Hosting & Mantenimiento PyME',
        'Infraestructura',
        'ABONO_MENSUAL',
        'Servidor dedicado, copias de seguridad semanales, soporte técnico y actualizaciones.',
        '5000',
        '18500',
        '270',
        '10',
        'ARS'
      ],
      [
        'POS-EQUIP-01',
        'Terminal de Cobro & Lectora QR Terreno',
        'Equipos',
        'PRODUCTO',
        'Equipo de hardware para cobro en terreno con batería de larga duración.',
        '35000',
        '68000',
        '94',
        '12',
        'ARS'
      ]
    ]

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map(r => r.map(f => `"${f.replace(/"/g, '""')}"`).join(','))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla_lista_precios_omnisync.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Parse CSV Rows directly for preview
  const parseAndPreview = (text: string) => {
    const res = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true })
    if (!res.data || res.data.length < 2) {
      setErrorMessage('El documento debe contener una fila de encabezados y al menos una fila de datos.')
      return
    }

    const rows = res.data
    const headerRow = rows[0].map(h =>
      h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim()
    )

    const findCol = (aliases: string[], fallback: number) => {
      const idx = headerRow.findIndex(h => aliases.some(a => h === a || h.includes(a)))
      return idx !== -1 ? idx : fallback
    }

    const codeIdx = findCol(['codigo', 'sku', 'cod', 'id'], 0)
    const nameIdx = findCol(['nombre', 'servicio', 'producto', 'titulo', 'item'], 1)
    const catIdx = findCol(['categoria', 'rubro', 'linea', 'familia'], 2)
    const typeIdx = findCol(['tipo', 'modalidad', 'recurrencia'], 3)
    const costIdx = findCol(['costo', 'costobase'], 5)
    const priceIdx = findCol(['precio', 'preciolista', 'preciounitario', 'valor'], 6)
    const marginIdx = findCol(['margen', 'markup'], 7)
    const comIdx = findCol(['comision'], 8)
    const currencyIdx = findCol(['moneda', 'currency'], 9)

    const items: ParsedRow[] = []

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0 || !r.some(c => c && c.trim())) continue

      const get = (idx: number) => (r[idx] !== undefined ? String(r[idx]).trim() : '')

      const rawCode = get(codeIdx)
      const rawName = get(nameIdx)
      const rawCat = get(catIdx) || 'General'
      const rawType = get(typeIdx).toUpperCase()
      const costo = parseFloat(get(costIdx).replace(/[$\s.]/g, '').replace(',', '.')) || 0
      let precio = parseFloat(get(priceIdx).replace(/[$\s.]/g, '').replace(',', '.')) || 0
      const margen = parseFloat(get(marginIdx).replace(/[%,\s]/g, '')) || 0
      const comision = parseFloat(get(comIdx).replace(/[%,\s]/g, '')) || 0
      const moneda = get(currencyIdx).toUpperCase() === 'USD' ? 'USD' : 'ARS'

      if (precio === 0 && costo > 0 && margen > 0) {
        precio = costo * (1 + margen / 100)
      }

      let tipo: 'PRODUCTO' | 'SERVICIO' | 'ABONO_MENSUAL' = 'SERVICIO'
      if (rawType.includes('ABONO') || rawType.includes('MENSUAL') || rawType.includes('HOSTING')) {
        tipo = 'ABONO_MENSUAL'
      } else if (rawType.includes('PRODUCTO') || rawType.includes('FISICO')) {
        tipo = 'PRODUCTO'
      }

      const isValid = Boolean(rawName && (precio > 0 || costo > 0))

      items.push({
        codigoInterno: rawCode || `ITM-${1000 + i}`,
        nombre: rawName || 'Item sin nombre',
        linea: rawCat,
        tipo,
        costoBase: costo,
        precioUnitario: precio,
        moneda,
        margenPorcentaje: margen,
        comisionPorcentaje: comision,
        isValid,
        error: !isValid ? 'Falta nombre o precio' : undefined
      })
    }

    setParsedItems(items)
    setErrorMessage(null)
  }

  // Fetch Google Sheets
  const handleFetchGoogleSheets = async () => {
    if (!sheetUrl.trim()) {
      setErrorMessage('Por favor pega el enlace de tu Google Sheet.')
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setParsedItems([])

    try {
      let exportUrl = sheetUrl.trim()
      if (exportUrl.includes('/edit')) {
        exportUrl = exportUrl.replace(/\/edit.*$/, '/export?format=csv')
      } else if (!exportUrl.includes('/export')) {
        exportUrl = exportUrl + '/export?format=csv'
      }

      const res = await fetch(exportUrl)
      if (!res.ok) {
        throw new Error('No se pudo acceder al Google Sheet. Verifica que los permisos sean "Cualquier persona con el enlace (Lector)".')
      }

      const text = await res.text()
      parseAndPreview(text)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con Google Sheets.')
    } finally {
      setLoading(false)
    }
  }

  // Handle local CSV upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setErrorMessage(null)
    setParsedItems([])

    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string
        parseAndPreview(text)
      } catch (err: any) {
        setErrorMessage('Error al leer el archivo CSV: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  // Submit and Sync with Backend
  const handleExecuteSync = async () => {
    if (parsedItems.filter(p => p.isValid).length === 0) {
      setErrorMessage('No hay ítems válidos para sincronizar.')
      return
    }

    setIsSyncing(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/precios/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: activeTab === 'sheets' ? sheetUrl : null,
          csvContent: activeTab === 'csv' || parsedItems.length > 0
            ? Papa.unparse(
                parsedItems.map(p => ({
                  'Codigo / SKU': p.codigoInterno,
                  'Nombre / Servicio': p.nombre,
                  'Categoria / Rubro': p.linea,
                  'Tipo (PRODUCTO / SERVICIO / ABONO_MENSUAL)': p.tipo,
                  'Costo Base': p.costoBase,
                  'Precio Lista': p.precioUnitario,
                  'Margen %': p.margenPorcentaje,
                  'Comision Vendedor %': p.comisionPorcentaje,
                  'Moneda (ARS / USD)': p.moneda
                }))
              )
            : null,
          tenantId: activeTenant?.id || null,
          listaId: currentListId || null,
          listaNombre
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar con el servidor')

      setSyncResult(data)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la lista de precios')
    } finally {
      setIsSyncing(false)
    }
  }

  const validCount = parsedItems.filter(p => p.isValid).length
  const invalidCount = parsedItems.filter(p => !p.isValid).length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        width: '100%', maxWidth: '900px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Sincronizador Masivo de Listas de Precios
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Carga ágil desde <strong style={{ color: '#34d399' }}>Google Sheets</strong> o archivo CSV sin necesidad de imágenes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#94a3b8',
              cursor: 'pointer', padding: '6px', borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Target Tenant & List Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
            background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Unidad de Negocio / Inquilino
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600, fontSize: '0.875rem' }}>
                <Building2 size={16} />
                <span>{activeTenant?.nombre || 'General'}</span>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Nombre de la Lista de Precios
              </label>
              <input
                type="text"
                value={listaNombre}
                onChange={e => setListaNombre(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: '6px',
                  backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc', fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* Source Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('sheets')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                backgroundColor: activeTab === 'sheets' ? 'rgba(16,185,129,0.2)' : 'transparent',
                color: activeTab === 'sheets' ? '#34d399' : '#64748b'
              }}
            >
              <LinkIcon size={14} /> Enlace de Google Sheets (Recomendado)
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                backgroundColor: activeTab === 'csv' ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: activeTab === 'csv' ? '#60a5fa' : '#64748b'
              }}
            >
              <FileSpreadsheet size={14} /> Subir Archivo CSV
            </button>
            <button
              onClick={handleDownloadTemplate}
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                backgroundColor: 'transparent', color: '#94a3b8'
              }}
            >
              <Download size={14} /> Descargar Plantilla Modelo
            </button>
          </div>

          {/* Google Sheets Tab Input */}
          {activeTab === 'sheets' && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc', fontSize: '0.85rem'
                  }}
                />
              </div>
              <button
                onClick={handleFetchGoogleSheets}
                disabled={loading || !sheetUrl.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#10b981', color: '#ffffff',
                  fontWeight: 600, fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading || !sheetUrl.trim() ? 0.6 : 1
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Cargar Planilla
              </button>
            </div>
          )}

          {/* CSV File Upload Tab */}
          {activeTab === 'csv' && (
            <div style={{
              border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '12px',
              padding: '2rem', textAlign: 'center', cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)'
            }} onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <FileSpreadsheet size={32} color="#3b82f6" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                Haz clic para seleccionar tu archivo CSV / TSV
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.75rem' }}>
                Soporta listas exportadas de Excel o cualquier sistema ERP.
              </p>
            </div>
          )}

          {/* Error message alert */}
          {errorMessage && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '8px',
              backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sync Success Alert */}
          {syncResult && (
            <div style={{
              padding: '1rem', borderRadius: '10px',
              backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399', fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
                <CheckCircle2 size={18} />
                <span>¡Sincronización Exitosa!</span>
              </div>
              <p style={{ margin: 0 }}>
                Se procesaron <strong>{syncResult.validCount}</strong> ítems en la lista <strong>"{syncResult.listaNombre}"</strong> ({syncResult.createdCount} nuevos, {syncResult.updatedCount} actualizados).
              </p>
            </div>
          )}

          {/* Preview Table */}
          {parsedItems.length > 0 && !syncResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                    Previsualización de Datos ({parsedItems.length} ítems)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                    ✓ {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                      ⚠ {invalidCount} con errores
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                maxHeight: '260px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', backgroundColor: '#0f172a'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1e293b', color: '#94a3b8' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Código / SKU</th>
                      <th style={{ padding: '8px 12px' }}>Nombre / Servicio</th>
                      <th style={{ padding: '8px 12px' }}>Categoría</th>
                      <th style={{ padding: '8px 12px' }}>Tipo</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Costo Base</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Precio Lista</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Margen</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        backgroundColor: item.isValid ? 'transparent' : 'rgba(239,68,68,0.05)'
                      }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#38bdf8' }}>{item.codigoInterno}</td>
                        <td style={{ padding: '8px 12px', color: '#f8fafc', fontWeight: 500 }}>{item.nombre}</td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{item.linea}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                            backgroundColor: item.tipo === 'ABONO_MENSUAL' ? 'rgba(168,85,247,0.2)' : item.tipo === 'SERVICIO' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)',
                            color: item.tipo === 'ABONO_MENSUAL' ? '#c084fc' : item.tipo === 'SERVICIO' ? '#60a5fa' : '#fbbf24'
                          }}>
                            {item.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8' }}>
                          ${item.costoBase.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                          ${item.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {item.moneda}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#f59e0b' }}>
                          {item.margenPorcentaje > 0 ? `+${item.margenPorcentaje}%` : '-'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {item.isValid ? (
                            <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Listo</span>
                          ) : (
                            <span style={{ color: '#f87171', fontWeight: 600 }} title={item.error}>⚠ Error</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#0f172a'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            Cerrar
          </button>

          {parsedItems.length > 0 && !syncResult && (
            <button
              onClick={handleExecuteSync}
              disabled={isSyncing || validCount === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                backgroundColor: '#10b981', color: '#ffffff',
                fontWeight: 700, fontSize: '0.875rem', cursor: isSyncing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.4)'
              }}
            >
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Sincronizar {validCount} Precios Ahora
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
