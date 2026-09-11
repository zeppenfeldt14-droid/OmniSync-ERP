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
  LayoutDashboard
} from 'lucide-react'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authorized, setAuthorized] = useState(true)
  const [adminUser, setAdminUser] = useState<{ nombre: string; alias: string } | null>(null)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) {
          setAdminUser(user)
          if (user.nivel !== 1 && user.role !== 'GLOBAL_ADMIN') {
            router.replace('/')
          }
        }
      })
      .catch(() => {})
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
      desc: 'Fichas técnicas y aprovisionamiento' 
    },
    { 
      label: 'Modelos de Negocio', 
      href: '/super-admin/templates', 
      icon: Layers,
      desc: 'Plantillas Logística, Agencia, E-Com' 
    },
    { 
      label: 'Usuarios de Plataforma', 
      href: '/super-admin/users', 
      icon: Users,
      desc: 'Gestión agrupada por inquilino' 
    },
    { 
      label: 'Auditoría & Logs', 
      href: '/super-admin/audit', 
      icon: ShieldCheck,
      desc: 'Bitácora y eventos del sistema' 
    },
  ]

  const isLinkActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="flex min-h-screen w-full bg-[#050505] text-white font-sans selection:bg-amber-500 selection:text-black">
      {/* ── HEADER MÓVIL ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          <Link href="/super-admin" className="flex items-baseline gap-1.5">
            <span className="text-lg font-black tracking-tight text-white">
              Omni<span className="text-amber-500">Sync</span>
            </span>
            <span className="text-[9px] font-mono font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
              Super Admin
            </span>
          </Link>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-400"
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
          <div className="relative w-[85%] max-w-xs bg-[#0a0a0a] border-r border-white/10 h-full flex flex-col z-50 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase">SaaS Platform</span>
                </div>
                <h2 className="text-xl font-black text-white">
                  Omni<span className="text-amber-500">Sync</span>
                </h2>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const active = isLinkActive(item.href, item.exact)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
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
                href="/"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold transition"
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={16} className="text-indigo-400" />
                  <span>ERP de Ventas</span>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 px-3.5 py-2.5 w-full text-xs font-bold uppercase tracking-wider rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR DESKTOP (FIJO) ── */}
      <aside className="hidden lg:flex w-[270px] bg-[#090a0f] border-r border-white/10 flex-col fixed h-full z-50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[9px] font-black tracking-[0.25em] text-amber-500 uppercase">SaaS Master Engine</span>
          </div>
          <Link href="/super-admin" className="block">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Omni<span className="text-amber-500">Sync</span>
            </h1>
          </Link>
          <p className="text-[10px] text-zinc-400 mt-1 uppercase font-mono tracking-wider">
            Centro de Mando Super Admin
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isLinkActive(item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex flex-col px-4 py-3 rounded-2xl transition-all ${
                  active
                    ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={active ? 'text-black' : 'text-amber-500/70 group-hover:text-amber-400'} />
                  <span className={`text-xs tracking-wider uppercase ${active ? 'font-black' : 'font-semibold'}`}>
                    {item.label}
                  </span>
                </div>
                <span className={`text-[10px] ml-7 mt-0.5 line-clamp-1 ${active ? 'text-black/70' : 'text-zinc-500'}`}>
                  {item.desc}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2 bg-[#07070a]">
          <Link
            href="/"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-indigo-950/40 border border-white/10 hover:border-indigo-500/40 text-zinc-300 hover:text-indigo-300 text-xs font-semibold transition group"
            title="Ir al ERP operativo de inquilinos"
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard size={15} className="text-indigo-400 group-hover:scale-110 transition" />
              <span>ERP de Ventas</span>
            </div>
            <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-indigo-400" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 text-zinc-400 hover:text-red-400 transition-colors px-3.5 py-2.5 w-full text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-white/5"
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 lg:ml-[270px] min-h-screen min-w-0 w-full lg:w-[calc(100%-270px)] bg-gradient-to-br from-[#050505] via-[#090a0f] to-[#050505] pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1500px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
