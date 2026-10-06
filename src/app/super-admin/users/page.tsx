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
  Lock, 
  Check, 
  X,
  MapPin,
  UserPlus,
  Crown,
  Sparkles,
  Layers,
  ArrowRight
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
  
  // Segmented Tab Filter: 'superadmin' | 'all' | tenantId string
  const [selectedTab, setSelectedTab] = useState<string>('superadmin')
  const [searchTerm, setSearchTerm] = useState('')

  // Password reset modal
  const [userForPassword, setUserForPassword] = useState<PlatformUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Create User modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    nombre: '',
    alias: '',
    email: '',
    password: '',
    rol: 'SUPER_ADMIN',
    nivel: 1,
    tenantId: 'null', // 'null' for Super Admin
    zona: 'Todas'
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const url = `/api/super-admin/users?tenantId=${selectedTab}&search=${encodeURIComponent(searchTerm)}`
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
  }, [selectedTab])

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUserForm,
          tenantId: newUserForm.tenantId === 'null' ? null : Number(newUserForm.tenantId)
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        alert(`Usuario @${data.user.alias} creado exitosamente.`)
        setShowCreateModal(false)
        setNewUserForm({
          nombre: '',
          alias: '',
          email: '',
          password: '',
          rol: 'SUPER_ADMIN',
          nivel: 1,
          tenantId: 'null',
          zona: 'Todas'
        })
        fetchUsers()
      } else {
        alert(data.error || 'Error al crear usuario')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setCreatingUser(false)
    }
  }

  const isSuperAdminTab = selectedTab === 'superadmin'
  const activeTenantObj = tenants.find(t => t.id.toString() === selectedTab)

  return (
    <div className="space-y-8 animate-fade-in text-zinc-200 pb-16">
      {/* ── HEADER ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-1.5">
              <Shield size={16} /> Gobernanza & Seguridad • Estricto Aislamiento Multi-Tenant
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              {isSuperAdminTab ? '👑 Super Administradores Globales' : activeTenantObj ? `Equipo de ${activeTenantObj.nombre}` : 'Directorio de Operadores'}
              <span className="text-xs px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                {users.length} Cuentas
              </span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {isSuperAdminTab 
                ? 'Cuentas de gobierno global con acceso irrestricto al Centro de Mando SaaS (tenantId: null). No pertenecen a ninguna unidad de negocio en particular.'
                : `Operadores asignados con aislamiento exclusivo a la unidad de negocio seleccionada. Los datos y accesos no se mezclan con otras unidades.`
              }
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={fetchUsers}
              className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer"
              title="Recargar usuarios"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => {
                setNewUserForm({
                  nombre: '',
                  alias: '',
                  email: '',
                  password: '',
                  rol: isSuperAdminTab ? 'SUPER_ADMIN' : 'VENDEDOR',
                  nivel: isSuperAdminTab ? 1 : 3,
                  tenantId: isSuperAdminTab ? 'null' : selectedTab,
                  zona: 'Todas'
                })
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>{isSuperAdminTab ? '+ Nuevo Super Admin' : '+ Nuevo Operador'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SELECTOR DE JERARQUÍA MULTI-TENANT (SEGMENTED TABS) ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Super Admins */}
          <button
            onClick={() => setSelectedTab('superadmin')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              isSuperAdminTab 
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25' 
                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Crown size={15} className={isSuperAdminTab ? 'text-black' : 'text-amber-400'} />
            <span>Super Admins (Global)</span>
          </button>

          {/* Individual Tenant Tabs */}
          {tenants.map(t => {
            const isSelected = selectedTab === t.id.toString()
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTab(t.id.toString())}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black font-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: t.colorPrimario || '#6366f1' }} 
                />
                <span>{t.nombre.split(' - ')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-black/15 text-black' : 'bg-white/10 text-zinc-300'
                }`}>
                  {t._count.usuarios}
                </span>
              </button>
            )
          })}

          {/* All Tenants Tab */}
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedTab === 'all'
                ? 'bg-indigo-600 text-white font-black'
                : 'bg-white/5 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Layers size={14} />
            <span>Vista Consolidada (Auditoría)</span>
          </button>
        </div>

        {/* Buscador de Texto */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 min-w-[220px]">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por alias o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <Search size={13} className="absolute left-2.5 top-2 text-zinc-500" />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-black border border-amber-500/30 text-amber-300 text-xs font-bold transition cursor-pointer"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* ── TABLA DE USUARIOS AISLADOS ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
            <RefreshCw size={28} className="animate-spin text-amber-500" />
            <p className="text-xs font-mono uppercase tracking-widest">Consultando directorio seguro...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-2">
            <Users size={32} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-white">No hay usuarios registrados en esta categoría.</p>
            <p className="text-xs text-zinc-500">
              {isSuperAdminTab 
                ? 'Puedes crear un nuevo Super Administrador con el botón superior.' 
                : 'Esta unidad de negocio aún no tiene operadores asignados.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-mono uppercase text-[10px]">
                  <th className="py-3 px-3">Operador / Super Admin</th>
                  <th className="py-3 px-3">Jerarquía & Alcance</th>
                  <th className="py-3 px-3">Rol & Nivel</th>
                  <th className="py-3 px-3">Zona Asignada</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const isGlobalAdmin = !u.tenantId || u.rol === 'SUPER_ADMIN'
                  const isGerente = u.nivel === 1
                  const isSupervisor = u.nivel === 2

                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      {/* Usuario */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs uppercase ${
                            isGlobalAdmin 
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' 
                              : 'bg-white/10 text-zinc-200'
                          }`}>
                            {u.alias ? u.alias.substring(0, 2) : 'OP'}
                          </div>
                          <div>
                            <span className="font-bold text-white block text-sm leading-tight flex items-center gap-1.5">
                              {u.nombre}
                              {isGlobalAdmin && <Crown size={12} className="text-amber-400" />}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                              <span className="text-amber-400 font-bold">@{u.alias}</span>
                              <span>·</span>
                              <span className="truncate">{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Alcance / Inquilino */}
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
                          <span className="text-[10px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            👑 Global (Centro de Mando)
                          </span>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          isGlobalAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
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
                            setNewPassword(`${u.tenant?.slug || 'omnisync'}123`)
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

      {/* ── MODAL CREAR USUARIO / SUPER ADMIN ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e1017] border border-amber-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <UserPlus size={18} />
                <span>{newUserForm.tenantId === 'null' ? 'Crear Super Administrador Global' : 'Crear Operador de Inquilino'}</span>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={newUserForm.nombre}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Alias / Usuario</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. j.perez"
                    value={newUserForm.alias}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, alias: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Unidad / Inquilino</label>
                  <select
                    value={newUserForm.tenantId}
                    onChange={(e) => {
                      const val = e.target.value
                      setNewUserForm(prev => ({
                        ...prev,
                        tenantId: val,
                        rol: val === 'null' ? 'SUPER_ADMIN' : 'VENDEDOR',
                        nivel: val === 'null' ? 1 : 3
                      }))
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="null">👑 Super Admin Global (Sin Inquilino)</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>🏢 {t.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Rol / Nivel</label>
                  <select
                    value={newUserForm.rol}
                    onChange={(e) => {
                      const r = e.target.value
                      const n = r === 'SUPER_ADMIN' ? 1 : r === 'SUPERVISOR' ? 2 : r === 'ANALISTA' ? 4 : 3
                      setNewUserForm(prev => ({ ...prev, rol: r, nivel: n }))
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="SUPER_ADMIN">Gerente / Super Admin (Nivel 1)</option>
                    <option value="SUPERVISOR">Supervisor (Nivel 2)</option>
                    <option value="VENDEDOR">Vendedor / Preventista (Nivel 3)</option>
                    <option value="ANALISTA">Analista (Nivel 4)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {creatingUser ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Crear Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                Vas a asignar una nueva contraseña para:
              </p>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 mt-2">
                <span className="font-bold text-white block text-sm">{userForPassword.nombre}</span>
                <span className="text-[11px] font-mono text-amber-400">@{userForPassword.alias} · {userForPassword.email}</span>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-zinc-400 block mb-1">
                  Nueva Contraseña:
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
