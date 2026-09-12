'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Globe, 
  Building2, 
  Layers, 
  Users, 
  ShieldCheck, 
  LogOut, 
  ArrowUpRight, 
  Menu, 
  X,
  LayoutDashboard,
  Plus,
  Sparkles,
  ChevronRight
} from 'lucide-react'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<{ nombre: string; alias: string; rol?: string } | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const user = data?.user || (data?.success ? data.user : null) || data
        if (user && (user.nivel === 1 || user.rol === 'SUPER_ADMIN' || user.role === 'GLOBAL_ADMIN' || user.alias === 'Elarez' || user.alias === 'admin')) {
          setAdminUser(user)
          setLoadingAuth(false)
        } else {
          router.replace('/login?callbackUrl=/super-admin')
        }
      })
      .catch(() => {
        router.replace('/login?callbackUrl=/super-admin')
      })
  }, [router])

  const handleLogout = async () => {
    if (confirm('¿Cerrar sesión de Super Administrador?')) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/login'
      } catch (e) {
        window.location.href = '/login'
      }
    }
  }

  const menuItems = [
    { 
      label: 'Dashboard Global', 
      href: '/super-admin', 
      exact: true,
      icon: Globe,
      desc: 'Métricas SaaS agregadas' 
    },
    { 
      label: 'Gestión Inquilinos', 
      href: '/super-admin/tenants', 
      icon: Building2,
      desc: 'Fichas técnicas y alta' 
    },
    { 
      label: 'Modelos de Negocio', 
      href: '/super-admin/templates', 
      icon: Layers,
      desc: 'Plantillas y verticales' 
    },
    { 
      label: 'Usuarios Globales', 
      href: '/super-admin/users', 
      icon: Users,
      desc: 'Gestión de accesos' 
    },
    { 
      label: 'Auditoría & Logs', 
      href: '/super-admin/audit', 
      icon: ShieldCheck,
      desc: 'Bitácora y seguridad' 
    },
  ]

  const isLinkActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="flex min-h-screen w-full bg-[#05060a] text-white font-sans selection:bg-amber-500 selection:text-black">
      {/* ── HEADER MÓVIL ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0c14]/95 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <img 
            src="/omnisync-logo.png" 
            alt="By OmniSync" 
            className="h-4 object-contain brightness-125"
          />
          <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            Super Admin
          </span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-400"
          aria-label="Abrir Menú"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── DRAWER MÓVIL ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[85%] max-w-xs bg-[#0c0e17] border-r border-white/10 h-full flex flex-col z-50 p-5 rounded-r-[32px]">
            <div className="flex flex-col items-center text-center pb-4 border-b border-white/10 mb-4">
              <img 
                src="/omnisync-logo.png" 
                alt="By OmniSync" 
                className="h-6 object-contain brightness-125 mb-1"
              />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
                SaaS Master Engine
              </span>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              <div className="px-3 py-1 text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">
                MAIN
              </div>
              {menuItems.map((item) => {
                const active = isLinkActive(item.href, item.exact)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
                      active
                        ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-black' : 'text-amber-500/80'} />
                    <span className="text-xs uppercase tracking-wider font-bold">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="pt-4 border-t border-white/10 space-y-2 mt-auto">
              <Link
                href="/super-admin/tenants"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-500 text-black font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                <Plus size={15} />
                <span>Nuevo Inquilino</span>
              </Link>
              <Link
                href="/"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold transition"
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={16} className="text-indigo-400" />
                  <span>ERP de Ventas</span>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 px-3.5 py-2.5 w-full text-xs font-bold uppercase tracking-wider rounded-2xl bg-red-500/10 border border-red-500/20"
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR DESKTOP CÁPSULA ORGÁNICA (CERO ESQUINAS) ── */}
      <div className="hidden lg:block fixed top-0 bottom-0 left-0 p-3.5 z-50 w-[290px]">
        <aside className="w-full h-full bg-[#0c0e17]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden">
          
          {/* Cabecera con Logo By OmniSync Centrado */}
          <div className="p-5 border-b border-white/10 flex flex-col items-center text-center">
            <Link href="/super-admin" className="flex flex-col items-center group">
              <img 
                src="/omnisync-logo.png" 
                alt="By OmniSync" 
                className="h-5 object-contain brightness-125 group-hover:scale-105 transition-transform"
              />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-500 mt-1">
                SaaS Master Engine
              </span>
            </Link>
          </div>

          {/* Tarjeta de Perfil Administrador */}
          <div className="mx-3.5 mt-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-black text-xs shadow-md uppercase">
                {adminUser?.alias ? adminUser.alias.substring(0, 2) : 'SA'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white leading-tight">
                  {adminUser?.nombre || adminUser?.alias || 'Elarez'}
                </span>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sesión activa" />
          </div>

          {/* Navigation Items (MAIN) */}
          <nav className="flex-1 px-3.5 py-3 space-y-1 overflow-y-auto custom-scrollbar">
            <div className="px-3 pt-2 pb-1 text-[10px] font-black tracking-[0.25em] text-zinc-500 uppercase">
              MAIN
            </div>
            {menuItems.map((item) => {
              const active = isLinkActive(item.href, item.exact)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-150 ${
                    active
                      ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-500/25 scale-[1.02]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      active ? 'bg-black/15 text-black' : 'bg-white/5 text-amber-500 group-hover:bg-amber-500/10'
                    }`}>
                      <Icon size={17} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs tracking-wider uppercase truncate ${active ? 'font-black text-black' : 'font-semibold text-zinc-200 group-hover:text-white'}`}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                  {active && (
                    <ChevronRight size={14} className="text-black shrink-0" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Tarjeta de Acción Rápida Inferior ("Centro de Mando / Let's start") */}
          <div className="p-3.5 pt-0 space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 text-center">
              <span className="text-[11px] font-black text-white block mb-0.5">
                Centro de Mando
              </span>
              <p className="text-[10px] text-zinc-400 leading-tight mb-2.5">
                Aprovisioná inquilinos o configurá plantillas.
              </p>
              <Link
                href="/super-admin/tenants"
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <Plus size={14} />
                <span>+ Nuevo Inquilino</span>
              </Link>
            </div>

            {/* Accesos de Navegación y Logout */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-indigo-950/40 border border-white/10 hover:border-indigo-500/40 text-zinc-300 hover:text-indigo-300 text-[11px] font-bold transition group"
                title="Ir al ERP operativo de inquilinos"
              >
                <LayoutDashboard size={13} className="text-indigo-400 group-hover:scale-110 transition" />
                <span>ERP Ventas</span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition"
                title="Cerrar Sesión"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>

        </aside>
      </div>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 lg:ml-[290px] min-h-screen min-w-0 w-full lg:w-[calc(100%-290px)] bg-gradient-to-br from-[#05060a] via-[#080b14] to-[#05060a] pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1500px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

