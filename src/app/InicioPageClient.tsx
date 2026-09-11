'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  TrendingUp, 
  ShoppingCart, 
  Banknote, 
  Users, 
  ArrowRight,
  Package,
  Calendar,
  ChevronDown,
  Info,
  DollarSign,
  Clock,
  Receipt,
  Tag,
  Sparkles,
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import SharedPeriodFilter from '@/components/SharedPeriodFilter'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

// Dynamic import to avoid SSR issues with Leaflet
const ZoneHeatMap = dynamic(
  () => import('@/components/ZoneHeatMap').then(m => m.ZoneHeatMap),
  { ssr: false, loading: () => (
    <div style={{ height: '560px', background: 'rgba(15,23,42,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando mapa...</div>
    </div>
  )}
)

// Colors for Recharts
const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
const COLORS_PROMOS = ['#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6']
const COLOR_PRIMARY = '#3b82f6'
const COLOR_SUCCESS = '#10b981'

export function InicioPageClient({ data, currentUser, vendedoresDisponibles = [] }: { data: any, currentUser: any, vendedoresDisponibles?: { alias: string, zona: string | null, nombre: string }[] }) {
  const { kpis, recentActivity, charts, heatmap, availableZones, selectedZones } = data
  const router = useRouter()
  const searchParams = useSearchParams()

  // Dropdown UI state
  const [isOpenFilter, setIsOpenFilter] = useState(false)
  const [isOpenZoneFilter, setIsOpenZoneFilter] = useState(false)
  const [isOpenVendedorFilter, setIsOpenVendedorFilter] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const zoneDropdownRef = useRef<HTMLDivElement>(null)
  const vendedorDropdownRef = useRef<HTMLDivElement>(null)

  // Current period and zone values
  const currentPeriodParam = searchParams.get('period') || 'mes'
  const currentZonaParam = searchParams.get('zona') || 'todas'
  const currentVendedorParam = searchParams.get('vendedor') || ''

  // Parse selected months from query param
  const getSelectedMonths = () => {
    if (currentPeriodParam === 'hoy' || currentPeriodParam === 'semana' || currentPeriodParam === 'todo') {
      return []
    }
    if (currentPeriodParam === 'mes') {
      return [new Date().getMonth()]
    }
    return currentPeriodParam.split(',').map(Number).filter(n => !isNaN(n))
  }

  const selectedMonths = getSelectedMonths()

  // Handle clicking outside filter dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target as Node)) {
        setIsOpenZoneFilter(false)
      }
      if (vendedorDropdownRef.current && !vendedorDropdownRef.current.contains(event.target as Node)) {
        setIsOpenVendedorFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(val)
  }

  const handlePeriodChange = (newPeriod: string) => {
    const params = new URLSearchParams()
    params.set('period', newPeriod)
    if (currentZonaParam) params.set('zona', currentZonaParam)
    if (currentVendedorParam) params.set('vendedor', currentVendedorParam)
    router.push(`/?${params.toString()}`)
  }

  // Handle zone navigation
  const handleToggleZone = (zone: string) => {
    let newZones = [...selectedZones]
    if (newZones.includes(zone)) {
      if (newZones.length > 1) {
        newZones = newZones.filter(z => z !== zone)
      }
    } else {
      newZones.push(zone)
    }

    const params = new URLSearchParams()
    if (currentPeriodParam) params.set('period', currentPeriodParam)
    
    if (newZones.length === availableZones.length) {
      params.set('zona', 'todas')
    } else {
      params.set('zona', newZones.join(','))
    }
    // Note: When changing zones, we don't carry over the vendedor since they might not belong to the new zones
    router.push(`/?${params.toString()}`)
  }

  const handleSelectAllZones = () => {
    const params = new URLSearchParams()
    if (currentPeriodParam) params.set('period', currentPeriodParam)
    params.set('zona', 'todas')
    router.push(`/?${params.toString()}`)
    setIsOpenZoneFilter(false)
  }

  // Label for the zones button
  const getZoneFilterLabel = () => {
    if (currentZonaParam === 'todas' || selectedZones.length === availableZones.length) {
      return 'Todas las Zonas'
    }
    if (selectedZones.length === 1) {
      return `Zona: ${selectedZones[0]}`
    }
    return `${selectedZones.length} Zonas`
  }

  const handleSelectVendedor = (alias: string) => {
    const params = new URLSearchParams()
    if (currentPeriodParam) params.set('period', currentPeriodParam)
    if (currentZonaParam) params.set('zona', currentZonaParam)
    
    if (alias === 'todos') {
      params.delete('vendedor')
    } else {
      params.set('vendedor', alias)
    }
    
    router.push(`/?${params.toString()}`)
    setIsOpenVendedorFilter(false)
  }

  // Deduplicate vendedores just in case
  const uniqueVendedores = Array.from(new Map(vendedoresDisponibles.map(v => [v.alias, v])).values())

  return (
    <div className="flex-1 flex flex-col w-full pb-16">
      
      {/* CABECERA CON FILTROS SELECT MÚLTIPLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            INICIO <Sparkles size={16} className="text-primary animate-pulse" />
          </h1>
          <p className="text-sm text-secondary">Tablero de control general y analíticas de KPIs.</p>
        </div>
        
        <div className="flex items-center gap-3">
          
          {/* Dropdown de Zonas (Selección Múltiple) */}
          {availableZones.length > 1 && (
            <div className="relative" ref={zoneDropdownRef}>
              <button 
                onClick={() => setIsOpenZoneFilter(!isOpenZoneFilter)}
                className="px-4 py-2.5 text-xs font-bold bg-[#141E3C] border border-white/5 hover:border-primary/40 text-white rounded-xl shadow-xl flex items-center gap-2.5 transition-all duration-300"
              >
                <MapPin size={14} className="text-emerald-400" />
                <span>{getZoneFilterLabel()}</span>
                <ChevronDown size={12} className="text-secondary/70 transition-transform duration-300" style={{ transform: isOpenZoneFilter ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>

              {isOpenZoneFilter && (
                <div className="absolute left-0 md:left-auto md:right-0 mt-3 w-[290px] sm:w-72 backdrop-blur-xl bg-[#0e162d]/95 border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(59,130,246,0.15)] z-50 p-5 animate-fade-in origin-top-left md:origin-top-right">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">Filtrar por Zonas</span>
                    {selectedZones.length < availableZones.length && (
                      <button 
                        onClick={handleSelectAllZones}
                        className="text-[9px] font-bold text-primary hover:underline"
                      >
                        Seleccionar Todas
                      </button>
                    )}
                  </div>
                  
                  {/* Grid de Zonas con Checkboxes Customizados */}
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {availableZones.map((zone: string) => {
                      const isChecked = selectedZones.includes(zone)
                      return (
                        <div 
                          key={zone} 
                          onClick={() => handleToggleZone(zone)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all duration-200 ${
                            isChecked 
                              ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                              : 'border-white/5 bg-black/25 text-secondary hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span>{zone}</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                            isChecked ? 'bg-primary text-white' : 'border border-white/20 bg-black/40'
                          }`}>
                            {isChecked && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dropdown de Vendedores (Single Select) */}
          {currentUser.nivel !== 3 && uniqueVendedores.length > 0 && (
            <div className="relative" ref={vendedorDropdownRef}>
              <button 
                onClick={() => setIsOpenVendedorFilter(!isOpenVendedorFilter)}
                className="px-4 py-2.5 text-xs font-bold bg-[#141E3C] border border-white/5 hover:border-primary/40 text-white rounded-xl shadow-xl flex items-center gap-2.5 transition-all duration-300"
              >
                <Users size={14} className="text-violet-400" />
                <span>{currentVendedorParam ? `@${currentVendedorParam}` : 'Todos los Vendedores'}</span>
                <ChevronDown size={12} className="text-secondary/70 transition-transform duration-300" style={{ transform: isOpenVendedorFilter ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>

              {isOpenVendedorFilter && (
                <div className="absolute left-0 md:left-auto md:right-0 mt-3 w-[290px] sm:w-72 backdrop-blur-xl bg-[#0e162d]/95 border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(139,92,246,0.15)] z-50 p-5 animate-fade-in origin-top-left md:origin-top-right">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">Filtrar por Vendedor</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    <div 
                      onClick={() => handleSelectVendedor('todos')}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all duration-200 ${
                        !currentVendedorParam 
                          ? 'bg-violet-500/10 border-violet-500/50 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                          : 'border-white/5 bg-black/25 text-secondary hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span>Todos los Vendedores</span>
                    </div>

                    {uniqueVendedores.map((v) => {
                      const isSelected = currentVendedorParam === v.alias
                      return (
                        <div 
                          key={v.alias} 
                          onClick={() => handleSelectVendedor(v.alias)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all duration-200 ${
                            isSelected 
                              ? 'bg-violet-500/10 border-violet-500/50 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                              : 'border-white/5 bg-black/25 text-secondary hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{v.nombre}</span>
                            <span className="text-[10px] opacity-70">@{v.alias}</span>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <SharedPeriodFilter 
            currentPeriod={currentPeriodParam} 
            onPeriodChange={handlePeriodChange} 
            align="right"
          />
        </div>
      </div>

      {/* METRICAS PRINCIPALES - 5 CUBOS EN UNA SOLA LÍNEA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-14 w-full">
        
        {/* Cubo 1: Facturación */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-primary/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Facturación Total</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">{formatMoney(kpis.totalFacturado)}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-[10px] text-secondary/60 mt-3 font-medium">Consolidado ventas</div>
        </div>

        {/* Cubo 2: Cobranzas Cobrado */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-success/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Total Cobrado</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">{formatMoney(kpis.totalCobrado)}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Banknote size={16} />
            </div>
          </div>
          <div className="text-[10px] text-emerald-400 mt-3 font-bold">Cobros registrados</div>
        </div>

        {/* Cubo 3: Cobranza Pendiente */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-danger/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Cobranza Pendiente</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">{formatMoney(kpis.cobranzaPendiente)}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-[10px] text-rose-400 mt-3 font-bold">Saldos pendientes</div>
        </div>

        {/* Cubo 4: Cajas Vendidas */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-warning/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Cajas Vendidas</span>
              <h3 className="text-xl font-black text-white mt-1 leading-none">{kpis.cajasVendidas}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
              <Package size={16} />
            </div>
          </div>
          <div className="text-[10px] text-secondary/60 mt-3 font-medium">Volumen despachado</div>
        </div>

        {/* Cubo 5: Clientes */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-purple-500/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Clientes Activos</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">
                {kpis.clientesActivos} <span className="text-xs text-secondary font-medium">Activos</span>
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
              <Users size={16} />
            </div>
          </div>
          <div className="text-[10px] text-purple-400 mt-3 font-bold">
            {kpis.clientesProspecto} Potenciales
          </div>
        </div>

      </div>

      {/* MAPA DE CALOR DE ZONA */}
      <div className="mb-10 w-full">
        {/* Leaflet CSS — required for the map to render correctly */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        {/* MAPA */}
        <div className="glass-panel card p-[3px] mt-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-xl" />
          <div className="bg-[#0f172a] rounded-[20px] overflow-hidden relative z-10 border border-white/5">
            <ZoneHeatMap 
              visitas={heatmap.visitas} 
              ventas={heatmap.ventas} 
              totalEmpresas={heatmap.allPoints?.length ?? (heatmap.visitas.length + heatmap.ventas.length)} 
              empresasSinCoordenadas={heatmap.empresasSinCoordenadas || 0}
              selectedZones={selectedZones}
              userNivel={currentUser.nivel}
              userZona={currentUser.zona}
              allPoints={heatmap.allPoints}
              vendedoresDisponibles={uniqueVendedores}
            />
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE GRÁFICOS (6 Gráficos en 2 filas) */}
      <div className="flex flex-wrap mb-14 w-full" style={{ rowGap: '2.5rem', columnGap: '1.5rem' }}>
        
        {/* Gráfico 1: Cobranza Pendiente por Zona */}
        <div className="w-full lg:w-[calc(33.333%-1rem)] glass-panel card p-6 border-white/5 flex flex-col justify-between min-w-0 overflow-hidden hover:border-white/10 transition-colors duration-300" style={{ minHeight: '380px' }}>
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" /> Cobranza Pendiente por Zona
          </h4>
          <div className="w-full relative" style={{ height: '230px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.cobranzaZonas}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.cobranzaZonas.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda con scroll contenido para evitar desbordes */}
          <div className="overflow-y-auto flex flex-wrap gap-2 text-[10px] justify-center border-t border-white/5 pt-3 custom-scrollbar" style={{ maxHeight: '110px' }}>
            {charts.cobranzaZonas.map((z: any, i: number) => (
              <span key={z.name} className="flex items-center gap-1.5 text-secondary font-semibold bg-white/[0.02] px-2 py-1 rounded-lg border border-white/5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS_PIE[i % COLORS_PIE.length] }} />
                <span className="truncate max-w-[90px]" title={z.name}>{z.name}</span>
                <b className="text-white ml-0.5">{formatMoney(z.value)}</b>
              </span>
            ))}
            {charts.cobranzaZonas.length === 0 && (
              <span className="text-secondary/50 italic py-2">Sin cobranzas pendientes</span>
            )}
          </div>
        </div>

        {/* Gráfico 2: Ventas por Zona */}
        <div className="w-full lg:w-[calc(33.333%-1rem)] glass-panel card p-6 border-white/5 flex flex-col justify-between min-w-0 overflow-hidden hover:border-white/10 transition-colors duration-300" style={{ minHeight: '380px' }}>
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" /> Ventas Totales por Zona
          </h4>
          <div className="w-full relative" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.zonas} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="zone" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(val) => `$${Number(val)/1000}k`} />
                <Tooltip 
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="sales" fill={COLOR_PRIMARY} maxBarSize={35}>
                  {charts.zonas.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Cobros por Método */}
        <div className="w-full lg:w-[calc(33.333%-1rem)] glass-panel card p-6 border-white/5 flex flex-col justify-between min-w-0 overflow-hidden hover:border-white/10 transition-colors duration-300" style={{ minHeight: '380px' }}>
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" /> Cobrado del Mes por Método
          </h4>
          <div className="w-full relative" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={charts.metodos} 
                layout="vertical"
                margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(val) => `$${Number(val)/1000}k`} />
                <YAxis dataKey="method" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip 
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="amount" fill={COLOR_SUCCESS} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fila de Gráficos 2 (Promociones, Ventas Snacks, Ventas Tripacks) */}

        {/* Gráfico 4: Promociones en Ventas */}
        <div className="w-full lg:w-[calc(33.333%-1rem)] glass-panel card p-6 border-white/5 flex flex-col justify-between min-w-0 overflow-hidden hover:border-white/10 transition-colors duration-300" style={{ minHeight: '380px' }}>
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-pink-500 rounded-full" /> Promociones en Ventas (Cajas)
          </h4>
          <div className="w-full relative" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={charts.promociones} 
                layout="vertical"
                margin={{ top: 10, right: 15, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={8} tickLine={false} width={80} />
                <Tooltip 
                  formatter={(value) => [`${value} Cajas`, 'Entregado']}
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="value" maxBarSize={25}>
                  {charts.promociones.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PROMOS[index % COLORS_PROMOS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 5: Ventas Snacks */}
        <div className="w-full lg:w-[calc(33.333%-1rem)] glass-panel card p-6 border-white/5 flex flex-col justify-between min-w-0 overflow-hidden hover:border-white/10 transition-colors duration-300" style={{ minHeight: '380px' }}>
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full" /> Ventas de Snacks (Cajas)
          </h4>
          <div className="w-full relative" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.snacks} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={7} tickLine={false} height={35} interval={0} tick={({x, y, payload}) => {
                  const label = payload.value.split(" ")[0]
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={10} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight="bold">
                        {label}
                      </text>
                    </g>
                  )
                }} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 6: Ventas Tripacks */}
        <div className="w-full lg:w-[calc(33.333%-1rem)] glass-panel card p-6 border-white/5 flex flex-col justify-between min-w-0 overflow-hidden hover:border-white/10 transition-colors duration-300" style={{ minHeight: '380px' }}>
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full" /> Ventas de Tripacks (Cajas)
          </h4>
          <div className="w-full relative" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.tripacks} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} height={35} interval={0} tick={({x, y, payload}) => {
                  const label = payload.value.split(" ")[0]
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={10} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight="bold">
                        {label}
                      </text>
                    </g>
                  )
                }} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="value" fill="#f59e0b" maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECCIÓN INFERIOR PREMIUM: ÚLTIMOS PEDIDOS & VENTAS RECIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 items-stretch mb-14 w-full" style={{ rowGap: '2.5rem', columnGap: '1.5rem' }}>
        
        {/* Columna Izquierda/Centro: Últimos Pedidos (Estilo Cápsulas Premium - 10 elementos) */}
        <div className="lg:col-span-2 min-w-0">
          <div className="glass-panel card p-6 border-white/5 h-full flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Últimos Pedidos</h4>
              </div>
              <Link href="/pedidos" className="px-3.5 py-1.5 rounded-xl text-[10px] font-black text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 flex items-center gap-1.5">
                Ver todos <ArrowRight size={11} />
              </Link>
            </div>
            
            <div className="overflow-x-auto flex-1 custom-scrollbar pr-1">
              <table className="w-full border-separate border-spacing-y-2.5 text-left min-w-[600px]">
                <thead>
                  <tr className="text-[10px] font-black text-secondary/60 uppercase tracking-widest">
                    <th className="pb-2 pl-4">Nº Pedido</th>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Zona</th>
                    <th className="pb-2 text-right pr-4">Monto</th>
                    <th className="pb-2 text-center pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.pedidos.map((p: any) => (
                    <tr key={p.id} className="group text-xs transition-all duration-200">
                      <td className="py-4 pl-4 rounded-l-2xl bg-[#141F3C]/30 border-y border-l border-white/5 group-hover:border-primary/30 group-hover:bg-[#1A284C]/50 transition-all duration-300 font-bold text-white">
                        <span className="flex items-center gap-2">
                          <ShoppingCart size={13} className="text-secondary/40 group-hover:text-primary/70 transition-colors" />
                          {p.numeroPedido}
                        </span>
                      </td>
                      <td className="py-4 bg-[#141F3C]/30 border-y border-white/5 group-hover:border-primary/30 group-hover:bg-[#1A284C]/50 transition-all duration-300 text-secondary group-hover:text-white font-semibold transition-colors truncate max-w-[200px]" title={p.empresa?.nombre || 'Cliente General'}>
                        {p.empresa?.nombre || 'Cliente General'}
                      </td>
                      <td className="py-4 bg-[#141F3C]/30 border-y border-white/5 group-hover:border-primary/30 group-hover:bg-[#1A284C]/50 transition-all duration-300 text-secondary/80 font-medium">
                        {p.zona || 'Sin Zona'}
                      </td>
                      <td className="py-4 bg-[#141F3C]/30 border-y border-white/5 group-hover:border-primary/30 group-hover:bg-[#1A284C]/50 transition-all duration-300 text-right font-black text-white pr-4">
                        {formatMoney(p.totalGeneral || p.total || 0)}
                      </td>
                      <td className="py-4 rounded-r-2xl bg-[#141F3C]/30 border-y border-r border-white/5 group-hover:border-primary/30 group-hover:bg-[#1A284C]/50 transition-all duration-300 text-center pr-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] tracking-wider border shadow-md ${
                          p.estado === 'aprobado' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)]' :
                          p.estado === 'borrador' ? 'bg-gray-500/10 text-gray-400 border-white/5' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)]'
                        }`}>
                          {(p.estado || 'REGISTRADO').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentActivity.pedidos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-secondary/60 italic font-semibold rounded-2xl bg-[#141F3C]/30 border border-white/5">
                        No hay pedidos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Ventas Recientes (Ticket / Receipt Premium - 5 elementos) */}
        <div className="lg:col-span-1 min-w-0">
          <div className="glass-panel card p-6 border-white/5 h-full flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2.5 mb-6 shrink-0">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Ventas Recientes</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1" style={{ maxHeight: '500px' }}>
              {recentActivity.ventas.map((v: any) => (
                <div key={v.id} className="group bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl p-4.5 border border-white/5 hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4),0_0_15px_rgba(59,130,246,0.05)] transition-all duration-300">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Receipt size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate max-w-[140px]">
                          {v.pedido?.empresa?.nombre || v.empresa?.nombre || 'Cliente General'}
                        </span>
                        <span className="text-[10px] text-secondary/60 font-semibold">{v.numeroFactura || `FAC-${v.id}`}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider ${
                      v.tipo === 'A' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {v.tipo ? `FAC-${v.tipo}` : 'VENTA'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs mt-3">
                    <span className="text-[10px] text-secondary/70 font-semibold flex items-center gap-1">
                      <Clock size={11} className="text-secondary/50" /> {new Date(v.creadoEn || v.fecha || Date.now()).toLocaleDateString()}
                    </span>
                    <span className="font-black text-white text-sm bg-white/5 px-2 py-0.5 rounded-md">{formatMoney(v.total || v.totalGeneral || 0)}</span>
                  </div>

                  <div className="text-[9px] text-secondary/50 border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
                    <span>Zona: <b className="text-secondary/80">{v.pedido?.zona || v.empresa?.zona || v.zona || 'General'}</b></span>
                    <span>Vendedor: <b className="text-secondary/80">@{v.pedido?.vendedorAlias || v.vendedorAlias || 'Ventas'}</b></span>
                  </div>
                </div>
              ))}
              
              {recentActivity.ventas.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-secondary/60 italic font-semibold">
                  No hay ventas registradas
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN FINAL: TOP PRODUCTOS MÁS VENDIDOS */}
      <div className="shrink-0 w-full" style={{ marginTop: '3.5rem', marginBottom: '4rem' }}>
        <div className="glass-panel card p-6 border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Productos más vendidos (Volumen en Cajas)</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {charts.productos.map((p: any, index: number) => {
              const maxCajas = charts.productos[0]?.value || 1
              const percent = Math.min((p.value / maxCajas) * 100, 100)
              
              // Colors for the top positions
              const numberBadgeColor = 
                index === 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
                index === 1 ? 'bg-slate-400/20 text-slate-300 border-slate-400/35 shadow-[0_0_15px_rgba(148,163,184,0.15)]' :
                index === 2 ? 'bg-amber-700/20 text-amber-600 border-amber-700/35 shadow-[0_0_15px_rgba(180,83,9,0.15)]' :
                'bg-white/5 text-secondary border-white/5'

              return (
                <div key={p.name} className="flex flex-col gap-2 p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-black/30 transition-all duration-300">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg border text-xs font-black flex items-center justify-center ${numberBadgeColor}`}>
                        #{index + 1}
                      </span>
                      <span className="text-xs font-bold text-white leading-tight truncate max-w-[200px] md:max-w-[280px]" title={p.name}>
                        {p.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-black bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
                      {p.value} Cajas
                    </span>
                  </div>
                  
                  {/* Barra de progreso visual */}
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mt-1 border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
            
            {charts.productos.length === 0 && (
              <div className="col-span-2 py-8 text-center text-secondary/60 italic font-semibold rounded-2xl bg-black/20 border border-white/5">
                Sin datos de productos en este período
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
