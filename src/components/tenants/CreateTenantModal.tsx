'use client'

import React, { useState } from 'react'
import { X, Building2, Plus, Sparkles, Loader2, Globe, Truck, Laptop, DollarSign, CheckCircle2 } from 'lucide-react'
import { useTenant } from '@/lib/tenantContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function CreateTenantModal({ isOpen, onClose, onSuccess }: Props) {
  const { refreshTenants, setActiveTenant } = useTenant()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoModelo, setTipoModelo] = useState<'SERVICIOS_DIGITALES' | 'FISICO_TERRENO' | 'HIBRIDO'>('SERVICIOS_DIGITALES')
  const [colorPrimario, setColorPrimario] = useState('#10b981')
  const [moneda, setMoneda] = useState('ARS')
  const [sheetUrl, setSheetUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNombre(val)
    setSlug(
      val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !slug.trim()) {
      setError('El nombre y el identificador (slug) son obligatorios.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          slug,
          descripcion,
          tipoModelo,
          colorPrimario,
          moneda,
          sheetUrl: sheetUrl.trim() || null
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear la unidad de negocio')

      await refreshTenants()
      setActiveTenant(data)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        width: '100%', maxWidth: '600px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'rgba(59,130,246,0.2)', color: '#60a5fa',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Nueva Unidad de Negocio / Marca Blanca
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Crea un nuevo inquilino con su propio catálogo, precios y carteras de clientes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem', borderRadius: '8px',
              backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '0.8rem'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              Nombre de la Unidad de Negocio *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Páginas Web PyMEs, Consultoría SEO, Equipos Venta Directa"
              value={nombre}
              onChange={handleNameChange}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc', fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Identificador (Slug) *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Moneda Principal
              </label>
              <select
                value={moneda}
                onChange={e => setMoneda(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc', fontSize: '0.85rem'
                }}
              >
                <option value="ARS">ARS ($ - Pesos Argentinos)</option>
                <option value="USD">USD ($ - Dólares Estadounidenses)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
              Tipo de Modelo Comercial
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[
                { id: 'SERVICIOS_DIGITALES', label: 'Servicios Web / PyMEs', icon: Laptop, color: '#10b981' },
                { id: 'FISICO_TERRENO', label: 'Equipos en Terreno', icon: Truck, color: '#3b82f6' },
                { id: 'HIBRIDO', label: 'Híbrido', icon: Globe, color: '#a855f7' }
              ].map(t => {
                const Icon = t.icon
                const isSelected = tipoModelo === t.id
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      setTipoModelo(t.id as any)
                      setColorPrimario(t.color)
                    }}
                    style={{
                      padding: '10px 8px', borderRadius: '8px',
                      border: `1px solid ${isSelected ? t.color : 'rgba(255,255,255,0.1)'}`,
                      backgroundColor: isSelected ? `${t.color}20` : 'rgba(255,255,255,0.02)',
                      color: isSelected ? t.color : '#94a3b8',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      fontSize: '0.75rem', fontWeight: 600
                    }}
                  >
                    <Icon size={18} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
              Enlace de Google Sheets (Opcional)
            </label>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc', fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
            marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: colorPrimario, color: '#ffffff',
                fontWeight: 700, fontSize: '0.85rem', cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Crear Unidad de Negocio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
