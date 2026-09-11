'use client'

import React, { useState } from 'react'
import { X, Building2, Plus, Loader2, Globe, Truck, Laptop } from 'lucide-react'
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
  const [descripcion] = useState('')
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al procesar la solicitud'
      setError(errorMsg)
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
        backgroundColor: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10b981'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Nueva Unidad de Negocio / Inquilino
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Configuración de Marca Blanca y Modelo Comercial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#94a3b8',
              cursor: 'pointer', padding: '4px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '8px',
              backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          {/* Nombre y Slug */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Nombre de la Marca / Unidad *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={handleNameChange}
                placeholder="Ej: Soluciones Web & PyMEs"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc', fontSize: '0.9rem', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Slug / Identificador *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="ej: soluciones-web"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          {/* Moneda */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Moneda Principal
            </label>
            <select
              value={moneda}
              onChange={e => setMoneda(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc', fontSize: '0.9rem', outline: 'none'
              }}
            >
              <option value="ARS" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>ARS ($ - Pesos Argentinos)</option>
              <option value="USD" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>USD ($ - Dólares Estadounidenses)</option>
            </select>
          </div>

          {/* Tipo de Modelo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Tipo de Modelo Comercial
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'SERVICIOS_DIGITALES' as const, label: 'Servicios Web / PyMEs', icon: Laptop, color: '#10b981' },
                { id: 'FISICO_TERRENO' as const, label: 'Equipos en Terreno', icon: Truck, color: '#3b82f6' },
                { id: 'HIBRIDO' as const, label: 'Híbrido', icon: Globe, color: '#a855f7' }
              ].map(t => {
                const Icon = t.icon
                const isSelected = tipoModelo === t.id
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      setTipoModelo(t.id)
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
