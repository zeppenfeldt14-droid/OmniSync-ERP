'use client'

import { useEffect, useState } from 'react'
import { 
  LayoutDashboard, Users, Map as MapIcon, FileText, Settings, LogOut, ShieldCheck, 
  ChevronDown, ChevronRight, Plus, Globe, X, ShoppingCart, TrendingUp, Banknote, 
  Package, Home, Menu, MessageSquare, Laptop, Building2
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBell } from './mensajes/NotificationBell'
import TenantSelector from '@/components/TenantSelector'
import CurrencyToggle from '@/components/CurrencyToggle'
import { useTenant } from '@/lib/tenantContext'

interface UserSession {
  id: number
  nombre: string
  alias: string
  email: string
  nivel: number
  rol: string
  modulos: Record<string, boolean>
  zona: string | null
  zonasHabilitadas: any // Json array of enabled zones
  tenantId?: number | null
}

interface Props {
  children: React.ReactNode
  logo: string | null
  user: UserSession
  zones?: string[]
  allZones?: Array<{ id: number; nombre: string; tenantId: number | null }>
  vendedoresPorZona?: Record<string, { id: number; nombre: string; alias: string; zona: string | null }[]>
}

export function AppShellClient({ 
  children, 
  logo, 
  user, 
  zones = [], 
  allZones = [], 
  vendedoresPorZona = {} 
}: Props) {
  const pathname = usePathname()
  const { activeTenant, terminology } = useTenant()
  const [modules, setModules] = useState<Record<string, boolean>>(user.modulos || {})
  const [userName, setUserName] = useState(user.nombre)
  const [userRol, setUserRol] = useState(user.rol)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Zones UI States
  const [isZonesExpanded, setIsZonesExpanded] = useState(true)
  const [expandedZone, setExpandedZone] = useState<string | null>(null)
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null)
  
  // Create Zone Modal State
  const [showCreateZone, setShowCreateZone] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [isSubmittingZone, setIsSubmittingZone] = useState(false)

  const [userZones, setUserZones] = useState<string[]>([])

  useEffect(() => {
    // Determine allowed zones based on activeTenant and user level
    let tenantZones = zones
    if (activeTenant && allZones && allZones.length > 0) {
      const matched = allZones
        .filter(z => z.tenantId === activeTenant.id)
        .map(z => z.nombre)
      if (matched.length > 0) {
        tenantZones = matched
      }
    }

    if (user.nivel === 1) {
      setUserZones(tenantZones)
    } else if (user.nivel === 2) {
      let enabled: string[] = []
      try {
        if (user.zonasHabilitadas) {
          enabled = typeof user.zonasHabilitadas === 'string' 
            ? JSON.parse(user.zonasHabilitadas) 
            : JSON.parse(JSON.stringify(user.zonasHabilitadas))
        }
      } catch (e) {}
      setUserZones(tenantZones.filter(z => enabled.includes(z)))
    } else {
      const targetZone = tenantZones.includes(user.zona || '') 
        ? user.zona! 
        : (tenantZones[0] || user.zona || 'Zona 1')
      setUserZones([targetZone])
    }
  }, [zones, allZones, user, activeTenant])

  // Sync with localStorage if available
  useEffect(() => {
    const localModules = localStorage.getItem('user_modules')
    const localName = localStorage.getItem('staff_user')
    const localRol = localStorage.getItem('staff_user_role')

    if (localModules) {
      try {
        setModules(JSON.parse(localModules))
      } catch (e) {}
    }
    if (localName) setUserName(localName)
    if (localRol) setUserRol(localRol)
  }, [])

  // Auto-expand active zone from pathname and auto-close mobile menu
  useEffect(() => {
    setIsMobileMenuOpen(false)
    const match = pathname.match(/\/zonas\/([^/]+)/)
    if (match) {
      const activeZone = decodeURIComponent(match[1])
      setExpandedZone(activeZone)
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const v = params.get('vendedor')
      if (v) setExpandedVendedor(v)
    }
  }, [pathname])

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas salir del sistema?')) {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' })
        if (res.ok) {
          localStorage.clear()
          window.location.href = '/login'
        } else {
          alert('Error al cerrar sesión.')
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Create new zone API call (linked to active tenant)
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newZoneName.trim()) return

    setIsSubmittingZone(true)
    try {
      const res = await fetch('/api/zonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: newZoneName,
          tenantId: activeTenant?.id || null 
        })
      })

      if (res.ok) {
        alert('Nueva zona creada con éxito.')
        setShowCreateZone(false)
        setNewZoneName('')
        window.location.reload()
      } else {
        const err = await res.json()
        alert(`Error: ${err.error || 'No se pudo crear la zona.'}`)
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión con el servidor.')
    } finally {
      setIsSubmittingZone(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const isLinkActive = (path: string, exact = false) => {
    if (exact) return pathname === path
    return pathname === path || (path !== '/' && pathname.startsWith(path))
  }

  // If viewing Super Admin portal, do not render tenant sales CRM shell
  if (pathname.startsWith('/super-admin')) {
    return <>{children}</>
  }

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header" style={{ padding: logo ? '1.5rem 1rem' : '1.5rem' }}>
          {logo ? (
            <img src={logo} alt="Logo" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} />
          ) : (
            <div className="sidebar-logo">NEOSOL</div>
          )}
        </div>
        
        <nav className="sidebar-nav">
          {/* Módulo Inicio */}
          {(user.nivel === 1 || modules.inicio !== false) && (
            <Link href="/" className={`nav-item ${isLinkActive('/', true) ? 'active' : ''}`}>
              <Home className="nav-icon text-primary" />
              <span className="font-bold text-white uppercase tracking-wider text-xs">Inicio</span>
            </Link>
          )}

          {/* Bandeja de Mensajes (Global) */}
          <Link href="/mensajes" className={`nav-item ${isLinkActive('/mensajes') ? 'active' : ''}`}>
            <MessageSquare className="nav-icon text-primary" />
            <span className="font-bold text-white uppercase tracking-wider text-xs">Mensajes</span>
          </Link>

          {/* Empresas / Clientes Global (Niveles 1 y 2) */}
          {user.nivel < 3 && (
            <Link href="/empresas" className={`nav-item ${isLinkActive('/empresas') ? 'active' : ''}`}>
              <Users className="nav-icon text-primary" />
              <span className="font-bold text-white uppercase tracking-wider text-xs truncate">
                {terminology.empresas}
              </span>
            </Link>
          )}
          
          {/* LEVEL 3 (Vendedor / Ejecutivo): Show single zone directly */}
          {user.nivel === 3 ? (
            userZones.map((zone: string) => (
              <div key={zone} className="flex flex-col gap-1.5">
                <div className="px-3 py-1 text-[10px] font-black uppercase text-primary tracking-widest border-b border-white/5 mb-1.5">
                  {zone}
                </div>
                {modules.ventas !== false && (
                  <Link href={`/zonas/${zone}/ventas`} className={`nav-item ${isLinkActive(`/zonas/${zone}/ventas`) ? 'active' : ''}`}>
                    <TrendingUp className="nav-icon" />
                    <span>{terminology.ventas}</span>
                  </Link>
                )}
                {modules.visitas !== false && (
                  <Link href={`/zonas/${zone}`} className={`nav-item ${pathname === `/zonas/${zone}` ? 'active' : ''}`}>
                    <LayoutDashboard className="nav-icon" />
                    <span>{terminology.visitas}</span>
                  </Link>
                )}
                {modules.empresas !== false && (
                  <Link href={`/zonas/${zone}/empresas`} className={`nav-item ${isLinkActive(`/zonas/${zone}/empresas`) ? 'active' : ''}`}>
                    <Users className="nav-icon" />
                    <span>{terminology.empresas}</span>
                  </Link>
                )}
                {modules.planificador !== false && (
                  <Link href={`/zonas/${zone}/planificador`} className={`nav-item ${isLinkActive(`/zonas/${zone}/planificador`) ? 'active' : ''}`}>
                    <MapIcon className="nav-icon" />
                    <span>{terminology.planificador}</span>
                  </Link>
                )}
                {modules.reportes !== false && (
                  <Link href={`/zonas/${zone}/reportes`} className={`nav-item ${isLinkActive(`/zonas/${zone}/reportes`) ? 'active' : ''}`}>
                    <FileText className="nav-icon" />
                    <span>Reportes (PDF)</span>
                  </Link>
                )}

                {/* Módulos Comerciales - Level 3 */}
                <div className="px-3 py-1 text-[10px] font-black uppercase text-yellow-500/70 tracking-widest border-b border-white/5 mt-2 mb-1.5">
                  Operaciones Comerciales
                </div>
                <Link href="/crm-web" className={`nav-item ${isLinkActive('/crm-web') ? 'active' : ''}`}>
                  <Laptop className="nav-icon text-emerald-400" />
                  <span>CRM PyMEs & Web</span>
                </Link>
                {modules.pedidos !== false && (
                  <Link href="/pedidos" className={`nav-item ${isLinkActive('/pedidos') ? 'active' : ''}`}>
                    <ShoppingCart className="nav-icon" />
                    <span>{terminology.pedidos}</span>
                  </Link>
                )}
                {modules.ventas !== false && (
                  <Link href="/ventas" className={`nav-item ${isLinkActive('/ventas') ? 'active' : ''}`}>
                    <TrendingUp className="nav-icon" />
                    <span>{terminology.ventas}</span>
                  </Link>
                )}
                {modules.cobranzas !== false && (
                  <Link href="/cobranzas" className={`nav-item ${isLinkActive('/cobranzas') ? 'active' : ''}`}>
                    <Banknote className="nav-icon" />
                    <span>{terminology.cobranzas}</span>
                  </Link>
                )}
                {modules.pedidos !== false && (
                  <Link href="/facturacion" className={`nav-item ${isLinkActive('/facturacion') ? 'active' : ''}`}>
                    <FileText className="nav-icon" />
                    <span>Facturación</span>
                  </Link>
                )}
              </div>
            ))
          ) : (user.nivel === 1 || modules.zonas !== false) ? (
            /* LEVEL 1/2 (Admin / Supervisor): Show collapsible ZONAS menu */
            <div className="flex flex-col">
              <button 
                onClick={() => setIsZonesExpanded(!isZonesExpanded)}
                className="nav-item flex items-center justify-between w-full text-left"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <div className="flex items-center gap-3">
                  <Globe className="nav-icon text-primary" />
                  <span className="font-bold text-white uppercase tracking-wider text-xs">
                    {terminology.zonas}
                  </span>
                </div>
                {isZonesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isZonesExpanded && (
                <div className="pl-4 mt-2 flex flex-col gap-2 border-l border-white/5 ml-3.5">
                  {userZones.map((zone: string) => {
                    const isZoneActive = expandedZone === zone
                    return (
                      <div key={zone} className="flex flex-col gap-1">
                        <button 
                          onClick={() => setExpandedZone(isZoneActive ? null : zone)}
                          className={`nav-item flex items-center justify-between w-full py-1.5 px-3 rounded-lg text-xs font-semibold ${isZoneActive ? 'text-primary bg-white/5' : 'text-secondary hover:text-white'}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <span>{zone}</span>
                          {isZoneActive ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {isZoneActive && (
                          <div className="pl-3 mt-1 flex flex-col gap-1.5 border-l border-white/5 ml-1.5">
                            
                            {/* OPClÓN: VER TODA LA ZONA */}
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => setExpandedVendedor(expandedVendedor === 'ALL' ? null : 'ALL')}
                                className={`nav-item flex items-center justify-between w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold ${expandedVendedor === 'ALL' ? 'text-primary bg-primary/10' : 'text-secondary hover:text-white'}`}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <span>Ver Toda la Zona</span>
                                {expandedVendedor === 'ALL' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              </button>
                              
                              {expandedVendedor === 'ALL' && (
                                <div className="pl-3 mt-1 flex flex-col gap-1.5 border-l border-white/5 ml-1.5">
                                  {modules.ventas !== false && (
                                    <Link href={`/zonas/${zone}/ventas`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                      <TrendingUp className="w-3.5 h-3.5" />
                                      <span>{terminology.ventas}</span>
                                    </Link>
                                  )}
                                  {modules.visitas !== false && (
                                    <Link href={`/zonas/${zone}`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                      <LayoutDashboard className="w-3.5 h-3.5" />
                                      <span>{terminology.visitas}</span>
                                    </Link>
                                  )}
                                  {modules.empresas !== false && (
                                    <Link href={`/zonas/${zone}/empresas`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                      <Users className="w-3.5 h-3.5" />
                                      <span>{terminology.empresas}</span>
                                    </Link>
                                  )}
                                  {modules.planificador !== false && (
                                    <Link href={`/zonas/${zone}/planificador`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                      <MapIcon className="w-3.5 h-3.5" />
                                      <span>{terminology.planificador}</span>
                                    </Link>
                                  )}
                                  {modules.reportes !== false && (
                                    <Link href={`/zonas/${zone}/reportes`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Reportes (PDF)</span>
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* VENDEDORES / EJECUTIVOS DE LA ZONA */}
                            {vendedoresPorZona[zone]?.map(v => {
                              const isVendedorActive = expandedVendedor === v.alias
                              const vQuery = `?vendedor=${encodeURIComponent(v.alias)}`
                              return (
                                <div key={v.id} className="flex flex-col gap-1 mt-1">
                                  <button
                                    onClick={() => setExpandedVendedor(isVendedorActive ? null : v.alias)}
                                    className={`nav-item flex items-center justify-between w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold ${isVendedorActive ? 'text-white bg-white/10' : 'text-secondary hover:text-white'}`}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                  >
                                    <span className="truncate">{v.nombre}</span>
                                    {isVendedorActive ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  </button>

                                  {isVendedorActive && (
                                    <div className="pl-3 mt-1 flex flex-col gap-1.5 border-l border-white/5 ml-1.5">
                                      {modules.ventas !== false && (
                                        <Link href={`/zonas/${zone}/ventas${vQuery}`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                          <TrendingUp className="w-3.5 h-3.5" />
                                          <span>{terminology.ventas}</span>
                                        </Link>
                                      )}
                                      {modules.visitas !== false && (
                                        <Link href={`/zonas/${zone}${vQuery}`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                          <LayoutDashboard className="w-3.5 h-3.5" />
                                          <span>{terminology.visitas}</span>
                                        </Link>
                                      )}
                                      {modules.empresas !== false && (
                                        <Link href={`/zonas/${zone}/empresas${vQuery}`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                          <Users className="w-3.5 h-3.5" />
                                          <span>{terminology.empresas}</span>
                                        </Link>
                                      )}
                                      {modules.planificador !== false && (
                                        <Link href={`/zonas/${zone}/planificador${vQuery}`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                          <MapIcon className="w-3.5 h-3.5" />
                                          <span>{terminology.planificador}</span>
                                        </Link>
                                      )}
                                      {modules.reportes !== false && (
                                        <Link href={`/zonas/${zone}/reportes${vQuery}`} className={`nav-item !py-1.5 !px-2.5 !text-[11px]`}>
                                          <FileText className="w-3.5 h-3.5" />
                                          <span>Reportes (PDF)</span>
                                        </Link>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add Zone Button (N1 only) */}
                  {user.nivel === 1 && (
                    <button 
                      onClick={() => setShowCreateZone(true)}
                      className="nav-item flex items-center justify-center gap-1.5 mt-2 py-1.5 text-xs text-primary bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white rounded-lg transition-all font-bold cursor-pointer"
                    >
                      <Plus size={12} /> Nueva {terminology.zona}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Módulos Comerciales - Level 1/2 */}
          {user.nivel < 3 && (
            <>
              <div className="px-3 py-1 text-[10px] font-black uppercase text-yellow-500/70 tracking-widest border-b border-white/5 mt-3 mb-1.5">
                Operaciones Comerciales
              </div>
              <Link href="/crm-web" className={`nav-item ${isLinkActive('/crm-web') ? 'active' : ''}`}>
                <Laptop className="nav-icon text-emerald-400" />
                <span>CRM PyMEs & Web</span>
              </Link>
              {(user.nivel === 1 || modules.pedidos) && (
                <Link href="/pedidos" className={`nav-item ${isLinkActive('/pedidos') ? 'active' : ''}`}>
                  <ShoppingCart className="nav-icon" />
                  <span>{terminology.pedidos}</span>
                </Link>
              )}
              {(user.nivel === 1 || modules.ventas) && (
                <Link href="/ventas" className={`nav-item ${isLinkActive('/ventas') ? 'active' : ''}`}>
                  <TrendingUp className="nav-icon" />
                  <span>{terminology.ventas}</span>
                </Link>
              )}
              {(user.nivel === 1 || modules.cobranzas) && (
                <Link href="/cobranzas" className={`nav-item ${isLinkActive('/cobranzas') ? 'active' : ''}`}>
                  <Banknote className="nav-icon" />
                  <span>{terminology.cobranzas}</span>
                </Link>
              )}
              {(user.nivel === 1 || modules.pedidos) && (
                <Link href="/facturacion" className={`nav-item ${isLinkActive('/facturacion') ? 'active' : ''}`}>
                  <FileText className="nav-icon" />
                  <span>Facturación</span>
                </Link>
              )}
            </>
          )}

          {/* Módulo de Administración */}
          {user.nivel < 3 && (
            <>
              <div className="px-3 py-1 text-[10px] font-black uppercase text-yellow-500/70 tracking-widest border-b border-white/5 mt-3 mb-1.5">
                Administración
              </div>
              {(user.nivel === 1 || modules.usuarios) && (
                <Link href="/usuarios" className={`nav-item ${isLinkActive('/usuarios') ? 'active' : ''}`}>
                  <ShieldCheck className="nav-icon" />
                  <span>Usuarios & Equipo</span>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-nav" style={{ flex: 'none', borderTop: '1px solid var(--border-light)' }}>
          {modules.configuracion !== false && (
            <Link href="/configuracion" className={`nav-item ${isLinkActive('/configuracion', true) ? 'active' : ''}`}>
              <Settings className="nav-icon" />
              <span>Configuración</span>
            </Link>
          )}
          {/* Catálogo de Productos / Servicios */}
          <Link href="/configuracion/productos" className={`nav-item ${isLinkActive('/configuracion/productos') ? 'active' : ''}`}>
            <Package className="nav-icon" />
            <span>{terminology.productos}</span>
          </Link>
          <button onClick={handleLogout} className="nav-item" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut className="nav-icon" style={{ color: 'var(--danger)' }} />
            <span style={{ color: 'var(--danger)' }}>Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <img 
              src="/omnisync-logo.png" 
              alt="By OmniSync" 
              style={{ 
                height: '15px', 
                objectFit: 'contain',
                opacity: 0.6,
                filter: 'brightness(1.2)'
              }} 
            />
            <div className="hidden sm:flex items-center gap-2">
              {user.rol === 'SUPER_ADMIN' && (!user.tenantId || user.tenantId === null) ? (
                <>
                  <TenantSelector />
                  <Link
                    href="/super-admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider transition shadow-sm"
                    title="Panel de Mando Super Admin"
                  >
                    <ShieldCheck size={14} className="text-amber-400" />
                    <span>Super Admin</span>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-slate-200">
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: activeTenant?.colorPrimario || '#3b82f6',
                      boxShadow: `0 0 8px ${activeTenant?.colorPrimario || '#3b82f6'}`
                    }}
                  />
                  <span>{activeTenant?.nombre || 'Unidad de Negocio'}</span>
                </div>
              )}
              <CurrencyToggle />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="sm:hidden">
              <CurrencyToggle />
            </div>
            <NotificationBell userAlias={user.alias} />
            <div className="flex flex-col text-right">
              <span className="text-xs font-black text-white leading-tight">{userName}</span>
              <span className="text-[10px] text-secondary font-bold leading-none mt-1">{userRol}</span>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'black', fontSize: '0.85rem' }} className="text-white border border-white/10 shadow-md uppercase">
              {getInitials(userName)}
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>

      {/* CREATE ZONE MODAL */}
      {showCreateZone && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateZone} className="glass-panel card w-full max-w-sm border border-white/10 p-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-bold text-white text-base">Crear Nueva {terminology.zona}</h3>
              <button type="button" onClick={() => setShowCreateZone(false)} className="text-secondary hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-bold text-secondary">Nombre de la Zona</label>
              <input 
                type="text" 
                value={newZoneName} 
                onChange={(e) => setNewZoneName(e.target.value)} 
                placeholder="Ej. Zona ESTE" 
                className="form-input bg-black/40 border border-white/10 rounded-xl"
                required
                disabled={isSubmittingZone}
              />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setShowCreateZone(false)} 
                className="btn btn-secondary text-xs px-4"
                disabled={isSubmittingZone}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary text-xs px-5 shadow-lg shadow-primary/20 font-bold"
                disabled={isSubmittingZone}
              >
                {isSubmittingZone ? 'Guardando...' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
