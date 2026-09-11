'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Globe,
  Truck,
  Laptop,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react'
import { useTenant, TenantData } from '@/lib/tenantContext'
import CreateTenantModal from './tenants/CreateTenantModal'
import BulkPriceSheetSyncModal from './precios/BulkPriceSheetSyncModal'

export default function TenantSelector() {
  const { activeTenant, tenants, switchTenantById } = useTenant()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getModelIcon = (tipo: string) => {
    switch (tipo) {
      case 'SERVICIOS_DIGITALES':
        return <Laptop size={14} color="#34d399" />
      case 'FISICO_TERRENO':
        return <Truck size={14} color="#60a5fa" />
      default:
        return <Globe size={14} color="#c084fc" />
    }
  }

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#f8fafc',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          title="Cambiar Unidad de Negocio / Inquilino"
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: activeTenant?.colorPrimario || '#3b82f6',
            boxShadow: `0 0 8px ${activeTenant?.colorPrimario || '#3b82f6'}`
          }} />
          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeTenant?.nombre || 'Unidad de Negocio'}
          </span>
          <ChevronDown size={14} style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '280px',
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unidades de Negocio
              </span>
              <span style={{ fontSize: '0.65rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '10px' }}>
                Super Admin
              </span>
            </div>

            <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
              {tenants.map(t => {
                const isSelected = activeTenant?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      switchTenantById(t.id)
                      setIsOpen(false)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isSelected ? '#f8fafc' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getModelIcon(t.tipoModelo)}
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 500 }}>{t.nombre}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {t.moneda} • {t.tipoModelo === 'SERVICIOS_DIGITALES' ? 'Web & Digital' : 'Venta Terreno'}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="#34d399" />}
                  </button>
                )
              })}
            </div>

            {/* Quick Actions Footer */}
            <div style={{
              padding: '6px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              backgroundColor: 'rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setShowSyncModal(true)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'rgba(16,185,129,0.1)',
                  color: '#34d399',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <FileSpreadsheet size={14} />
                <span>Sincronizar Google Sheet</span>
              </button>

              <Link
                href="/super-admin/tenants"
                onClick={() => setIsOpen(false)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  color: '#a5b4fc',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <Building2 size={14} />
                <span>Panel Maestro Super Admin</span>
              </Link>

              <button
                onClick={() => {
                  setIsOpen(false)
                  setShowCreateModal(true)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <Plus size={14} />
                <span>+ Nueva Unidad / Marca Blanca</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <BulkPriceSheetSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </>
  )
}
