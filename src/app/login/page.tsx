'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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
        body: JSON.stringify({ alias, password })
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

        window.location.href = data.redirectUrl || '/'
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
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Floating white card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        padding: '48px 40px 40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        {/* Orange lock icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#ea580c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(234, 88, 12, 0.35)',
        }}>
          <Lock size={28} color="#ffffff" />
        </div>

        {/* Title block */}
        <h1 style={{
          fontSize: '22px',
          fontWeight: 900,
          fontStyle: 'italic',
          color: '#1a1a2e',
          letterSpacing: '1px',
          margin: '0 0 2px',
          textTransform: 'uppercase',
        }}>
          CRM NEOSOL
        </h1>
        <p style={{
          fontSize: '13px',
          fontWeight: 700,
          fontStyle: 'italic',
          color: '#1a1a2e',
          letterSpacing: '2px',
          margin: '0 0 32px',
          textTransform: 'uppercase',
        }}>
          USER STAFF
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Alias field */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Alias de Usuario"
              value={alias}
              onChange={(e) => { setAlias(e.target.value); setError(''); }}
              autoComplete="username"
              required
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1.5px solid #e5e7eb',
                padding: '12px 4px',
                fontSize: '14px',
                color: '#374151',
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
          <div style={{ marginBottom: '28px' }}>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1.5px solid #e5e7eb',
                padding: '12px 4px',
                fontSize: '14px',
                color: '#374151',
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
              background: isLoading ? '#fb923c' : '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
            }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#c2410c' }}
            onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#ea580c' }}
          >
            {isLoading ? 'VERIFICANDO...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  )
}
