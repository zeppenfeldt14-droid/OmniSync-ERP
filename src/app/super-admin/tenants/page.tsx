'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, Plus, Users, MapPin, Layers, RefreshCw, CheckCircle2, 
  ArrowRight, ShieldCheck, DollarSign, Package, Sparkles, X, Globe, Settings
} from 'lucide-react'
import { useTenant } from '@/lib/tenantContext'

export const dynamic = 'force-dynamic'

interface TenantRecord {
  id: number
  nombre: string
  slug: string
  descripcion: string | null
  tipoModelo: string
  moneda: string
  colorPrimario: string
  colorSecundario: string
  activo: boolean
  creadoEn: string
  _count: {
    empresas: number
    usuarios: number
    zonas: number
    productos: number
  }
  zonas: Array<{ id: number; nombre: string; color: string | null }>
  usuarios: Array<{ id: number; nombre: string; alias: string; email: string; rol: string; nivel: number; zona: string | null }>
}

export default function SuperAdminTenantsPage() {
  const router = useRouter()
  const { setActiveTenant } = useTenant()
  const [tenants, setTenants] = useState<TenantRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    tipoModelo: 'SERVICIOS_DIGITALES',
    moneda: 'USD',
    descripcion: '',
    colorPrimario: '#7c3aed',
    colorSecundario: '#6d28d9'
  })

  const fetchTenants = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/super-admin/tenants')
      if (res.ok) {
        const data = await res.json()
        setTenants(data)
      } else {
        const err = await res.json()
        setErrorMsg(err.error || 'Error al cargar inquilinos')
      }
    } catch (e: any) {
      setErrorMsg('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  // Auto-fill slug from name
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    setFormData(prev => ({
      ...prev,
      nombre: val,
      slug: autoSlug
    }))
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim() || !formData.slug.trim()) {
      alert('Por favor completa el nombre y slug del inquilino.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (res.ok) {
        alert(`¡Inquilino "${formData.nombre}" aprovisionado con éxito!\nSe crearon 4 zonas estándar y 8 usuarios base.`)
        setShowModal(false)
        setFormData({
          nombre: '',
          slug: '',
          tipoModelo: 'SERVICIOS_DIGITALES',
          moneda: 'USD',
          descripcion: '',
          colorPrimario: '#7c3aed',
          colorSecundario: '#6d28d9'
        })
        await fetchTenants()
      } else {
        alert(`Error: ${data.error || 'No se pudo crear el inquilino'}`)
      }
    } catch (err) {
      alert('Error de conexión al aprovisionar el inquilino.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSwitchAndGo = (tenant: TenantRecord) => {
    setActiveTenant({
      id: tenant.id,
      slug: tenant.slug,
      nombre: tenant.nombre,
      descripcion: tenant.descripcion,
      shortCode: tenant.slug.substring(0, 3).toUpperCase(),
      colorPrimario: tenant.colorPrimario || '#2563eb',
      colorSecundario: tenant.colorSecundario || '#1d4ed8',
      logoUrl: null,
      tipoModelo: tenant.tipoModelo as any,
      moneda: tenant.moneda,
      sheetUrl: null,
      sheetUltimaSync: null,
      configuracion: {},
      activo: tenant.activo
    })
    router.push('/')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-widest mb-1">
              <ShieldCheck size={16} /> Módulo Super Admin • Dueño de Plataforma
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Directorio de Inquilinos SaaS
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {tenants.length} Espacios de Trabajo
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Administra las unidades de negocio alquiladas en la plataforma. Cada inquilino cuenta con aislamiento total de base de datos, 4 zonas estándar geolocalizables y equipo de 8 roles preconfigurados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTenants}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Actualizar listado"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus size={18} />
              <span>Nuevo Inquilino</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Grid de Inquilinos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <RefreshCw size={32} className="animate-spin text-indigo-400" />
          <p className="text-sm font-medium">Cargando unidades de negocio...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {tenants.map(tenant => {
            const isLogistica = tenant.tipoModelo === 'FISICO_TERRENO'
            const isAgencia = tenant.tipoModelo === 'SERVICIOS_DIGITALES'

            return (
              <div
                key={tenant.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col justify-between transition-all duration-200 hover:shadow-indigo-950/20"
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-inner"
                        style={{ backgroundColor: tenant.colorPrimario || '#2563eb' }}
                      >
                        {tenant.slug.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight">
                          {tenant.nombre}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-slate-400">/{tenant.slug}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isLogistica 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : isAgencia
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isLogistica ? 'Logística & Calle' : isAgencia ? 'Agencia Digital & Cuentas' : 'E-Commerce'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Activo
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs line-clamp-2 mb-5">
                    {tenant.descripcion || 'Sin descripción asignada.'}
                  </p>

                  {/* Estadísticas Clave */}
                  <div className="grid grid-cols-4 gap-2 mb-5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Empresas</span>
                      <span className="text-base font-extrabold text-white">{tenant._count.empresas}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Zonas</span>
                      <span className="text-base font-extrabold text-indigo-400">{tenant._count.zonas}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Usuarios</span>
                      <span className="text-base font-extrabold text-white">{tenant._count.usuarios}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Moneda</span>
                      <span className="text-base font-extrabold text-emerald-400">{tenant.moneda}</span>
                    </div>
                  </div>

                  {/* Zonas Disponibles */}
                  <div className="mb-5">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-2">
                      <MapPin size={13} className="text-indigo-400" />
                      Zonas Asignadas ({tenant.zonas.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tenant.zonas.map(z => (
                        <span 
                          key={z.id}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5"
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: z.color || tenant.colorPrimario || '#6366f1' }} 
                          />
                          {z.nombre}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Equipo Asignado */}
                  <div className="mb-5">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-2">
                      <Users size={13} className="text-purple-400" />
                      Equipo Estándar ({tenant.usuarios.length} miembros):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
                      {tenant.usuarios.slice(0, 4).map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 truncate bg-slate-950/40 px-2 py-1 rounded border border-slate-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <span className="truncate text-slate-300 font-medium">{u.nombre}</span>
                          <span className="text-[10px] text-slate-500 uppercase">({u.rol})</span>
                        </div>
                      ))}
                    </div>
                    {tenant.usuarios.length > 4 && (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        + {tenant.usuarios.length - 4} miembros adicionales (Vendedores Zona 1..4)
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                  <button
                    onClick={() => handleSwitchAndGo(tenant)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white font-bold text-xs transition cursor-pointer shadow-sm"
                  >
                    <span>Entrar a este Espacio</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => router.push('/configuracion')}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Configurar Mapa y Zonas"
                  >
                    <Settings size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear Nuevo Inquilino */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Aprovisionar Nuevo Inquilino SaaS</h3>
                  <p className="text-xs text-slate-400">Entrega llave en mano con 4 zonas estándar y 8 usuarios base.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Unidad de Negocio / Inquilino *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Agencia Marketing Alpha, Distribuidora Central, etc."
                  value={formData.nombre}
                  onChange={handleNombreChange}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Slug Identificador (URL) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="agencia-alpha"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Modelo de Industria / Negocio
                  </label>
                  <select
                    value={formData.tipoModelo}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      tipoModelo: e.target.value,
                      moneda: e.target.value === 'FISICO_TERRENO' ? 'ARS' : 'USD',
                      colorPrimario: e.target.value === 'FISICO_TERRENO' ? '#2563eb' : '#7c3aed'
                    }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SERVICIOS_DIGITALES">Agencia de Publicidad & Digital</option>
                    <option value="FISICO_TERRENO">Logística & Fuerza en Terreno</option>
                    <option value="ECOMMERCE">E-Commerce & Venta Online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Moneda Principal
                  </label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="USD">Dólares (USD)</option>
                    <option value="ARS">Pesos Argentinos (ARS)</option>
                    <option value="PEN">Soles Peruanos (PEN)</option>
                    <option value="CLP">Pesos Chilenos (CLP)</option>
                    <option value="COP">Pesos Colombianos (COP)</option>
                    <option value="MXN">Pesos Mexicanos (MXN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Color de Marca (Primario)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.colorPrimario}
                      onChange={(e) => setFormData(prev => ({ ...prev, colorPrimario: e.target.value }))}
                      className="h-9 w-12 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={formData.colorPrimario}
                      onChange={(e) => setFormData(prev => ({ ...prev, colorPrimario: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripción Operativa
                </label>
                <textarea
                  rows={2}
                  placeholder="Alcance del negocio, segmento de clientes y notas administrativas..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notice Box */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-200">
                  <Sparkles size={14} /> El sistema creará de inmediato:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                  <li><strong>4 Zonas estándar:</strong> Zona 1, Zona 2, Zona 3 y Zona 4 (listas para geolocalizar).</li>
                  <li><strong>8 Usuarios base:</strong> Gerente General, Supervisor, Asistente, Analista y 4 Vendedores.</li>
                  <li><strong>Catálogo y precios:</strong> Plantilla inicial según la industria seleccionada.</li>
                </ul>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Aprovisionando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Aprovisionar Inquilino</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
