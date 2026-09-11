'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Laptop,
  Globe,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  ExternalLink,
  MessageCircle,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Users,
  Clock,
  Layers,
  FileText,
  X
} from 'lucide-react'
import { useTenant } from '@/lib/tenantContext'
import BulkPriceSheetSyncModal from '@/components/precios/BulkPriceSheetSyncModal'

interface Abono {
  id: number
  empresaId: number
  nombreServicio: string
  montoMensual: number
  moneda: string
  diaCobro: number
  estado: string
  frecuencia: string
  empresa?: {
    nombre: string
    telefono?: string
    email?: string
    responsable?: string
  }
}

interface Pyme {
  id: number
  nombre: string
  rubro: string | null
  responsable: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  barrio: string | null
  partido: string | null
  sitioWebActual: string | null
  instagram: string | null
  facebook: string | null
  diagnosticoWeb: string | null
  potencialCierre: string | null
  etapaEmbudo: string | null
  notas: string | null
  estado: string
  actualizadoEn: string
  abonosRecurrentes?: Abono[]
}

const ETAPAS_EMBUDO = [
  { id: 'prospeccion', label: '🎯 Prospección', color: '#64748b', desc: 'Identificados sin web o web obsoleta' },
  { id: 'contacto', label: '📞 Primer Contacto', color: '#3b82f6', desc: 'Pitch enviado por WhatsApp/Llamada' },
  { id: 'diagnostico', label: '🔍 Relevamiento', color: '#a855f7', desc: 'Alcance y requerimientos definidos' },
  { id: 'propuesta', label: '📄 Propuesta Enviada', color: '#f59e0b', desc: 'Presupuesto web en evaluación' },
  { id: 'negociacion', label: '🤝 Negociación', color: '#0ea5e9', desc: 'Ajuste de presupuesto y plazos' },
  { id: 'ganado', label: '⭐ Ganado / Activo', color: '#10b981', desc: 'Sitio entregado o en desarrollo' }
]

