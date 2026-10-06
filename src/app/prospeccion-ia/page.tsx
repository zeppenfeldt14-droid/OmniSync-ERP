'use client'

import React, { useState, useEffect } from 'react'
import { 
  Sparkles, 
  Search, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  Phone, 
  Mail, 
  MessageCircle, 
  Building2, 
  Share2, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Plus, 
  Sliders, 
  Zap, 
  FileText,
  Clock,
  Send,
  AlertCircle
} from 'lucide-react'
import { useTenant } from '@/lib/tenantContext'

export const dynamic = 'force-dynamic'

interface LeadItem {
  id: number
  empresa: string
  contacto: string | null
  cargo: string | null
  telefono: string | null
  whatsapp: string | null
  whatsappValidado: boolean
  email: string | null
  emailValidado: boolean
  sitioWeb: string | null
  direccion: string | null
  zona: string | null
  rubro: string | null
  nicho: string | null
  canalInteres: string | null
  scoreMadurez: number
  estado: string
  diagnosticoIA: string | null
  notas: string | null
  trasplantadoA: string | null
  convertidoEmpresaId: number | null
  creadoEn: string
}

export default function ProspeccionIAPage() {
  const { activeTenant } = useTenant()
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [prospectando, setProspectando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('ALL')
  const [busqueda, setBusqueda] = useState('')

  // Parámetros del Agente Gemini
  const [zonaGeografica, setZonaGeografica] = useState('CABA y Gran Buenos Aires')
  const [palabrasClave, setPalabrasClave] = useState('')
  const [modalTransplante, setModalTransplante] = useState<LeadItem | null>(null)
  const [transplantando, setTransplantando] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const slug = activeTenant?.slug || 'ventas-vs'
      const res = await fetch(`/api/leads?tenantSlug=${slug}&estado=${filtroEstado}&search=${encodeURIComponent(busqueda)}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
        setCounts(data.counts || {})
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [activeTenant, filtroEstado])

  const ejecutarExploracionIA = async () => {
    setProspectando(true)
    setFeedbackMsg(null)
    try {
      const res = await fetch('/api/ai/prospectar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: activeTenant?.slug || 'ventas-vs',
          zonaGeografica,
          palabrasClaveExtra: palabrasClave.split(',').map(s => s.trim()).filter(Boolean),
          limite: 6,
          guardarDirecto: true
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setFeedbackMsg({
          tipo: 'success',
          texto: `¡Exploración exitosa! ${data.totalGuardados} nuevos leads calificados por Guardrails incorporados a la Granja.`
        })
        fetchLeads()
      } else {
        setFeedbackMsg({
          tipo: 'error',
          texto: data.error || 'Error al ejecutar la prospección'
        })
      }
    } catch (e) {
      setFeedbackMsg({ tipo: 'error', texto: 'Error de conexión con el agente IA' })
    } finally {
      setProspectando(false)
    }
  }

  const handleConvertirEnEmpresa = async (leadId: number) => {
    if (!confirm('¿Convertir este prospecto en una Empresa cliente activa dentro del ERP para tomar pedidos y facturar?')) return
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, accion: 'CONVERTIR_EN_EMPRESA' })
      })
      const data = await res.json()
      if (res.ok) {
        setFeedbackMsg({ tipo: 'success', texto: '¡Prospecto convertido exitosamente en Cliente del ERP!' })
        fetchLeads()
      }
    } catch (e) {
      alert('Error al convertir')
    }
  }

  const handleTrasplantarEomnisync = async () => {
    if (!modalTransplante) return
    setTransplantando(true)
    try {
      const res = await fetch('/api/bridge/transplant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: modalTransplante.id,
          targetStoreId: `${activeTenant?.slug || 'omnisync'}-store`
        })
      })
      const data = await res.json()
      if (res.ok) {
        setFeedbackMsg({
          tipo: 'success',
          texto: `¡Lead maduro trasplantado exitosamente hacia E-OmniSync (${data.payload?.metadata?.targetStoreId})!`
        })
        setModalTransplante(null)
        fetchLeads()
      }
    } catch (e) {
      alert('Error en el bridge de trasplante')
    } finally {
      setTransplantando(false)
    }
  }

  const armarLinkWhatsApp = (lead: LeadItem) => {
    if (!lead.whatsapp) return '#'
    const num = lead.whatsapp.replace(/[^\d]/g, '')
    let mensaje = ''
    if (activeTenant?.slug === 'azuchel') {
      mensaje = `Hola ${lead.contacto || lead.empresa}, te contactamos de Azuchel. Diseñamos regalos corporativos, kits de onboarding y material POP exclusivo para empresas. ¿Te comparto nuestro catálogo B2B en PDF?`
    } else if (activeTenant?.slug === 'golocinas') {
      mensaje = `Hola ${lead.empresa}! Te escribe el preventista de Golocinas en tu zona. Tenemos lista de precios mayorista por bulto en galletitas, chocolates y snacks con reparto en 24hs.`
    } else {
      mensaje = `Hola ${lead.contacto || lead.empresa}, te escribe el equipo de Ventas.VS. Vimos la presencia de tu negocio y preparamos una auditoría gratuita para optimizar tu captación web y WhatsApp.`
    }
    return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
  }

  return (
    <div className="space-y-8 animate-fade-in text-zinc-200 pb-16">
      {/* ── BANNER CABECERA DE LA GRANJA ── */}
      <div className="bg-gradient-to-r from-[#0d1017] via-[#151a28] to-[#0d1017] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-amber-400">
                Granja Cognitiva de Prospección IA • Google Gemini 1.5
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Sparkles className="text-amber-400" size={32} />
              <span>Incubadora & Prospección Digital</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
              Siembra y exploración autónoma de clientes potenciales mediante agentes de IA. Los leads son verificados con <strong>Guardrails (Anti-Alucinación & E.164)</strong>, nutridos en campañas y pueden ser <strong>cerrados in-house en el ERP</strong> o <strong>trasplantados a E-OmniSync</strong>.
            </p>
          </div>

          {/* Badge del Inquilino y Nicho */}
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <span className="text-zinc-400 block text-[10px] uppercase tracking-wider font-mono">Inquilino Activo</span>
              <span className="font-bold text-white text-sm">{activeTenant?.nombre || 'OmniSync'}</span>
            </div>
            <div className="text-[10px] font-mono text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              {activeTenant?.nicho || 'Nicho: B2B Corporativo & Ventas'}
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERTA */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          feedbackMsg.tipo === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-950/40 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.tipo === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.texto}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── PANEL DE LANZAMIENTO DEL AGENTE GEMINI ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Lanzador de Exploración & Scraping Autónomo
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400">
            Adaptado automáticamente al ICP del inquilino
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Zona / Cobertura Geográfica
            </label>
            <input
              type="text"
              value={zonaGeografica}
              onChange={(e) => setZonaGeografica(e.target.value)}
              placeholder="Ej. CABA Norte, Ramos Mejía, Lomas..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Palabras Clave / Segmento
            </label>
            <input
              type="text"
              value={palabrasClave}
              onChange={(e) => setPalabrasClave(e.target.value)}
              placeholder="Ej. maxikiosco, rrhh, inmobiliaria..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={ejecutarExploracionIA}
              disabled={prospectando}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {prospectando ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Explorando con Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Sembrar Oportunidades (IA)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── EMBUDO & FILTROS DE ESTADO ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'Todos', count: counts.TOTAL || 0 },
            { id: 'VALIDADO', label: 'Validados', count: counts.VALIDADO || 0 },
            { id: 'MADURO', label: 'Maduros (Score > 80)', count: counts.MADURO || 0 },
            { id: 'CONVERTIDO_CLIENTE', label: 'En ERP (Cliente)', count: counts.CONVERTIDO_CLIENTE || 0 },
            { id: 'TRASPLANTADO', label: 'Trasplantados', count: counts.TRASPLANTADO || 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                filtroEstado === tab.id
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#0e1017] border border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filtroEstado === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
            placeholder="Buscar por empresa o contacto..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0e1017] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* ── LISTADO DE LEADS PROSPECTADOS ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
          <RefreshCw size={28} className="animate-spin text-amber-500" />
          <p className="text-xs font-mono uppercase tracking-widest">Consultando banco de oportunidades...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 bg-[#0e1017] border border-white/10 rounded-3xl p-8 space-y-3">
          <Sparkles size={36} className="text-zinc-600 mx-auto" />
          <h4 className="text-base font-bold text-white">No hay prospectos en esta categoría</h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Lanza una búsqueda con el botón <strong>"Sembrar Oportunidades (IA)"</strong> para que Gemini explore la zona y capture leads automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {leads.map((lead) => {
            const isMaduro = lead.scoreMadurez >= 80
            const scoreColor = isMaduro ? '#10b981' : lead.scoreMadurez >= 50 ? '#f59e0b' : '#3b82f6'

            return (
              <div
                key={lead.id}
                className="bg-[#0e1017] border border-white/10 hover:border-amber-500/30 rounded-3xl p-5 shadow-xl transition flex flex-col justify-between group space-y-4"
              >
                {/* Cabecera Tarjeta */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 uppercase">
                      {lead.canalInteres || 'B2B'} • {lead.zona || 'Sin Zona'}
                    </span>
                    <div 
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1"
                      style={{ backgroundColor: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40` }}
                    >
                      <span>Score: {lead.scoreMadurez}/100</span>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-white group-hover:text-amber-400 transition leading-snug">
                    {lead.empresa}
                  </h3>
                  {lead.contacto && (
                    <p className="text-xs text-zinc-300 font-semibold mt-0.5">
                      {lead.contacto} <span className="text-zinc-500 font-normal">({lead.cargo || 'Responsable'})</span>
                    </p>
                  )}
                  {lead.rubro && (
                    <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                      {lead.rubro}
                    </p>
                  )}
                </div>

                {/* Datos de Contacto Verificados */}
                <div className="space-y-1.5 py-3 border-y border-white/5 text-xs text-zinc-300">
                  {lead.whatsapp && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <MessageCircle size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-mono text-[11px]">{lead.whatsapp}</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        E.164 OK
                      </span>
                    </div>
                  )}

                  {lead.email && (
                    <div className="flex items-center gap-2 truncate text-zinc-400">
                      <Mail size={14} className="text-indigo-400 shrink-0" />
                      <span className="truncate text-[11px]">{lead.email}</span>
                    </div>
                  )}

                  {lead.direccion && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin size={14} className="text-amber-400 shrink-0" />
                      <span className="truncate text-[11px]">{lead.direccion}</span>
                    </div>
                  )}
                </div>

                {/* Diagnóstico IA / Notas */}
                {lead.notas && (
                  <p className="text-[11px] text-zinc-400 italic bg-white/[0.02] p-2.5 rounded-xl border border-white/5 line-clamp-2">
                    "{lead.notas}"
                  </p>
                )}

                {/* Acciones del Ciclo de Ventas */}
                <div className="space-y-2 pt-2">
                  {/* Botón WhatsApp */}
                  {lead.whatsapp && (
                    <a
                      href={armarLinkWhatsApp(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition"
                    >
                      <MessageCircle size={14} />
                      <span>Contactar por WhatsApp</span>
                    </a>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {/* Botón 1: Cerrar en ERP In-House */}
                    <button
                      onClick={() => handleConvertirEnEmpresa(lead.id)}
                      disabled={lead.estado === 'CONVERTIDO_CLIENTE'}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-bold transition disabled:opacity-40 cursor-pointer"
                      title="Crear ficha en ERP para tomar pedidos y facturar"
                    >
                      <Building2 size={12} className="text-amber-400" />
                      <span>{lead.estado === 'CONVERTIDO_CLIENTE' ? 'En ERP' : 'Cerrar en ERP'}</span>
                    </button>

                    {/* Botón 2: Trasplantar a E-OmniSync */}
                    <button
                      onClick={() => setModalTransplante(lead)}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold transition cursor-pointer"
                      title="Sincronizar hacia tienda E-OmniSync"
                    >
                      <Share2 size={12} />
                      <span>Trasplantar</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL DE TRASPLANTE A E-OMNISYNC ── */}
      {modalTransplante && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0c0e17] border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Share2 size={18} />
                <span>Trasplante de Oportunidad a E-OmniSync</span>
              </div>
              <button onClick={() => setModalTransplante(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-zinc-300">
                Vas a trasplantar a <strong>{modalTransplante.empresa}</strong> como cuenta de cliente activa hacia la plataforma de tiendas <strong>E-OmniSync</strong>.
              </p>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1 font-mono text-[11px] text-zinc-400">
                <div><strong>Contacto:</strong> {modalTransplante.contacto || 'N/A'}</div>
                <div><strong>WhatsApp:</strong> {modalTransplante.whatsapp || 'N/A'}</div>
                <div><strong>Score de Madurez:</strong> {modalTransplante.scoreMadurez}/100</div>
                <div><strong>Destino:</strong> E-OmniSync Store Bridge API</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setModalTransplante(null)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleTrasplantarEomnisync}
                disabled={transplantando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
              >
                {transplantando ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Confirmar Trasplante</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
