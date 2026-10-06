'use client'

import { useState, Suspense } from 'react'
import { Lock, ArrowLeft, ShieldCheck, Truck, Laptop } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const tenantParam = searchParams.get('tenant')
  const portalParam = searchParams.get('portal')
  const callbackUrl = searchParams.get('callbackUrl')

  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const tenantSlug = (tenantParam || (callbackUrl?.match(/^\/([a-z0-9-]+)/)?.[1]))?.toLowerCase()
  const isSuperAdminPortal = portalParam === 'super-admin' || callbackUrl?.includes('super-admin')

  let tenantTitle = 'OMNISYNC ERP'
  let tenantSubtitle = isSuperAdminPortal ? 'ACCESO DE GOBERNANZA' : 'ACCESO DE OPERADORES'
  let tenantBadge: { label: string; icon: React.ReactNode; bg: string; border: string; color: string } | null = null
  let brandColor = isSuperAdminPortal ? '#d97706' : '#ea580c'

  if (isSuperAdminPortal) {
    tenantTitle = 'SUPER ADMIN OMNISYNC'
    tenantBadge = {
      label: 'Portal Super Admin',
      icon: <ShieldCheck size={14} color="#d97706" />,
      bg: 'rgba(245, 158, 11, 0.15)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      color: '#b45309'
    }
  } else if (tenantSlug === 'ventas-vs' || tenantSlug === 'vinnaty') {
    tenantTitle = 'VENTAS.VS SERVICIOS'
    brandColor = '#7c3aed'
    tenantBadge = {
      label: 'Unidad Ventas.VS • Agencia & Ventas',
      icon: <Laptop size={14} color="#9333ea" />,
      bg: 'rgba(147, 51, 234, 0.12)',
      border: '1px solid rgba(147, 51, 234, 0.25)',
      color: '#7e22ce'
    }
  } else if (tenantSlug === 'azuchel') {
    tenantTitle = 'AZUCHEL GOLOSINAS'
    brandColor = '#10b981'
    tenantBadge = {
      label: 'Unidad Azuchel • Distribución & Golosinas',
      icon: <Truck size={14} color="#10b981" />,
      bg: 'rgba(16, 185, 129, 0.12)',
      border: '1px solid rgba(16, 185, 129, 0.25)',
      color: '#059669'
    }
  } else if (tenantSlug === 'golocinas') {
    tenantTitle = 'GOLOCINAS LOGÍSTICA'
    brandColor = '#2563eb'
    tenantBadge = {
      label: 'Unidad Golocinas • Mayorista',
      icon: <Truck size={14} color="#2563eb" />,
      bg: 'rgba(37, 99, 235, 0.12)',
      border: '1px solid rgba(37, 99, 235, 0.25)',
      color: '#1d4ed8'
    }
  } else if (tenantSlug && tenantSlug !== 'dashboard' && tenantSlug !== 'super-admin' && tenantSlug !== 'login') {
    tenantTitle = `${tenantSlug.toUpperCase()} ERP`
    brandColor = '#3b82f6'
    tenantBadge = {
      label: `Unidad ${tenantSlug.toUpperCase()}`,
      icon: <Truck size={14} color="#3b82f6" />,
      bg: 'rgba(59, 130, 246, 0.12)',
      border: '1px solid rgba(59, 130, 246, 0.25)',
      color: '#2563eb'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alias || !password) {
      setError('Por favor completa todos los campos.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, password, callbackUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Credenciales incorrectas')
        setIsLoading(false)
        return
      }

      if (data.success && data.user) {
        localStorage.setItem('staff_user', data.user.nombre)
        localStorage.setItem('staff_user_id', data.user.id.toString())
        localStorage.setItem('staff_user_email', data.user.email)
        localStorage.setItem('staff_user_alias', data.user.alias)
        localStorage.setItem('staff_user_role', data.user.rol)
        localStorage.setItem('user_level', data.user.nivel.toString())
        localStorage.setItem('user_modules', JSON.stringify(data.user.modulos || {}))
        localStorage.setItem('user_status_limits', JSON.stringify(data.user.limitesEstado || {}))
        localStorage.setItem('staff_auth', 'true')

        const destination = data.redirectUrl || callbackUrl || '/'
        window.location.href = destination
      } else {
        setError('Error al procesar el inicio de sesión.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login Error:', err)
      setError('Error de conexión con el servidor.')
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Floating white card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '22px',
        padding: '44px 36px 36px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}>
        {/* Portal / Tenant Specific Badge */}
        {tenantBadge && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: tenantBadge.bg,
            border: tenantBadge.border,
            color: tenantBadge.color,
            fontSize: '11px',
            fontWeight: 800,
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {tenantBadge.icon}
            <span>{tenantBadge.label}</span>
          </div>
        )}

        {/* Lock icon */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: brandColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s'
        }}>
          {isSuperAdminPortal ? <ShieldCheck size={28} color="#ffffff" /> : <Lock size={26} color="#ffffff" />}
        </div>

        {/* Title block */}
        <h1 style={{
          fontSize: '20px',
          fontWeight: 900,
          color: '#1a1a2e',
          letterSpacing: '1px',
          margin: '0 0 4px',
          textTransform: 'uppercase',
        }}>
          {tenantTitle}
        </h1>
        <p style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#64748b',
          letterSpacing: '1.5px',
          margin: '0 0 28px',
          textTransform: 'uppercase',
        }}>
          {tenantSubtitle}
        </p>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '20px',
            border: '1px solid #fecaca',
          }}>
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {/* Alias field */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: '#374151',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              USUARIO / ALIAS
            </label>
            <input
              type="text"
              value={alias}
              onChange={(e) => { setAlias(e.target.value); setError(''); }}
              placeholder="Ej. Elarez, vinnaty, admin..."
              autoFocus
              autoComplete="username"
              required
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1.5px solid #e5e7eb',
                padding: '12px 4px',
                fontSize: '14px',
                color: '#1e293b',
                background: 'transparent',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = '#ea580c'}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = '#e5e7eb'}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: '#374151',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1.5px solid #e5e7eb',
                padding: '12px 4px',
                fontSize: '14px',
                color: '#1e293b',
                background: 'transparent',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = '#ea580c'}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = '#e5e7eb'}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading ? '#94a3b8' : brandColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            }}
          >
            {isLoading ? 'VERIFICANDO...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>

        {/* Back to Lobby link */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#64748b',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            <ArrowLeft size={14} />
            <span>Volver al Lobby de OmniSync</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc', fontSize: '14px', fontFamily: 'sans-serif' }}>
        Iniciando portal de acceso...
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
