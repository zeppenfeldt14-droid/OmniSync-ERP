'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Building2, Plus, Users, MapPin, Layers, RefreshCw, CheckCircle2, 
  ArrowRight, ShieldCheck, DollarSign, Package, Sparkles, X, Globe, Settings,
  FileText, ExternalLink, Phone, Mail, Shield, UserCheck, AlertCircle
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
  empresas?: Array<{ id: number; nombre: string; cuit: string | null; telefono: string | null; email: string | null; zona: string | null; estado: string }>
}

export default function SuperAdminTenantsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setActiveTenant } = useTenant()
  const [tenants, setTenants] = useState<TenantRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Ficha Técnica Modal
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null)

  // Modal Provisioning State
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

        // If ?selected=id is in URL, open that dossier
        const selectId = searchParams.get('selected')
        if (selectId) {
          const found = data.find((t: TenantRecord) => t.id === Number(selectId))
          if (found) setSelectedTenant(found)
        }
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
    <div className="space-y-8 animate-fade-in text-zinc-200">
      {/* ── HEADER BANNER ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-1.5">
              <ShieldCheck size={16} /> Módulo Super Admin • Directorio Maestro
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Gestión de Inquilinos SaaS
              <span className="text-xs px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                {tenants.length} Unidades
              </span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Cada unidad de negocio opera con aislamiento comercial completo. Como Super Admin, consulta la <strong>Ficha Técnica</strong> de cada inquilino o aprovisiona nuevos espacios con 4 zonas estándar y su equipo preconfigurado.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTenants}
              className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer"
              title="Actualizar listado"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Nuevo Inquilino</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* ── GRID DE INQUILINOS ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
          <RefreshCw size={32} className="animate-spin text-amber-500" />
          <p className="text-xs font-mono uppercase tracking-widest">Cargando unidades de negocio...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tenants.map(tenant => {
            const isLogistica = tenant.tipoModelo === 'FISICO_TERRENO'
            const isAgencia = tenant.tipoModelo === 'SERVICIOS_DIGITALES'

            return (
              <div
                key={tenant.id}
                className="bg-[#0e1017] border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all duration-200 group"
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div 
                        className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner"
                        style={{ backgroundColor: tenant.colorPrimario || '#2563eb' }}
                      >
                        {tenant.slug.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight group-hover:text-amber-400 transition">
                          {tenant.nombre}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-zinc-400">/{tenant.slug}</span>
                          <span className="text-zinc-600">·</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isLogistica 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : isAgencia
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isLogistica ? 'Logística & Calle' : isAgencia ? 'Agencia Digital & Marketing' : 'E-Commerce B2B'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Activo
                    </span>
                  </div>

                  <p className="text-zinc-400 text-xs line-clamp-2 mb-5 leading-relaxed">
                    {tenant.descripcion || 'Espacio comercial B2B con aislamiento de datos y fuerza de venta.'}
                  </p>

                  {/* Estadísticas Clave */}
                  <div className="grid grid-cols-4 gap-2 mb-5 bg-[#050505] p-3 rounded-2xl border border-white/5">
                    <div className="text-center">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold block">Clientes</span>
                      <span className="text-base font-extrabold text-white">{tenant._count.empresas}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold block">Zonas</span>
                      <span className="text-base font-extrabold text-indigo-400">{tenant._count.zonas}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold block">Equipo</span>
                      <span className="text-base font-extrabold text-emerald-400">{tenant._count.usuarios}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold block">Moneda</span>
                      <span className="text-base font-extrabold text-amber-400">{tenant.moneda}</span>
                    </div>
                  </div>

                  {/* Zonas de Cobertura */}
                  <div className="mb-5">
                    <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-2">
                      <MapPin size={13} className="text-indigo-400" />
                      Zonas Estándar ({tenant.zonas.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tenant.zonas.map(z => (
                        <span 
                          key={z.id}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 text-zinc-300 border border-white/10 flex items-center gap-1.5"
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
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-white/10 flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedTenant(tenant)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
                  >
                    <FileText size={14} />
                    <span>Ver Ficha Completa</span>
                  </button>
                  <button
                    onClick={() => handleSwitchAndGo(tenant)}
                    className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl border border-white/10 hover:border-indigo-500/40 bg-white/5 hover:bg-indigo-950/40 text-zinc-300 hover:text-indigo-300 text-xs font-bold transition cursor-pointer"
                    title="Inspeccionar en Modo Soporte"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">Soporte</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL FICHA TÉCNICA COMPLETA DE INQUILINO (INSPIRADA EN E-OMNISYNC) ── */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#0b0d13] border border-amber-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-auto">
            {/* Cabecera de la Ficha */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between bg-[#0e1017] sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg"
                  style={{ backgroundColor: selectedTenant.colorPrimario || '#2563eb' }}
                >
                  {selectedTenant.slug.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {selectedTenant.nombre}
                    </h2>
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PLAN PRO
                    </span>
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      LICENCIA ACTIVA
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400 mt-1">
                    <span className="text-amber-400 font-bold">{selectedTenant.slug}.omnisync.com</span>
                    <span>·</span>
                    <span>Moneda Base: <strong className="text-white">{selectedTenant.moneda}</strong></span>
                    <span>·</span>
                    <span>Industria: <strong className="text-white">{selectedTenant.tipoModelo}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTenant(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo de la Ficha */}
            <div className="p-6 space-y-6">
              {/* 4 Métricas Clave */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-zinc-400 block font-bold">Clientes Registrados</span>
                  <span className="text-2xl font-black text-white font-mono">{selectedTenant._count.empresas}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Cartera de cuentas</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-zinc-400 block font-bold">Operadores / Asientos</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">{selectedTenant._count.usuarios}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Roles activos</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-zinc-400 block font-bold">Zonas de Operación</span>
                  <span className="text-2xl font-black text-indigo-400 font-mono">{selectedTenant._count.zonas}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Estándar 1 a 4</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-zinc-400 block font-bold">Catálogo de Servicios</span>
                  <span className="text-2xl font-black text-amber-400 font-mono">{selectedTenant._count.productos}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Items habilitados</span>
                </div>
              </div>

              {/* Ficha del Responsable / Titular */}
              <div className="p-5 rounded-2xl bg-[#12141c] border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Ficha del Responsable & Contacto Directo
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Titular / Gerente</span>
                    <span className="text-xs font-bold text-white block mt-0.5">
                      {selectedTenant.usuarios.find(u => u.nivel === 1)?.nombre || 'Gerente General'}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">Nivel 1 (Super Admin de Unidad)</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Email de Acceso</span>
                    <span className="text-xs font-bold text-white block mt-0.5 font-mono truncate">
                      {selectedTenant.usuarios.find(u => u.nivel === 1)?.email || `admin@${selectedTenant.slug}.com`}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Login principal</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Canal Directo Soporte</span>
                    <span className="text-xs font-bold text-emerald-400 block mt-0.5 font-mono">
                      WhatsApp Operativo
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Soporte técnico OmniSync</span>
                  </div>
                </div>
              </div>

              {/* Lista de Usuarios del Inquilino */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-emerald-400" />
                    Equipo y Operadores Asignados ({selectedTenant.usuarios.length})
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">PostgreSQL: Usuario</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedTenant.usuarios.map(u => (
                    <div key={u.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{u.nombre}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                            u.nivel === 1 ? 'bg-amber-500/20 text-amber-300' :
                            u.nivel === 2 ? 'bg-indigo-500/20 text-indigo-300' :
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {u.rol}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                          <span>{u.alias}</span>
                          <span>·</span>
                          <span className="truncate">{u.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-zinc-300 border border-white/5">
                        {u.zona || 'Todas'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clientes de Muestra */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={16} className="text-indigo-400" />
                    Cuentas / Clientes ({selectedTenant._count.empresas})
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">Exclusivos de esta unidad</span>
                </div>

                {selectedTenant.empresas && selectedTenant.empresas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {selectedTenant.empresas.slice(0, 10).map(e => (
                      <div key={e.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 truncate">{e.nombre}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{e.zona || 'Zona 1'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic py-3 text-center">
                    Este inquilino no tiene clientes cargados aún. Puede cargarlos masivamente vía CSV.
                  </p>
                )}
              </div>
            </div>

            {/* Footer Modal con Botón de Entrada a la Unidad */}
            <div className="p-6 border-t border-white/10 bg-[#0e1017] flex items-center justify-between sticky bottom-0">
              <span className="text-xs text-zinc-400">
                Aislamiento completo: Los datos de venta y catálogo solo son visibles dentro del ERP del inquilino.
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 text-xs font-bold cursor-pointer"
                >
                  Cerrar Ficha
                </button>
                <button
                  onClick={() => handleSwitchAndGo(selectedTenant)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <span>Inspeccionar como Inquilino</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR NUEVO INQUILINO ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0e1017] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0b0d13]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Aprovisionar Nuevo Inquilino SaaS</h3>
                  <p className="text-xs text-zinc-400">Entrega llave en mano con 4 zonas estándar y 8 usuarios base.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Unidad de Negocio / Inquilino *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Agencia Marketing Alpha, Distribuidora Central, Azuchel, etc."
                  value={formData.nombre}
                  onChange={handleNombreChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Slug Identificador (URL) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="azuchel"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                    URL: {formData.slug || 'slug'}.omnisync.com
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Modelo de Industria
                  </label>
                  <select
                    value={formData.tipoModelo}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      tipoModelo: e.target.value,
                      moneda: e.target.value === 'FISICO_TERRENO' ? 'ARS' : 'USD',
                      colorPrimario: e.target.value === 'FISICO_TERRENO' ? '#2563eb' : '#7c3aed'
                    }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="SERVICIOS_DIGITALES">Agencia de Publicidad & Marketing</option>
                    <option value="FISICO_TERRENO">Logística & Fuerza en Terreno</option>
                    <option value="ECOMMERCE">E-Commerce & Venta Online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Moneda Principal
                  </label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
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
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Color de Marca (Primario)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.colorPrimario}
                      onChange={(e) => setFormData(prev => ({ ...prev, colorPrimario: e.target.value }))}
                      className="h-10 w-12 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={formData.colorPrimario}
                      onChange={(e) => setFormData(prev => ({ ...prev, colorPrimario: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Descripción Operativa
                </label>
                <textarea
                  rows={2}
                  placeholder="Alcance del negocio, segmento de clientes y notas administrativas..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Notice Box */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-200">
                  <Sparkles size={14} /> El sistema aprovisionará de inmediato:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-zinc-400 pl-1 text-[11px]">
                  <li><strong>4 Zonas estándar:</strong> Zona 1, Zona 2, Zona 3 y Zona 4 (a geolocalizar por su Admin).</li>
                  <li><strong>8 Usuarios base:</strong> Gerente General, Supervisor, Asistente, Analista y 4 Vendedores.</li>
                  <li><strong>Catálogo y plantilla de precios:</strong> Inicial según la industria seleccionada.</li>
                </ul>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
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
