'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, MapPin, Phone, Building2, Download, MessageCircle, AlertTriangle, CheckCircle, XCircle, Upload, Target } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import CsvImportModal from '@/components/CsvImportModal'
import { useTenant } from '@/lib/tenantContext'

type Empresa = {
  id: number
  nombre: string
  zona: string | null
  subZona: string | null
  rubro: string | null
  vendedorAsignado: string | null
  ocultarVendedor: boolean
  direccion: string | null
  barrio: string | null
  telefono: string | null
  telefono2: string | null
  estado: string
  cicloVentaDias: number | null
  creadoEn: Date
  tenantId?: number | null
  visitas: any[]
}

type Vendedor = {
  id: number
  nombre: string
  alias: string
  zona: string | null
  tenantId?: number | null
}

type SolicitudReasignacion = {
  id: number
  empresaId: number
  empresaNombre: string
  solicitadoPor: string
  zonaOrigen: string | null
  zonaDestino: string
  vendedorDestino: string
  estado: string
  creadoEn: string
}

export default function EmpresasGlobalClient({ 
  empresas, 
  zonasBase, 
  allZonas = [],
  subZonas, 
  rubros,
  vendedores,
  userNivel
}: { 
  empresas: Empresa[], 
  zonasBase: string[],
  allZonas?: Array<{ id: number; nombre: string; tenantId: number | null }>,
  subZonas: string[], 
  rubros: string[],
  vendedores: Vendedor[],
  userNivel: number
}) {
  const { activeTenant, terminology } = useTenant()

  const [searchQuery, setSearchQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'prospecto' | 'activo' | 'baja' | 'descartada'>('todos')
  const [zonaFilter, setZonaFilter] = useState<string>('todas')
  const [vendedorFilter, setVendedorFilter] = useState<string>('todos')
  const [rubroFilter, setRubroFilter] = useState<string>('todos')

  const [solicitudes, setSolicitudes] = useState<SolicitudReasignacion[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  
  useEffect(() => {
    if (userNivel === 1) {
      fetch('/api/reasignaciones')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSolicitudes(data)
        })
        .catch(console.error)
    }
  }, [userNivel])

  const handleAprobarSolicitud = async (id: number, aprobar: boolean) => {
    if (!confirm(`¿Estás seguro de que deseas ${aprobar ? 'aprobar' : 'rechazar'} esta reasignación?`)) return
    try {
      const res = await fetch('/api/reasignaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: aprobar ? 'aprobada' : 'rechazada' })
      })
      if (res.ok) {
        alert('Solicitud procesada con éxito.')
        setSolicitudes(s => s.filter(x => x.id !== id))
        if (aprobar) {
          window.location.reload()
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Error al procesar solicitud')
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión')
    }
  }

  // Aislamiento por Tenant: filtrar empresas por activeTenant
  const tenantEmpresas = useMemo(() => {
    if (!activeTenant) return empresas
    return empresas.filter(emp => !emp.tenantId || emp.tenantId === activeTenant.id)
  }, [empresas, activeTenant])

  // Zonas del tenant activo
  const tenantZonas = useMemo(() => {
    if (!activeTenant || !allZonas || allZonas.length === 0) return zonasBase
    const matched = allZonas.filter(z => z.tenantId === activeTenant.id).map(z => z.nombre)
    return matched.length > 0 ? matched : zonasBase
  }, [zonasBase, allZonas, activeTenant])

  // Vendedores del tenant activo
  const tenantVendedores = useMemo(() => {
    if (!activeTenant) return vendedores
    return vendedores.filter(v => !v.tenantId || v.tenantId === activeTenant.id)
  }, [vendedores, activeTenant])

  const filteredEmpresas = useMemo(() => {
    const result = tenantEmpresas.filter(emp => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = q === '' || 
        emp.nombre.toLowerCase().includes(q) || 
        (emp.barrio || '').toLowerCase().includes(q) || 
        (emp.direccion || '').toLowerCase().includes(q)

      const matchesEstado = estadoFilter === 'todos' || emp.estado === estadoFilter

      const empZona = emp.zona ? emp.zona.trim().toUpperCase() : 'SIN ASIGNAR'
      const matchesZona = zonaFilter === 'todas' || empZona === zonaFilter.toUpperCase()

      let matchesVendedor = true
      if (vendedorFilter === 'sin_vendedor') {
        matchesVendedor = !emp.vendedorAsignado
      } else if (vendedorFilter !== 'todos') {
        matchesVendedor = emp.vendedorAsignado === vendedorFilter
      }

      const empRubro = emp.rubro ? emp.rubro.trim().toUpperCase() : 'SIN RUBRO'
      const matchesRubro = rubroFilter === 'todos' || empRubro === rubroFilter.toUpperCase()

      return matchesSearch && matchesEstado && matchesZona && matchesVendedor && matchesRubro
    })
    
    // Order: Activos -> Prospectos -> Bajas -> Descartadas
    const estadoOrder: Record<string, number> = {
      'activo': 1,
      'prospecto': 2,
      'baja': 3,
      'descartada': 4
    }

    return result.sort((a, b) => {
      const orderA = estadoOrder[a.estado] || 99
      const orderB = estadoOrder[b.estado] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.nombre.localeCompare(b.nombre)
    })
  }, [tenantEmpresas, searchQuery, estadoFilter, zonaFilter, vendedorFilter, rubroFilter])

  // Alertas Globales
  const empresasSinZona = useMemo(() => tenantEmpresas.filter(e => !e.zona || e.zona.trim() === ''), [tenantEmpresas])
  const empresasSinVendedor = useMemo(() => tenantEmpresas.filter(e => !e.vendedorAsignado || e.vendedorAsignado.trim() === ''), [tenantEmpresas])

  const kpis = useMemo(() => {
    const total = tenantEmpresas.length
    const prospectos = tenantEmpresas.filter(e => e.estado === 'prospecto').length
    const clientes = tenantEmpresas.filter(e => e.estado === 'activo').length
    const efectividad = total > 0 ? Math.round((clientes / total) * 100) : 0
    return { total, prospectos, clientes, efectividad }
  }, [tenantEmpresas])

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">{terminology.empresas}</h1>
          <p className="page-subtitle">
            Directorio de {terminology.empresas.toLowerCase()} en {activeTenant?.nombre || 'la plataforma'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title="Importar Potenciales (CSV)">
            <Upload size={16} /> Importar
          </button>
          <Link href={`/empresas/nueva`} className="btn btn-primary">
            <Plus size={18} /> {terminology.nuevaEmpresa}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel card flex flex-col items-center justify-center text-center" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="badge badge-info" style={{ padding: '0.15rem 0.4rem' }}><Building2 size={12} /></div>
            <span className="stat-label" style={{ fontSize: '0.85rem' }}>Total {terminology.empresas}</span>
          </div>
          <div className="stat-value text-primary" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{kpis.total}</div>
          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Registradas en este espacio</div>
        </div>

        <div className="glass-panel card flex flex-col items-center justify-center text-center" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="glass-panel card p-4 relative overflow-hidden flex flex-col justify-center items-center text-center shadow-lg hover:shadow-xl transition-shadow border-white/5 hover:border-white/10" style={{ minWidth: '150px' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="stat-label text-yellow-500" style={{ fontSize: '0.85rem' }}>Potenciales</span>
              </div>
              <div className="stat-value text-yellow-500" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{kpis.prospectos}</div>
              <div className="text-[10px] text-yellow-500/80 font-medium">Oportunidades</div>
            </div>
          </div>
        </div>

        <div className="glass-panel card flex flex-col items-center justify-center text-center" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="badge badge-success" style={{ padding: '0.15rem 0.4rem' }}><CheckCircle size={12} /></div>
            <span className="stat-label text-green-400" style={{ fontSize: '0.85rem' }}>Clientes activos</span>
          </div>
          <div className="stat-value text-green-400" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{kpis.clientes}</div>
          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Cartera activa</div>
        </div>

        <div className="glass-panel card flex flex-col items-center justify-center text-center" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="badge badge-info" style={{ padding: '0.15rem 0.4rem' }}><CheckCircle size={12} /></div>
            <span className="stat-label text-blue-400" style={{ fontSize: '0.85rem' }}>Efectividad</span>
          </div>
          <div className="stat-value text-blue-400" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{kpis.efectividad}%</div>
          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{kpis.clientes} de {kpis.total} objetivo</div>
        </div>
      </div>

      {userNivel === 1 && solicitudes.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Solicitudes de Reasignación Pendientes ({solicitudes.length})
          </h3>
          <div className="space-y-2">
            {solicitudes.map(sol => (
              <div key={sol.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 gap-3">
                <div>
                  <div className="font-bold text-white text-sm">{sol.empresaNombre}</div>
                  <div className="text-xs text-secondary mt-0.5">
                    Solicitado por: <span className="text-white">{sol.solicitadoPor}</span> &bull; 
                    Destino: <span className="text-orange-400">{sol.zonaDestino}</span> ({sol.vendedorDestino})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAprobarSolicitud(sol.id, true)} className="btn btn-sm btn-success">
                    Aprobar
                  </button>
                  <button onClick={() => handleAprobarSolicitud(sol.id, false)} className="btn btn-sm btn-danger">
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas de Registros Incompletos */}
      {(empresasSinZona.length > 0 || empresasSinVendedor.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {empresasSinZona.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
              <span className="text-xs text-yellow-300">
                ⚠️ Hay <strong>{empresasSinZona.length}</strong> {terminology.empresas.toLowerCase()} sin {terminology.zona.toLowerCase()} asignada.
              </span>
              <button 
                onClick={() => setZonaFilter('SIN ASIGNAR')} 
                className="text-xs text-yellow-400 underline hover:text-yellow-200 cursor-pointer"
              >
                Ver
              </button>
            </div>
          )}
          {empresasSinVendedor.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
              <span className="text-xs text-blue-300">
                ℹ️ Hay <strong>{empresasSinVendedor.length}</strong> {terminology.empresas.toLowerCase()} sin {terminology.vendedor.toLowerCase()} asignado.
              </span>
              <button 
                onClick={() => setVendedorFilter('sin_vendedor')} 
                className="text-xs text-blue-400 underline hover:text-blue-200 cursor-pointer"
              >
                Ver
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="glass-panel card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-secondary" size={16} />
            <input
              type="text"
              placeholder={`Buscar ${terminology.empresa.toLowerCase()}, dirección...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input pl-9 text-xs"
            />
          </div>

          <select
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value as any)}
            className="form-input text-xs"
          >
            <option value="todos">Todos los Estados</option>
            <option value="prospecto">Potenciales</option>
            <option value="activo">Clientes Activos</option>
            <option value="baja">Baja</option>
            <option value="descartada">Descartada</option>
          </select>

          <select
            value={zonaFilter}
            onChange={e => setZonaFilter(e.target.value)}
            className="form-input text-xs"
          >
            <option value="todas">Todas las {terminology.zonas}</option>
            {tenantZonas.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
            <option value="SIN ASIGNAR">Sin Asignar</option>
          </select>

          <select
            value={vendedorFilter}
            onChange={e => setVendedorFilter(e.target.value)}
            className="form-input text-xs"
          >
            <option value="todos">Todos los {terminology.vendedores}</option>
            <option value="sin_vendedor">Sin Asignar</option>
            {tenantVendedores.map(v => (
              <option key={v.id} value={v.alias}>{v.nombre} ({v.alias})</option>
            ))}
          </select>

          <select
            value={rubroFilter}
            onChange={e => setRubroFilter(e.target.value)}
            className="form-input text-xs"
          >
            <option value="todos">Todos los Rubros</option>
            {rubros.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Empresas */}
      <div className="glass-panel card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-secondary uppercase font-bold tracking-wider text-[10px]">
                <th className="p-3">{terminology.empresa}</th>
                <th className="p-3">{terminology.zona}</th>
                <th className="p-3">Rubro</th>
                <th className="p-3">{terminology.vendedor}</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-secondary">
                    No se encontraron {terminology.empresas.toLowerCase()} registradas en este espacio.
                  </td>
                </tr>
              ) : (
                filteredEmpresas.map(emp => {
                  const estadoBadge = {
                    activo: 'badge-success',
                    prospecto: 'badge-warning',
                    baja: 'badge-danger',
                    descartada: 'badge-secondary'
                  }[emp.estado] || 'badge-secondary'

                  return (
                    <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-semibold text-white">
                        <Link href={`/empresas/${emp.id}`} className="hover:text-primary transition-colors flex flex-col">
                          <span>{emp.nombre}</span>
                          <span className="text-[10px] text-secondary font-normal">{emp.direccion || emp.barrio || 'Sin dirección'}</span>
                        </Link>
                      </td>
                      <td className="p-3">
                        <span className="badge badge-outline text-[10px]">{emp.zona || 'Sin Zona'}</span>
                      </td>
                      <td className="p-3 text-secondary">{emp.rubro || '-'}</td>
                      <td className="p-3">
                        {emp.vendedorAsignado ? (
                          <span className="text-slate-300 font-medium">{emp.vendedorAsignado}</span>
                        ) : (
                          <span className="text-secondary italic text-[10px]">Sin asignar</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`badge ${estadoBadge} text-[10px] capitalize`}>{emp.estado}</span>
                      </td>
                      <td className="p-3 text-secondary">
                        {emp.telefono ? (
                          <a href={`tel:${emp.telefono}`} className="hover:text-white flex items-center gap-1">
                            <Phone size={11} /> {emp.telefono}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <Link href={`/empresas/${emp.id}`} className="btn btn-xs btn-outline">
                          Ver Perfil
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Importación CSV */}
      {showImportModal && (
        <CsvImportModal 
          zonaName={tenantZonas[0] || 'Zona 1'} 
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
