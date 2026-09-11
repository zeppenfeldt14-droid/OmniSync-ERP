'use client'

import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  Shield, 
  Building2, 
  RefreshCw, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Lock, 
  Check, 
  X,
  MapPin
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PlatformUser {
  id: number
  nombre: string
  alias: string
  email: string
  rol: string
  nivel: number
  zona: string | null
  activo: boolean
  loginCount: number
  creadoEn: string
  tenantId: number | null
  tenant: {
    id: number
    nombre: string
    slug: string
    colorPrimario: string
    tipoModelo: string
  } | null
}

interface TenantItem {
  id: number
  nombre: string
  slug: string
  colorPrimario: string
  tipoModelo: string
  _count: {
    usuarios: number
  }
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [tenants, setTenants] = useState<TenantItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Password reset modal
  const [userForPassword, setUserForPassword] = useState<PlatformUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const url = `/api/super-admin/users?tenantId=${selectedTenantId}&search=${encodeURIComponent(searchTerm)}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        if (data.tenants) setTenants(data.tenants)
      }
    } catch (e) {
      console.error('Error fetching users:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [selectedTenantId])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleToggleActive = async (user: PlatformUser) => {
    const updatedStatus = !user.activo
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          activo: updatedStatus
        })
      })

      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, activo: updatedStatus } : u))
      } else {
        alert('No se pudo actualizar el estado del usuario')
      }
    } catch (e) {
      alert('Error de conexión')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userForPassword || !newPassword.trim()) return

    setSavingPassword(true)
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userForPassword.id,
          newPassword: newPassword.trim()
        })
      })

      if (res.ok) {
        alert(`Contraseña actualizada con éxito para ${userForPassword.nombre}`)
        setUserForPassword(null)
        setNewPassword('')
      } else {
        alert('Error al restablecer la contraseña')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in text-zinc-200">
      {/* ── HEADER ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-1.5">
              <Shield size={16} /> Auditoría & Cuentas • Nivel OmniSync
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Usuarios de Plataforma
              <span className="text-xs px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                {users.length} Operadores
              </span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Gestión centralizada de personal y operadores. Utiliza el selector de inquilino para ver exclusivamente el equipo de cada unidad de negocio sin mezclar usuarios.
            </p>
          </div>

          <button
            onClick={fetchUsers}
            className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer self-start md:self-auto"
            title="Recargar usuarios"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS (INQUILINO & BÚSQUEDA) ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
        {/* Selector Primario de Inquilino */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <Building2 size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <label className="text-[9px] font-mono font-bold uppercase text-zinc-400 block mb-0.5">
              Filtrar por Unidad de Negocio / Inquilino:
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">🏢 Todos los Inquilinos (Vista Global Consolidada)</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  • {t.nombre} ({t._count.usuarios} miembros)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador de Texto */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, alias o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* ── TABLA DE USUARIOS ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
            <RefreshCw size={28} className="animate-spin text-amber-500" />
            <p className="text-xs font-mono uppercase tracking-widest">Cargando operadores...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-2">
            <Users size={32} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-white">No se encontraron usuarios.</p>
            <p className="text-xs text-zinc-500">Prueba ajustando el filtro de inquilino o la búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-mono uppercase text-[10px]">
                  <th className="py-3 px-3">Usuario & Alias</th>
                  <th className="py-3 px-3">Inquilino / Unidad</th>
                  <th className="py-3 px-3">Rol & Nivel</th>
                  <th className="py-3 px-3">Zona</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const isGerente = u.nivel === 1
                  const isSupervisor = u.nivel === 2
                  const isVendedor = u.nivel === 3

                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      {/* Usuario */}
                      <td className="py-3.5 px-3">
                        <div>
                          <span className="font-bold text-white block text-sm leading-tight">
                            {u.nombre}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                            <span className="text-amber-400 font-bold">{u.alias}</span>
                            <span>·</span>
                            <span className="truncate">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Inquilino */}
                      <td className="py-3.5 px-3">
                        {u.tenant ? (
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: u.tenant.colorPrimario || '#6366f1' }}
                            />
                            <div>
                              <span className="font-semibold text-zinc-200 block truncate max-w-[160px]">
                                {u.tenant.nombre}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                /{u.tenant.slug}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-500 italic">
                            Sin asignar (Global)
                          </span>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          isGerente ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          isSupervisor ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {u.rol} (N{u.nivel})
                        </span>
                      </td>

                      {/* Zona */}
                      <td className="py-3.5 px-3 font-mono text-zinc-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{u.zona || 'Todas'}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition cursor-pointer ${
                            u.activo
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          {u.activo ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={11} />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setUserForPassword(u)
                            setNewPassword(`${u.tenant?.slug || 'omni'}123`)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500 hover:text-black border border-white/10 text-zinc-300 text-[11px] font-bold transition cursor-pointer"
                          title="Restablecer contraseña"
                        >
                          <KeyRound size={12} />
                          <span>Reset Clave</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL BLANQUEAR CONTRASEÑA ── */}
      {userForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1017] border border-amber-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Lock size={16} />
                <span>Restablecer Contraseña</span>
              </div>
              <button
                onClick={() => setUserForPassword(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs text-zinc-400">
                Vas a asignar una nueva contraseña para el operador:
              </p>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 mt-2">
                <span className="font-bold text-white block text-sm">{userForPassword.nombre}</span>
                <span className="text-[11px] font-mono text-amber-400">{userForPassword.email}</span>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-zinc-400 block mb-1">
                  Nueva Contraseña Temporal:
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUserForPassword(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {savingPassword ? 'Guardando...' : 'Asignar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