export default function PymeWebCrmClient() {
  const { activeTenant } = useTenant()
  const [pymes, setPymes] = useState<Pyme[]>([])
  const [abonos, setAbonos] = useState<Abono[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'kanban' | 'abonos' | 'catalogo'>('kanban')

  // Modals
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showNewPymeModal, setShowNewPymeModal] = useState(false)
  const [showNewAbonoModal, setShowNewAbonoModal] = useState(false)
  const [selectedPymeForAbono, setSelectedPymeForAbono] = useState<Pyme | null>(null)

  // New Pyme Form State
  const [newNombre, setNewNombre] = useState('')
  const [newRubro, setNewRubro] = useState('')
  const [newResponsable, setNewResponsable] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newSitioWeb, setNewSitioWeb] = useState('')
  const [newInstagram, setNewInstagram] = useState('')
  const [newDiagnostico, setNewDiagnostico] = useState('Sin sitio web activo')
  const [newPotencial, setNewPotencial] = useState('alto')
  const [newEtapa, setNewEtapa] = useState('prospeccion')
  const [newNotas, setNewNotas] = useState('')

  // New Abono Form State
  const [abonoServicio, setAbonoServicio] = useState('Hosting & Mantenimiento Web PyME')
  const [abonoMonto, setAbonoMonto] = useState('18500')
  const [abonoDia, setAbonoDia] = useState('10')

  const fetchData = async () => {
    setLoading(true)
    try {
      const url = activeTenant ? `/api/crm-web?tenantId=${activeTenant.id}` : '/api/crm-web'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPymes(data.pymes || [])
        setAbonos(data.abonos || [])
        setServicios(data.productosServicios || [])
      }
    } catch (e) {
      console.error('Error fetching CRM Web data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTenant])

  const handleMoveEtapa = async (pymeId: number, nuevaEtapa: string) => {
    try {
      const res = await fetch('/api/crm-web', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pymeId, etapaEmbudo: nuevaEtapa })
      })
      if (res.ok) {
        setPymes(prev => prev.map(p => (p.id === pymeId ? { ...p, etapaEmbudo: nuevaEtapa } : p)))
      }
    } catch (e) {
      console.error('Error moving stage:', e)
    }
  }

  const handleCreatePyme = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNombre.trim()) return

    try {
      const res = await fetch('/api/crm-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crear_pyme',
          nombre: newNombre,
          rubro: newRubro,
          responsable: newResponsable,
          telefono: newTelefono,
          email: newEmail,
          sitioWebActual: newSitioWeb,
          instagram: newInstagram,
          diagnosticoWeb: newDiagnostico,
          potencialCierre: newPotencial,
          etapaEmbudo: newEtapa,
          notas: newNotas,
          tenantId: activeTenant?.id || null
        })
      })

      if (res.ok) {
        setShowNewPymeModal(false)
        setNewNombre('')
        setNewRubro('')
        setNewResponsable('')
        setNewTelefono('')
        setNewEmail('')
        setNewSitioWeb('')
        setNewInstagram('')
        setNewNotas('')
        fetchData()
      }
    } catch (e) {
      console.error('Error creating PyME:', e)
    }
  }

  const handleCreateAbono = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPymeForAbono) return

    try {
      const res = await fetch('/api/crm-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crear_abono',
          empresaId: selectedPymeForAbono.id,
          tenantId: activeTenant?.id || null,
          nombreServicio: abonoServicio,
          montoMensual: abonoMonto,
          diaCobro: abonoDia
        })
      })

      if (res.ok) {
        setShowNewAbonoModal(false)
        setSelectedPymeForAbono(null)
        fetchData()
      }
    } catch (e) {
      console.error('Error creating abono:', e)
    }
  }

  const filteredPymes = useMemo(() => {
    if (!searchTerm.trim()) return pymes
    const q = searchTerm.toLowerCase()
    return pymes.filter(
      p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.rubro && p.rubro.toLowerCase().includes(q)) ||
        (p.responsable && p.responsable.toLowerCase().includes(q)) ||
        (p.diagnosticoWeb && p.diagnosticoWeb.toLowerCase().includes(q))
    )
  }, [pymes, searchTerm])

  const totalAbonosMensuales = useMemo(() => {
    return abonos.filter(a => a.estado === 'activo').reduce((acc, a) => acc + (a.montoMensual || 0), 0)
  }, [abonos])

  const generateWhatsAppLink = (pyme: Pyme) => {
    const phone = (pyme.telefono || '').replace(/[^0-9]/g, '')
    if (!phone) return '#'
    const text = encodeURIComponent(
      `¡Hola ${pyme.responsable || pyme.nombre}! 👋 Te contacto de ${activeTenant?.nombre || 'OmniSync Digital'}. Estuvimos analizando la presencia digital de ${pyme.nombre} y armamos una propuesta para renovar su página web y potenciar sus ventas. ¿Te gustaría que te comparta el presupuesto?`
    )
    return `https://wa.me/${phone}?text=${text}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 2rem' }}>
      {/* Top Banner & KPI Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem'
      }}>
        {/* Unit Info Card */}
        <div style={{
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Unidad Activa
            </span>
            <Laptop size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
            {activeTenant?.nombre || 'Páginas Web & PyMEs'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {activeTenant?.tipoModelo === 'SERVICIOS_DIGITALES' ? 'CRM de Servicios & Abonos' : 'Venta Híbrida'}
          </div>
        </div>

        {/* Total PyMEs Leads */}
        <div style={{
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Cartera PyMEs
            </span>
            <Users size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>
            {pymes.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Prospectos y clientes registrados
          </div>
        </div>

        {/* Proposals in Flight */}
        <div style={{
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Propuestas en Curso
            </span>
            <FileText size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>
            {pymes.filter(p => p.etapaEmbudo === 'propuesta' || p.etapaEmbudo === 'negociacion').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Cotizaciones enviadas / negociación
          </div>
        </div>

        {/* Recurrent Revenue (MRR) */}
        <div style={{
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(30,41,59,0.9))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
              Abonos Recurrentes (MRR)
            </span>
            <TrendingUp size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
            ${totalAbonosMensuales.toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {abonos.filter(a => a.estado === 'activo').length} abonos de hosting/mantenimiento activos
          </div>
        </div>
      </div>

      {/* Main Actions & Tabs Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem'
      }}>
        {/* Left: View Tabs */}
        <div style={{
          display: 'flex', gap: '4px', backgroundColor: '#1e293b',
          padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button
            onClick={() => setActiveTab('kanban')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              backgroundColor: activeTab === 'kanban' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: activeTab === 'kanban' ? '#60a5fa' : '#64748b'
            }}
          >
            📊 Embudo de Ventas (Kanban)
          </button>
          <button
            onClick={() => setActiveTab('abonos')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              backgroundColor: activeTab === 'abonos' ? 'rgba(16,185,129,0.2)' : 'transparent',
              color: activeTab === 'abonos' ? '#34d399' : '#64748b'
            }}
          >
            🔄 Abonos Recurrentes ({abonos.length})
          </button>
          <button
            onClick={() => setActiveTab('catalogo')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              backgroundColor: activeTab === 'catalogo' ? 'rgba(168,85,247,0.2)' : 'transparent',
              color: activeTab === 'catalogo' ? '#c084fc' : '#64748b'
            }}
          >
            💼 Catálogo de Servicios Web ({servicios.length})
          </button>
        </div>

        {/* Right: Search & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar PyME, rubro, contacto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px 8px 32px', borderRadius: '8px',
                backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc', fontSize: '0.8rem', width: '220px'
              }}
            />
          </div>

          <button
            onClick={() => setShowSyncModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px',
              backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Sincronizar Google Sheet</span>
          </button>

          <button
            onClick={() => setShowNewPymeModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: '#3b82f6', color: '#ffffff',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
            }}
          >
            <Plus size={16} />
            <span>+ Nueva PyME Prospecto</span>
          </button>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {activeTab === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(270px, 1fr))',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          minHeight: '600px'
        }}>
          {ETAPAS_EMBUDO.map(etapa => {
            const etapaPymes = filteredPymes.filter(p => (p.etapaEmbudo || 'prospeccion') === etapa.id)
            return (
              <div
                key={etapa.id}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '75vh',
                  overflow: 'hidden'
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(0,0,0,0.15)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      {etapa.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{etapa.desc}</div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800,
                    padding: '2px 8px', borderRadius: '12px',
                    backgroundColor: `${etapa.color}25`, color: etapa.color
                  }}>
                    {etapaPymes.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div style={{ padding: '10px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {etapaPymes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#475569', fontSize: '0.75rem' }}>
                      Sin prospectos en esta etapa
                    </div>
                  ) : (
                    etapaPymes.map(p => (
                      <div
                        key={p.id}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'transform 0.15s, border-color 0.15s'
                        }}
                      >
                        {/* Header: Name and Potential */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                              {p.nombre}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {p.rubro || 'Comercio'} {p.responsable ? `• ${p.responsable}` : ''}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.65rem', padding: '2px 6px', borderRadius: '6px', fontWeight: 700,
                            backgroundColor: p.potencialCierre === 'alto' ? 'rgba(239,68,68,0.2)' : p.potencialCierre === 'medio' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                            color: p.potencialCierre === 'alto' ? '#f87171' : p.potencialCierre === 'medio' ? '#fbbf24' : '#60a5fa'
                          }}>
                            {p.potencialCierre === 'alto' ? '🔥 Alto' : p.potencialCierre === 'medio' ? '⚡ Medio' : '❄️ Bajo'}
                          </span>
                        </div>

                        {/* Web Diagnosis Tag */}
                        <div style={{
                          padding: '6px 8px', borderRadius: '6px',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          fontSize: '0.7rem', color: '#38bdf8'
                        }}>
                          🌐 <strong>Diagnóstico:</strong> {p.diagnosticoWeb || 'Sin web'}
                        </div>

                        {/* Contact Quick Buttons */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                          {p.telefono && (
                            <a
                              href={generateWhatsAppLink(p)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                padding: '5px', borderRadius: '6px',
                                backgroundColor: 'rgba(37,211,102,0.15)', color: '#25d366',
                                textDecoration: 'none', fontSize: '0.7rem', fontWeight: 700
                              }}
                              title="Enviar propuesta por WhatsApp"
                            >
                              <MessageCircle size={13} /> WhatsApp
                            </a>
                          )}

                          {p.sitioWebActual && (
                            <a
                              href={p.sitioWebActual.startsWith('http') ? p.sitioWebActual : `https://${p.sitioWebActual}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '5px 8px', borderRadius: '6px',
                                backgroundColor: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                                textDecoration: 'none', fontSize: '0.7rem'
                              }}
                              title="Ver sitio actual"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}

                          <button
                            onClick={() => {
                              setSelectedPymeForAbono(p)
                              setShowNewAbonoModal(true)
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                              padding: '5px 8px', borderRadius: '6px', border: 'none',
                              backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399',
                              cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600
                            }}
                            title="Asignar Abono Recurrente de Hosting"
                          >
                            + Abono
                          </button>
                        </div>

                        {/* Pipeline Next Stage Stepper */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px', marginTop: '4px'
                        }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Mover etapa:</span>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {ETAPAS_EMBUDO.map(targetEtapa => {
                              if (targetEtapa.id === etapa.id) return null
                              return (
                                <button
                                  key={targetEtapa.id}
                                  onClick={() => handleMoveEtapa(p.id, targetEtapa.id)}
                                  style={{
                                    padding: '2px 5px', borderRadius: '4px', border: 'none',
                                    backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                                    fontSize: '0.65rem', cursor: 'pointer'
                                  }}
                                  title={`Mover a ${targetEtapa.label}`}
                                >
                                  {targetEtapa.label.split(' ')[0]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ABONOS RECURRENTES TAB */}
      {activeTab === 'abonos' && (
        <div style={{
          backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                Cartera de Abonos Recurrentes (Hosting & Mantenimiento Web)
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Cobranza mensual recurrente de servicios digitales a clientes PyME.
              </p>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
              Total Mensual: ${totalAbonosMensuales.toLocaleString('es-AR')}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}>
              <tr>
                <th style={{ padding: '10px 14px' }}>Cliente PyME</th>
                <th style={{ padding: '10px 14px' }}>Servicio Contratado</th>
                <th style={{ padding: '10px 14px' }}>Día de Cobro</th>
                <th style={{ padding: '10px 14px' }}>Monto Mensual</th>
                <th style={{ padding: '10px 14px' }}>Contacto</th>
                <th style={{ padding: '10px 14px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {abonos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No hay abonos recurrentes registrados aún.
                  </td>
                </tr>
              ) : (
                abonos.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>
                      {a.empresa?.nombre || 'PyME'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#38bdf8' }}>{a.nombreServicio}</td>
                    <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 600 }}>
                      Día {a.diaCobro} de cada mes
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#34d399' }}>
                      ${a.montoMensual.toLocaleString('es-AR')} {a.moneda}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                      {a.empresa?.telefono || a.empresa?.email || '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: a.estado === 'activo' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                        color: a.estado === 'activo' ? '#34d399' : '#f87171'
                      }}>
                        {a.estado === 'activo' ? '✓ Activo' : 'Pausado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CATALOG OF WEB SERVICES TAB */}
      {activeTab === 'catalogo' && (
        <div style={{
          backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                Catálogo de Planes y Servicios Digitales (Sincronizado vía Google Sheets)
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Precios base y servicios listos para cotizar a PyMEs y emprendedores.
              </p>
            </div>
            <button
              onClick={() => setShowSyncModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                backgroundColor: '#10b981', color: '#ffffff',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={14} /> Sincronizar desde Sheet
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}>
              <tr>
                <th style={{ padding: '10px 14px' }}>Código</th>
                <th style={{ padding: '10px 14px' }}>Servicio / Plan</th>
                <th style={{ padding: '10px 14px' }}>Categoría</th>
                <th style={{ padding: '10px 14px' }}>Modalidad</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Costo Base</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Precio Lista</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Comisión</th>
              </tr>
            </thead>
            <tbody>
              {servicios.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No hay servicios sincronizados aún. Utiliza el botón "Sincronizar desde Sheet" para cargarlos.
                  </td>
                </tr>
              ) : (
                servicios.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#38bdf8' }}>{s.codigoInterno}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f8fafc' }}>{s.nombre}</td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{s.linea || 'General'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: s.tipo === 'ABONO_MENSUAL' ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.2)',
                        color: s.tipo === 'ABONO_MENSUAL' ? '#c084fc' : '#60a5fa'
                      }}>
                        {s.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#94a3b8' }}>
                      ${(s.costoBase || 0).toLocaleString('es-AR')}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                      ${(s.precioUnitario || 0).toLocaleString('es-AR')} {s.moneda}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#f59e0b' }}>
                      {s.comisionPorcentaje > 0 ? `${s.comisionPorcentaje}%` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Nueva PyME Prospecto */}
      {showNewPymeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
            width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 700 }}>+ Nueva PyME / Prospecto Web</h3>
              <button onClick={() => setShowNewPymeModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePyme} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Nombre del Negocio / Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ferretería Central, Consultora Lopez & Asoc"
                  value={newNombre}
                  onChange={e => setNewNombre(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Rubro</label>
                  <input
                    type="text"
                    placeholder="Ej: Gastronomía, Salud, Servicios"
                    value={newRubro}
                    onChange={e => setNewRubro(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Dueño / Responsable</label>
                  <input
                    type="text"
                    placeholder="Ej: Martín Rodríguez"
                    value={newResponsable}
                    onChange={e => setNewResponsable(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 1155667788"
                    value={newTelefono}
                    onChange={e => setNewTelefono(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    placeholder="contacto@pyme.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Sitio Web Actual (si tiene)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newSitioWeb}
                    onChange={e => setNewSitioWeb(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Instagram / Facebook</label>
                  <input
                    type="text"
                    placeholder="@negocio"
                    value={newInstagram}
                    onChange={e => setNewInstagram(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Diagnóstico Inicial de Presencia Web</label>
                <select
                  value={newDiagnostico}
                  onChange={e => setNewDiagnostico(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                >
                  <option value="Sin sitio web activo">Sin sitio web activo (Oportunidad Landing / Web Completa)</option>
                  <option value="Sitio web obsoleto / No responsive">Sitio web obsoleto / No responsive (Rediseño total)</option>
                  <option value="Vende por Instagram / Requiere E-commerce">Vende por Instagram / Requiere E-commerce & Mercado Pago</option>
                  <option value="Sitio institucional sin catálogo">Sitio institucional sin catálogo interactivo</option>
                  <option value="Requiere sistema de turnos / presupuestos">Requiere sistema de turnos / presupuestos online</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Potencial de Cierre</label>
                  <select
                    value={newPotencial}
                    onChange={e => setNewPotencial(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  >
                    <option value="alto">🔥 Alto (Listo para comprar)</option>
                    <option value="medio">⚡ Medio (Interesado)</option>
                    <option value="bajo">❄️ Bajo (Frío / Prospección)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Etapa Inicial</label>
                  <select
                    value={newEtapa}
                    onChange={e => setNewEtapa(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  >
                    {ETAPAS_EMBUDO.map(et => (
                      <option key={et.id} value={et.id}>{et.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowNewPymeModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
                  Guardar PyME
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Abono Recurrente */}
      {showNewAbonoModal && selectedPymeForAbono && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
            width: '100%', maxWidth: '480px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 700 }}>+ Alta de Abono Mensual</h3>
              <button onClick={() => setShowNewAbonoModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
              Asignar cobro recurrente a <strong>{selectedPymeForAbono.nombre}</strong>.
            </p>

            <form onSubmit={handleCreateAbono} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Concepto del Servicio</label>
                <input
                  type="text"
                  required
                  value={abonoServicio}
                  onChange={e => setAbonoServicio(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Monto Mensual ($)</label>
                  <input
                    type="number"
                    required
                    value={abonoMonto}
                    onChange={e => setAbonoMonto(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#34d399', fontSize: '0.9rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Día de Cobro</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={abonoDia}
                    onChange={e => setAbonoDia(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowNewAbonoModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
                  Activar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync Price Sheet Modal */}
      <BulkPriceSheetSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSuccess={() => {
          setShowSyncModal(false)
          fetchData()
        }}
      />
    </div>
  )
}
