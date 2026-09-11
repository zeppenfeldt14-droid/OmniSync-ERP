'use client'

import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Upload, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useTenant } from '@/lib/tenantContext'

type Props = {
  zonaName: string
  onClose: () => void
  onImportComplete: () => void
}

export default function CsvImportModal({ zonaName, onClose, onImportComplete }: Props) {
  const { activeTenant, terminology } = useTenant()
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [selectedZona, setSelectedZona] = useState(zonaName)
  const [selectedVendedor, setSelectedVendedor] = useState('')
  const [zonasList, setZonasList] = useState<string[]>([])
  const [vendedoresList, setVendedoresList] = useState<{id: number, alias: string}[]>([])

  const [fieldMapping, setFieldMapping] = useState<{ [key: string]: string }>({
    nombre: '',
    telefono: '',
    direccion: '',
    coordenadas: '',
    zona: ''
  })
  
  const [importResult, setImportResult] = useState<{ success: number, ignored: number } | null>(null)

  // Fetch Zonas filtradas por el inquilino activo
  useEffect(() => {
    fetch('/api/zonas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Si los objetos de zona tienen tenantId y tenemos activeTenant, filtrar
          const filtered = activeTenant 
            ? data.filter((z: any) => !z.tenantId || z.tenantId === activeTenant.id)
            : data
          const nombres = filtered.map((z: any) => z.nombre || z)
          setZonasList(nombres)
          if (nombres.length > 0 && (!selectedZona || !nombres.includes(selectedZona))) {
            setSelectedZona(nombres[0])
          }
        }
      })
      .catch(err => console.error(err))
  }, [activeTenant])

  // Fetch Vendedores when selectedZona changes
  useEffect(() => {
    if (!selectedZona) {
      setVendedoresList([])
      setSelectedVendedor('')
      return
    }
    fetch(`/api/usuarios/vendedores?zona=${encodeURIComponent(selectedZona)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setVendedoresList(data)
          if (data.length > 0) {
            setSelectedVendedor(data[0].alias)
          } else {
            setSelectedVendedor('')
          }
        }
      })
      .catch(err => console.error(err))
  }, [selectedZona])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = results.meta.fields
          if (fields) {
            setHeaders(fields)
            
            // Auto-mapping attempts
            const newMapping = { ...fieldMapping }
            const f = fields.map(h => h.toLowerCase())
            
            const matchHeader = (keywords: string[]) => {
              const matched = f.find(h => keywords.some(k => h.includes(k)))
              return matched ? fields[f.indexOf(matched)] : ''
            }
            
            newMapping.nombre = matchHeader(['name', 'nombre', 'title', 'empresa', 'cliente', 'cuenta'])
            newMapping.telefono = matchHeader(['phone', 'tel', 'cel', 'telefono', 'whatsapp'])
            newMapping.direccion = matchHeader(['address', 'dirección', 'direccion', 'ubicacion', 'street'])
            newMapping.coordenadas = matchHeader(['coord', 'lat', 'lon', 'coordenada', 'coordenadas'])
            newMapping.zona = matchHeader(['zona', 'zone', 'region', 'distrito'])
            
            setFieldMapping(newMapping)
          }
          setData(results.data)
        }
      })
    }
  }

  const handleImport = async () => {
    if (!fieldMapping.nombre) {
      alert('La columna "Nombre" es obligatoria.')
      return
    }
    if (!selectedZona && !fieldMapping.zona) {
      alert('Debes seleccionar una Zona predeterminada o mapear una columna de Zona.')
      return
    }

    setIsProcessing(true)
    try {
      const payload = data.map(row => {
        const rowZona = (fieldMapping.zona && row[fieldMapping.zona]?.trim()) 
          ? row[fieldMapping.zona].trim() 
          : selectedZona

        return {
          nombre: row[fieldMapping.nombre] || '',
          telefono: fieldMapping.telefono ? row[fieldMapping.telefono] : '',
          direccion: fieldMapping.direccion ? row[fieldMapping.direccion] : '',
          coordenadas: fieldMapping.coordenadas ? row[fieldMapping.coordenadas] : '',
          zona: rowZona || selectedZona,
          vendedorAsignado: selectedVendedor || null,
          tenantId: activeTenant?.id || null
        }
      }).filter(item => item.nombre.trim() !== '')

      const res = await fetch('/api/empresas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          empresas: payload,
          tenantId: activeTenant?.id || null
        })
      })

      const resultData = await res.json()
      if (!res.ok) throw new Error(resultData.error || 'Error al importar')
      
      setImportResult({ success: resultData.success, ignored: resultData.ignored })
      onImportComplete()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2330] rounded-xl shadow-2xl w-full max-w-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Upload size={18} className="text-primary" />
            Importar {terminology.empresas} (Carga Masiva)
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {!importResult ? (
            <>
              {/* Selectores de Zona y Vendedor Predeterminados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="form-group mb-0">
                  <label className="text-sm text-gray-300">
                    {terminology.zona} Predeterminada
                  </label>
                  <select 
                    className="form-input bg-[#1a1f2b] text-sm mt-1"
                    value={selectedZona}
                    onChange={e => setSelectedZona(e.target.value)}
                  >
                    <option value="">Seleccionar zona...</option>
                    {zonasList.length > 0 ? (
                      zonasList.map(z => <option key={z} value={z}>{z}</option>)
                    ) : (
                      <option value={zonaName}>{zonaName}</option>
                    )}
                  </select>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Se usará si una fila del CSV no especifica zona.
                  </span>
                </div>
                <div className="form-group mb-0">
                  <label className="text-sm text-gray-300">
                    {terminology.vendedor} Asignado (Opcional)
                  </label>
                  <select 
                    className="form-input bg-[#1a1f2b] text-sm mt-1"
                    value={selectedVendedor}
                    onChange={e => setSelectedVendedor(e.target.value)}
                  >
                    <option value="">(Sin asignar / Administrador)</option>
                    {vendedoresList.map(v => (
                      <option key={v.id} value={v.alias}>{v.alias}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Box */}
              <div className="mb-6">
                <div className="border-2 border-dashed border-white/20 hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-colors relative bg-black/10">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <CheckCircle2 size={32} />
                      <span className="font-medium text-white">{file.name}</span>
                      <span className="text-xs text-gray-400">{data.length} filas detectadas</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Upload size={32} />
                      <span className="font-medium">Haz clic o arrastra un archivo CSV aquí</span>
                      <span className="text-xs text-gray-500">Separado por comas (.csv)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column Mapping */}
              {headers.length > 0 && (
                <div className="bg-black/20 rounded-lg p-4 border border-white/5 animate-fade-in">
                  <h3 className="font-medium text-sm text-gray-300 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-500" />
                    Mapeo de Columnas del Archivo
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div className="form-group mb-0">
                      <label className="text-xs text-gray-400">Nombre / Razón Social *</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1"
                        value={fieldMapping.nombre}
                        onChange={e => setFieldMapping({...fieldMapping, nombre: e.target.value})}
                      >
                        <option value="">Seleccionar columna...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Zona por Fila (NUEVA COLUMNA DINÁMICA) */}
                    <div className="form-group mb-0">
                      <label className="text-xs text-indigo-400 font-bold">Columna de {terminology.zona} (Por Fila)</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1 border-indigo-500/40"
                        value={fieldMapping.zona}
                        onChange={e => setFieldMapping({...fieldMapping, zona: e.target.value})}
                      >
                        <option value="">(Usar Zona predeterminada superior)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Teléfono */}
                    <div className="form-group mb-0">
                      <label className="text-xs text-gray-400">Teléfono / WhatsApp</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1"
                        value={fieldMapping.telefono}
                        onChange={e => setFieldMapping({...fieldMapping, telefono: e.target.value})}
                      >
                        <option value="">(No importar)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Dirección */}
                    <div className="form-group mb-0">
                      <label className="text-xs text-gray-400">Dirección</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1"
                        value={fieldMapping.direccion}
                        onChange={e => setFieldMapping({...fieldMapping, direccion: e.target.value})}
                      >
                        <option value="">(No importar)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Coordenadas */}
                    <div className="form-group mb-0 sm:col-span-2">
                      <label className="text-xs text-gray-400">Coordenadas (Lat, Lng)</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1"
                        value={fieldMapping.coordenadas}
                        onChange={e => setFieldMapping({...fieldMapping, coordenadas: e.target.value})}
                      >
                        <option value="">(No importar / Auto-geolocalizar)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    * El sistema ignorará automáticamente aquellos registros cuyo nombre o teléfono ya existan dentro de esta unidad de negocio para evitar duplicados.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Result View */
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">¡Importación Finalizada!</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-sm">
                Se han importado los registros exitosamente en la base de datos de {activeTenant?.nombre || 'la unidad'}.
              </p>
              
              <div className="flex gap-4 mb-6">
                <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                  <div className="text-xl font-bold text-emerald-400">{importResult.success}</div>
                  <div className="text-xs text-gray-400">Importados</div>
                </div>
                <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                  <div className="text-xl font-bold text-gray-400">{importResult.ignored}</div>
                  <div className="text-xs text-gray-400">Duplicados Omitidos</div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="btn btn-primary px-6 text-sm"
              >
                Cerrar Ventana
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!importResult && (
          <div className="flex justify-end gap-3 p-4 border-t border-white/10 bg-black/20">
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="btn btn-secondary text-sm px-4"
            >
              Cancelar
            </button>
            <button 
              onClick={handleImport}
              disabled={!file || isProcessing}
              className="btn btn-primary text-sm px-5 flex items-center gap-2"
            >
              {isProcessing ? 'Procesando archivo...' : `Importar ${data.length > 0 ? `(${data.length})` : ''}`}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
