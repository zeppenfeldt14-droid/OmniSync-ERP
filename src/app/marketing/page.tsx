'use client'

import React, { useState, useEffect } from 'react'
import { 
  Megaphone, 
  Sparkles, 
  Send, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Play, 
  Pause, 
  AlertCircle, 
  Users, 
  TrendingUp, 
  Target, 
  Bot, 
  Sliders, 
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useTenant } from '@/lib/tenantContext'

export const dynamic = 'force-dynamic'

interface CampanaItem {
  id: number
  nombre: string
  tipoCanal: string
  nichoObjetivo: string | null
  mensajeTemplate: string
  estado: string
  totalProspectos: number
  totalEnviados: number
  totalEntregados: number
  totalRespondidos: number
  totalConvertidos: number
  creadoPor: string | null
  creadoEn: string
}

export default function MarketingPage() {
  const { activeTenant } = useTenant()
  const [campanas, setCampanas] = useState<CampanaItem[]>([])
  const [metricas, setMetricas] = useState<any>({ totalCampanas: 0, campanasActivas: 0, totalProspectos: 0, totalMaduros: 0 })
  const [promptConfig, setPromptConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Modal Nueva Campaña
  const [showModal, setShowModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [nombreCampana, setNombreCampana] = useState('')
  const [tipoCanal, setTipoCanal] = useState('WHATSAPP')
  const [nichoObjetivo, setNichoObjetivo] = useState('')
  const [mensajeTemplate, setMensajeTemplate] = useState('')
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  const fetchCampanas = async () => {
    setLoading(true)
    try {
      const slug = activeTenant?.slug || 'ventas-vs'
      const res = await fetch(`/api/marketing/campanas?tenantSlug=${slug}`)
      if (res.ok) {
        const data = await res.json()
        setCampanas(data.campanas || [])
        setMetricas(data.metricas || {})
        setPromptConfig(data.promptConfig || null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampanas()
  }, [activeTenant])

  // Template sugerido según tenant
  useEffect(() => {
    if (activeTenant?.slug === 'azuchel') {
      setNichoObjetivo('Empresas Medianas / RRHH')
      setMensajeTemplate('Hola {contacto}, te contactamos de Azuchel. Diseñamos regalos corporativos exclusivos, kits de bienvenida y material POP para colaboradores. ¿Te comparto nuestro catálogo B2B en PDF?')
    } else if (activeTenant?.slug === 'golocinas') {
      setNichoObjetivo('Kioscos y Almacenes')
      setMensajeTemplate('¡Hola {empresa}! Te escribe el preventista de Golocinas en tu zona. Tenemos lista de precios mayorista por bulto cerrado en chocolates, golosinas y galletitas con entrega en 24hs.')
    } else {
      setNichoObjetivo('Pymes y Negocios B2B')
      setMensajeTemplate('Hola {contacto}, te escribe el equipo de Ventas.VS. Vimos la presencia online de {empresa} y preparamos una propuesta para optimizar tus canales de captación digital y WhatsApp.')
    }
  }, [activeTenant])

  const handleCrearCampana = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreCampana.trim() || !mensajeTemplate.trim()) {
      alert('Por favor complete todos los campos')
      return
    }

    setGuardando(true)
    try {
      const res = await fetch('/api/marketing/campanas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreCampana.trim(),
          tipoCanal,
          nichoObjetivo,
          mensajeTemplate,
          tenantSlug: activeTenant?.slug
        })
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({ tipo: 'success', texto: data.message || 'Campaña creada con éxito' })
        setShowModal(false)
        setNombreCampana('')
        fetchCampanas()
      } else {
        setFeedback({ tipo: 'error', texto: data.error || 'Error al crear la campaña' })
      }
    } catch (e) {
      setFeedback({ tipo: 'error', texto: 'Error de conexión con el servidor' })
    } finally {
      setGuardando(false)
    }
  }

  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    try {
      const res = await fetch('/api/marketing/campanas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: nuevoEstado })
      })
      if (res.ok) {
        fetchCampanas()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in text-zinc-200 pb-16 max-w-7xl mx-auto">
      {/* ── BANNER CABECERA DE MARKETING ── */}
      <div className="bg-gradient-to-r from-[#0d1017] via-[#1a1728] to-[#0d1017] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-amber-400">
                Centro de Crecimiento & Difusión Multicanal
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Megaphone className="text-amber-400" size={32} />
              <span>Módulo de Marketing & Campañas</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
              Diseña, dispara y monitorea campañas masivas de <strong>WhatsApp</strong>, <strong>Email</strong> y <strong>Prospección Terreno</strong> dirigidas a los leads capturados y calificados en la Granja de IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/prospeccion-ia"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider transition shadow-sm"
            >
              <Sparkles size={16} />
              <span>Ir a Granja Leads IA</span>
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>Nueva Campaña</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK MSG */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          feedback.tipo === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-950/40 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.texto}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── METRICAS KPIS DE MARKETING ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase text-[10px]">Campañas Totales</span>
            <Megaphone size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {metricas.totalCampanas || 0}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">{metricas.campanasActivas || 0} activas en curso</span>
        </div>

        <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase text-[10px]">Audiencia en Granja</span>
            <Users size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {metricas.totalProspectos || 0}
          </div>
          <span className="text-[10px] text-indigo-400/80 mt-1">Prospectos calificados disponibles</span>
        </div>

        <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase text-[10px]">Leads Maduros (&gt;80)</span>
            <Target size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {metricas.totalMaduros || 0}
          </div>
          <span className="text-[10px] text-emerald-500/80 mt-1">Listos para trasplante o cierre</span>
        </div>

        <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase text-[10px]">Canales de Salida</span>
            <Send size={16} className="text-purple-400" />
          </div>
          <div className="text-sm font-bold text-white mt-2 flex flex-wrap gap-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">WhatsApp</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">Email PDF</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">Calle</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Formato internacional E.164</span>
        </div>
      </div>

      {/* ── CARD INFORMATIVA DEL AGENTE IA ASOCIADO ── */}
      {promptConfig && (
        <div className="bg-[#0b0d14] border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bot size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Agente IA Asignado: {promptConfig.nombreAgente}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">Activo</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                <strong>Tono:</strong> {promptConfig.tono} • <strong>Directiva:</strong> {promptConfig.directivaSistema}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/prospeccion-ia"
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <span>Explorar Leads</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ── LISTADO DE CAMPAÑAS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Megaphone size={18} className="text-amber-400" />
            <span>Campañas de Marketing Registradas</span>
          </h3>
          <button 
            onClick={fetchCampanas}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={24} className="animate-spin text-amber-500" />
            <span className="text-xs font-mono">Cargando campañas...</span>
          </div>
        ) : campanas.length === 0 ? (
          <div className="py-16 text-center bg-[#0e1017] border border-white/10 rounded-3xl p-8 space-y-3">
            <Megaphone size={36} className="text-zinc-600 mx-auto" />
            <h4 className="text-base font-bold text-white">No hay campañas de marketing creadas</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Comienza creando tu primera campaña para contactar por <strong>WhatsApp masivo</strong> o <strong>Email</strong> a la base de prospectos de {activeTenant?.nombre || 'tu negocio'}.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition"
            >
              <Plus size={15} />
              <span>Crear Campaña Ahora</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campanas.map((c) => (
              <div
                key={c.id}
                className="bg-[#0e1017] border border-white/10 hover:border-amber-500/30 rounded-3xl p-5 shadow-xl transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-zinc-300">
                      {c.tipoCanal}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      c.estado === 'EN_EJECUCION' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : c.estado === 'FINALIZADA'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {c.estado}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white leading-snug">
                    {c.nombre}
                  </h3>
                  <p className="text-xs text-amber-400/90 font-medium mt-1">
                    Nicho: {c.nichoObjetivo || 'General'}
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-300 italic line-clamp-3">
                    "{c.mensajeTemplate}"
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span>Prospectos objetivo:</span>
                    <span className="font-bold text-white">{c.totalProspectos}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {c.estado === 'PROGRAMADA' || c.estado === 'PAUSADA' ? (
                      <button
                        onClick={() => handleCambiarEstado(c.id, 'EN_EJECUCION')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        <Play size={13} />
                        <span>Lanzar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCambiarEstado(c.id, 'PAUSADA')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        <Pause size={13} />
                        <span>Pausar</span>
                      </button>
                    )}

                    <Link
                      href="/prospeccion-ia"
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition"
                    >
                      <MessageCircle size={13} className="text-emerald-400" />
                      <span>Ver Leads</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL DE CREACIÓN DE CAMPAÑA ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleCrearCampana} className="bg-[#0c0e17] border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Megaphone size={20} />
                <span>Crear Campaña de Marketing</span>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Nombre de la Campaña
                </label>
                <input
                  type="text"
                  value={nombreCampana}
                  onChange={(e) => setNombreCampana(e.target.value)}
                  placeholder="Ej. Campaña Navidad B2B / Catálogo 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Canal Principal
                  </label>
                  <select
                    value={tipoCanal}
                    onChange={(e) => setTipoCanal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="WHATSAPP">WhatsApp Masivo (E.164)</option>
                    <option value="EMAIL">Email Marketing / PDF</option>
                    <option value="TERRENO">Ruta Preventista (Calle)</option>
                    <option value="MULTICANAL">Multicanal 360°</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Nicho Objetivo
                  </label>
                  <input
                    type="text"
                    value={nichoObjetivo}
                    onChange={(e) => setNichoObjetivo(e.target.value)}
                    placeholder="Ej. RRHH, Kioscos, Pymes..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Plantilla de Mensaje / Copy
                  </label>
                  <span className="text-[10px] text-zinc-500">Variables: {'{empresa}'}, {'{contacto}'}</span>
                </div>
                <textarea
                  rows={4}
                  value={mensajeTemplate}
                  onChange={(e) => setMensajeTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
              >
                {guardando ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Guardar Campaña</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
