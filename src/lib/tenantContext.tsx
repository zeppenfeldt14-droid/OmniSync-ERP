'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getTenantTerminology, TenantTerminology, LOGISTICA_TERMINOLOGY, AGENCIA_TERMINOLOGY } from './terminology'

export interface TenantData {
  id: number
  slug: string
  nombre: string
  descripcion: string | null
  shortCode: string | null
  colorPrimario: string
  colorSecundario: string
  logoUrl: string | null
  tipoModelo: 'FISICO_TERRENO' | 'SERVICIOS_DIGITALES' | 'HIBRIDO'
  moneda: string
  sheetUrl: string | null
  sheetUltimaSync: string | null
  configuracion: Record<string, unknown>
  terminologia?: Record<string, string> | null
  activo: boolean
}

interface TenantContextType {
  activeTenant: TenantData | null
  tenants: TenantData[]
  terminology: TenantTerminology
  isLoading: boolean
  setActiveTenant: (tenant: TenantData) => void
  switchTenantById: (id: number) => void
  switchTenantBySlug: (slug: string) => void
  refreshTenants: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

const DEFAULT_TENANTS: TenantData[] = [
  {
    id: 1,
    slug: 'equipos-terreno',
    nombre: 'Equipos y Logística en Terreno',
    descripcion: 'Venta presencial de equipos, ruteo geolocalizado y distribución mayorista.',
    shortCode: 'EQP',
    colorPrimario: '#3b82f6',
    colorSecundario: '#1e293b',
    logoUrl: null,
    tipoModelo: 'FISICO_TERRENO',
    moneda: 'ARS',
    sheetUrl: null,
    sheetUltimaSync: null,
    terminologia: LOGISTICA_TERMINOLOGY as any,
    configuracion: { permiteVisitas: true, permiteGeolocalizacion: true, tieneLogistica: true },
    activo: true,
  },
  {
    id: 2,
    slug: 'publicidad-marketing',
    nombre: 'Agencia de Publicidad & Marketing Digital',
    descripcion: 'Servicios web, pauta publicitaria, marketing digital y desarrollos a medida.',
    shortCode: 'PUB',
    colorPrimario: '#7c3aed',
    colorSecundario: '#4c1d95',
    logoUrl: null,
    tipoModelo: 'SERVICIOS_DIGITALES',
    moneda: 'USD',
    sheetUrl: null,
    sheetUltimaSync: null,
    terminologia: AGENCIA_TERMINOLOGY as any,
    configuracion: { permiteAbonos: true, permiteCotizadorWeb: true, diagnosticoPymes: true },
    activo: true,
  }
]

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<TenantData[]>(DEFAULT_TENANTS)
  const [activeTenant, setActiveTenantState] = useState<TenantData>(DEFAULT_TENANTS[0])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const terminology = useMemo(() => {
    return getTenantTerminology(activeTenant)
  }, [activeTenant])

  const refreshTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/tenants')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setTenants(data)
          
          // Keep current active or fallback to saved / first
          const savedSlug = typeof window !== 'undefined' ? localStorage.getItem('omnisync_active_tenant_slug') : null
          const found = data.find((t: TenantData) => t.slug === savedSlug) || data[0]
          if (found) setActiveTenantState(found)
        }
      }
    } catch (e) {
      console.warn('Could not fetch tenants from API, using defaults', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshTenants()
  }, [refreshTenants])

  const setActiveTenant = (tenant: TenantData) => {
    setActiveTenantState(tenant)
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnisync_active_tenant_slug', tenant.slug)
      localStorage.setItem('omnisync_active_tenant_id', String(tenant.id))
      window.dispatchEvent(new CustomEvent('omnisync_tenant_changed', { detail: tenant }))
    }
  }

  const switchTenantById = (id: number) => {
    const found = tenants.find(t => t.id === id)
    if (found) setActiveTenant(found)
  }

  const switchTenantBySlug = (slug: string) => {
    const found = tenants.find(t => t.slug === slug)
    if (found) setActiveTenant(found)
  }

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        tenants,
        terminology,
        isLoading,
        setActiveTenant,
        switchTenantById,
        switchTenantBySlug,
        refreshTenants
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
