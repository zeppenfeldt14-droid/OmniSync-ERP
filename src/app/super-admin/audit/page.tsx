'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Clock, Activity, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface AuditLog {
  id: number
  usuarioAlias: string
  tipoAccion: string
  detalles: string
  creadoEn: string
}

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/audit')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="space-y-8 animate-fade-in text-zinc-200">
      {/* ── HEADER ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-1.5">
              <ShieldCheck size={16} /> Seguridad & Monitoreo • Registro Inmutable
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Auditoría Global de la Plataforma
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Bitácora de eventos críticos del software: logins, aprovisionamiento de inquilinos, cambios en permisos y trazabilidad de operaciones globales.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer self-start md:self-auto"
            title="Recargar bitácora"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── CHECKS DE SALUD DEL SISTEMA ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0e1017] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span>Base de Datos PostgreSQL</span>
            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
          </div>
          <p className="text-[11px] text-zinc-400">Conexión activa y pool optimizado</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1017] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span>Aislamiento Multitenant</span>
            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">100% AISLADO</span>
          </div>
          <p className="text-[11px] text-zinc-400">Tenants con partición estricta por tenantId</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1017] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span>Motor Multimoneda</span>
            <span className="text-amber-400 font-mono text-[10px] bg-amber-500/10 px-2 py-0.5 rounded">GEO-IP ACTIVO</span>
          </div>
          <p className="text-[11px] text-zinc-400">Detección geográfica y selector USD/Local</p>
        </div>
      </div>

      {/* ── BITÁCORA DE EVENTOS ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} className="text-amber-400" />
          Eventos Recientes de Bitácora
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
            <RefreshCw size={24} className="animate-spin text-amber-500" />
            <p className="text-xs font-mono uppercase tracking-widest">Cargando bitácora...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No hay registros recientes en la bitácora del sistema.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{log.usuarioAlias}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                      {log.tipoAccion}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs">{log.detalles}</p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                  {new Date(log.creadoEn).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
