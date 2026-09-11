'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Globe, 
  Building2, 
  Users, 
  ShieldCheck, 
  Package, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  Layers, 
  ExternalLink,
  Sparkles,
  MapPin,
  FileText
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DashboardData {
  kpis: {
    totalTenants: number
    activeTenants: number
    totalEmpresas: number
    totalUsuarios: number
    totalProductos: number
    totalZonas: number
  }
  modeloStats: {
    FISICO_TERRENO: number
    SERVICIOS_DIGITALES: number
    ECOMMERCE: number
  }
  tenants: Array<{
    id: number
    nombre: string
    slug: string
    tipoModelo: string
    moneda: string
    colorPrimario: string
    activo: boolean
    _count: {
      empresas: number
      usuarios: number
      zonas: number
      productos: number
    }
  }>
  recentLogs: Array<{
    id: number
    usuarioAlias: string
    tipoAccion: string
    detalles: string
    creadoEn: string
  }>
}

export default function SuperAdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return (
    <div className="space-y-8 animate-fade-in text-zinc-200">
      {/* ── BANNER CABECERA SAAS ── */}
      <div className="bg-gradient-to-r from-[#0d1017] via-[#121622] to-[#0d1017] border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-amber-400">
                OmniSync Universal Engine • SaaS Command Center
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Tablero Global de la Plataforma
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Supervisión de salud del software, volumen consolidado de clientes en red, gestión de inquilinos y auditoría de operadores. Las operaciones comerciales de venta pertenecen con estricto aislamiento a cada inquilino.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer"
              title="Recargar métricas"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/super-admin/tenants"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
            >
              <Plus size={16} />
              <span>Nuevo Inquilino</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPIS GLOBALES ── */}
      {loading || !data ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
          <RefreshCw size={28} className="animate-spin text-amber-500" />
          <p className="text-xs font-mono uppercase tracking-widest">Calculando métricas globales...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Inquilinos */}
            <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider">Inquilinos SaaS</span>
                <Building2 size={18} className="text-amber-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {data.kpis.activeTenants}
                <span className="text-xs text-zinc-500 font-normal ml-2">/ {data.kpis.totalTenants} total</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Unidades de negocio aprovisionadas</p>
            </div>

            {/* Clientes Consolidados */}
            <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider">Clientes en Red</span>
                <Users size={18} className="text-indigo-400" />
              </div>
              <div className="text-3xl font-black text-indigo-400 font-mono tracking-tight">
                {data.kpis.totalEmpresas}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Cuentas comerciales bajo gestión</p>
            </div>

            {/* Operadores Totales */}
            <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider">Operadores Registrados</span>
                <ShieldCheck size={18} className="text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {data.kpis.totalUsuarios}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Asientos y licencias de usuario</p>
            </div>

            {/* Catálogo Maestro */}
            <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider">Soluciones & Catálogo</span>
                <Package size={18} className="text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                {data.kpis.totalProductos}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Productos y servicios en plantillas</p>
            </div>
          </div>

          {/* ── DISTRIBUCIÓN POR MODELOS DE NEGOCIO ── */}
          <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
                  Arquitectura Multitenant
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                  <Layers size={18} className="text-amber-500" />
                  Modelos de Industria Habilitados
                </h3>
              </div>
              <Link
                href="/super-admin/templates"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition"
              >
                <span>Explorar Plantillas Maestras</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Modelo 1: Logística */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/20 to-transparent border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                    🚚 Logística en Terreno
                  </span>
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {data.modeloStats.FISICO_TERRENO || 0} Inquilinos
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Fuerzas de venta de calle, 4 zonas geolocalizadas (ej. CABA/Oeste/Sur/Norte), catálogo físico con precios por bultos/cajas, preventa y cobranzas.
                </p>
                <div className="text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/5 flex items-center gap-2">
                  <MapPin size={12} className="text-blue-400" />
                  <span>Geolocalización activa por zona</span>
                </div>
              </div>

              {/* Modelo 2: Agencia Digital */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/20 to-transparent border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                    💻 Agencia Digital & Marketing
                  </span>
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {data.modeloStats.SERVICIOS_DIGITALES || 0} Inquilinos
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Agencias de publicidad y desarrollo de sistemas. 4 zonas estándar, catálogo de 8 servicios (Web, KPIs, Redes, Marketing, Plataformas), abonos mensuales.
                </p>
                <div className="text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/5 flex items-center gap-2">
                  <Sparkles size={12} className="text-purple-400" />
                  <span>Multimoneda USD/Local integrada</span>
                </div>
              </div>

              {/* Modelo 3: E-Commerce */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/20 to-transparent border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    🛒 E-Commerce & B2B
                  </span>
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {data.modeloStats.ECOMMERCE || 0} Inquilinos
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Distribuidoras y mayoristas comerciales. Catálogo online con stock en tiempo real, cotizador de pedidos y zonas de entrega programada.
                </p>
                <div className="text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/5 flex items-center gap-2">
                  <Package size={12} className="text-emerald-400" />
                  <span>Sincronización masiva de inventario</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RESUMEN DE INQUILINOS Y ACCESO DIRECTO A FICHA TÉCNICA ── */}
          <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
                  Unidades Activas
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                  <Building2 size={18} className="text-amber-500" />
                  Directorio Rápido de Inquilinos
                </h3>
              </div>
              <Link
                href="/super-admin/tenants"
                className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center gap-2"
              >
                <span>Administración Completa</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-3">Inquilino</th>
                    <th className="py-3 px-3">Modelo</th>
                    <th className="py-3 px-3">Subdominio / Slug</th>
                    <th className="py-3 px-3 text-center">Empresas</th>
                    <th className="py-3 px-3 text-center">Zonas</th>
                    <th className="py-3 px-3 text-center">Equipo</th>
                    <th className="py-3 px-3 text-center">Moneda</th>
                    <th className="py-3 px-3 text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.tenants.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: t.colorPrimario || '#6366f1' }} 
                          />
                          <span className="font-bold text-white">{t.nombre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                          {t.tipoModelo}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        /{t.slug}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-white">
                        {t._count.empresas}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-400 font-bold">
                        {t._count.zonas}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">
                        {t._count.usuarios}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                        {t.moneda}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/super-admin/tenants?selected=${t.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500 hover:text-black border border-white/10 text-zinc-300 text-[11px] font-bold transition"
                        >
                          <FileText size={12} />
                          <span>Ver Ficha</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
