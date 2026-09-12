'use client'

import { useState, useMemo } from 'react'
import { Link2, Check, Package, Calendar } from 'lucide-react'
import { useTenant } from '@/lib/tenantContext'

interface Producto {
  id: number
  codigoInterno: string
  nombre: string
  linea: string
  precioPaquete: number
  paqPorCaja: number
  precioCaja: number
  precioPaqueteMin?: number | null
  precioCajaMin?: number | null
  precioPaqueteMax?: number | null
  precioCajaMax?: number | null
}

interface PriceList {
  id: number
  nombre: string
  vigenteDesde: string | Date
  activa: boolean
  precios: any[]
}

interface Props {
  productos: any[]
  priceLists: PriceList[]
  activeListId: number | null
  tenantName?: string
}

function formatLineaName(lineaKey: string) {
  if (!lineaKey) return 'General'
  if (lineaKey === 'pack_individual') return 'Pack Individual'
  if (lineaKey === 'tripack') return 'Tripack'
  if (lineaKey === 'minis') return 'Minis'
  if (lineaKey === 'snacks') return 'Snacks Horneados'
  return lineaKey
}

export default function PreciosPublicosClient({ productos = [], priceLists = [], activeListId, tenantName = 'OmniSync' }: Props) {
  const { activeTenant, terminology } = useTenant()
  const isUSD = activeTenant?.moneda === 'USD' || activeTenant?.tipoModelo === 'SERVICIOS_DIGITALES'

  const formatPrice = (n: number) => {
    if (isUSD) {
      return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
    }
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
  }
  const [selectedListId, setSelectedListId] = useState<number | null>(() => {
    if (activeListId) return activeListId
    if (priceLists && priceLists.length > 0) return priceLists[0].id
    return null
  })
  const [tarifa, setTarifa] = useState<'min' | 'max'>('min')

  const selectedList = useMemo(() => {
    if (!priceLists) return null
    return priceLists.find(l => l.id === selectedListId) || null
  }, [priceLists, selectedListId])

  const productosConPrecios = useMemo(() => {
    if (!productos) return []
    return productos.map((p) => {
      const priceRecord = selectedList?.precios?.find((pr: any) => pr.productoId === p.id)
      
      let precioPaquete = p.precioPaquete ?? 0
      let precioCaja = p.precioCaja ?? 0

      if (priceRecord) {
        precioPaquete = tarifa === 'min' 
          ? (priceRecord.precioPaqueteMin ?? 0)
          : (priceRecord.precioPaqueteMax ?? 0)
        precioCaja = tarifa === 'min'
          ? (priceRecord.precioCajaMin ?? 0)
          : (priceRecord.precioCajaMax ?? 0)
      } else {
        // Fallback if no specific price record
        precioPaquete = tarifa === 'min' ? Number((precioPaquete * 1.15).toFixed(2)) : precioPaquete
        precioCaja = tarifa === 'min' ? Number((precioCaja * 1.15).toFixed(2)) : precioCaja
      }

      return {
        ...p,
        precioPaqueteCalculado: precioPaquete,
        precioCajaCalculado: precioCaja,
      }
    })
  }, [productos, selectedList, tarifa])

  // Group by line
  const byLinea = useMemo(() => {
    const groups: Record<string, typeof productosConPrecios> = {}
    for (const p of productosConPrecios) {
      const lineaKey = p.linea || 'otros'
      if (!groups[lineaKey]) groups[lineaKey] = []
      groups[lineaKey].push(p)
    }
    return groups
  }, [productosConPrecios])

  const getListBadge = (list: PriceList) => {
    const listDate = new Date(list.vigenteDesde)
    const now = new Date()
    now.setHours(0,0,0,0)

    if (listDate > now) {
      return {
        label: 'Próxima vigencia',
        style: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }
      }
    }
    if (list.id === activeListId) {
      return {
        label: 'Vigente hoy',
        style: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }
      }
    }
    return {
      label: 'Tarifario anterior',
      style: { backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.2)' }
    }
  }

  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      padding: '0 0 3rem'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1B365D 0%, #0f172a 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '2rem 1rem 1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🍪</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>
          Lista de Precios Oficial
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.85rem' }}>
          {tenantName} · Tarifario Oficial
        </p>
      </div>

      <div style={{ padding: '1rem', maxWidth: '700px', margin: '0 auto' }}>
        
        {/* Filtro 1: Selección de Tarifario / Vigencia */}
        {priceLists.length > 1 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Seleccionar Tarifario:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {priceLists.map(list => {
                const badge = getListBadge(list)
                const isSelected = list.id === selectedListId
                return (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                      color: isSelected ? '#60a5fa' : '#cbd5e1',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{list.nombre}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Vigencia: {new Date(list.vigenteDesde).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      border: '1px solid transparent',
                      ...badge.style
                    }}>
                      {badge.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Filtro 2: Selección de Tarifa (Estándar vs Volumen) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Escala / Tarifa:
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '0.25rem',
            borderRadius: '12px'
          }}>
            <button
              onClick={() => setTarifa('min')}
              style={{
                padding: '0.6rem 0.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: tarifa === 'min' ? '#1e3a8a' : 'transparent',
                color: tarifa === 'min' ? '#60a5fa' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {terminology.tarifaMinLabel}
            </button>
            <button
              onClick={() => setTarifa('max')}
              style={{
                padding: '0.6rem 0.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: tarifa === 'max' ? '#1e3a8a' : 'transparent',
                color: tarifa === 'max' ? '#60a5fa' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {terminology.tarifaMaxLabel}
            </button>
          </div>
        </div>

        {/* Listado de Productos */}
        {Object.entries(byLinea)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([linea, prods]) => (
          <div key={linea} style={{ marginBottom: '1.5rem' }}>
            {/* Cabecera de línea */}
            <div style={{
              backgroundColor: 'rgba(59,130,246,0.08)',
              borderLeft: '4px solid #3b82f6',
              borderRadius: '0 8px 8px 0',
              padding: '0.45rem 0.75rem',
              marginBottom: '0.6rem'
            }}>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {formatLineaName(linea)}
              </h2>
            </div>

            {/* Listado centrado y optimizado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {prods.map((p) => (
                <div key={p.id} style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '0.6rem 0.85rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.2rem'
                }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem', lineHeight: 1.2 }}>
                    {p.nombre}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Cód: {p.codigoInterno} · {p.paqPorCaja} {terminology.columnaUnidad.toLowerCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '0.15rem' }}>
                    <div>
                      <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.05rem', letterSpacing: '0.03em' }}>{terminology.columnaPrecioUnitario}</span>
                      <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.88rem' }}>
                        {formatPrice(p.precioPaqueteCalculado)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.05rem', letterSpacing: '0.03em' }}>{terminology.columnaPrecioTotal}</span>
                      <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.88rem' }}>
                        {formatPrice(p.precioCajaCalculado)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {productosConPrecios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <p>No hay productos disponibles en este momento.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '1.5rem' }}>
          <p style={{ color: '#475569', fontSize: '0.72rem' }}>
            {terminology.leyendaIva} · {isUSD ? 'Valores expresados en USD' : 'Precios en ARS'} · Sujeto a cambios
          </p>
          <p style={{ color: '#334155', fontSize: '0.68rem', marginTop: '0.2rem' }}>
            {activeTenant?.nombre || tenantName} — Sistema Oficial
          </p>
        </div>
      </div>
    </div>
  )
}
