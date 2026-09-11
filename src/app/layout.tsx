import type { Metadata } from 'next'
import './globals.css'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { AppShellClient } from './AppShellClient'
import { TenantProvider } from '@/lib/tenantContext'
import { CurrencyProvider } from '@/context/CurrencyContext'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'By OmniSync',
  description: 'Sistema de gestión',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  let logo: string | null = null
  let headersList: Headers | null = null
  let pathname = ''

  try {
    user = await getSessionUser()
  } catch (e) {
    console.warn('Layout getSessionUser error:', e)
  }

  try {
    headersList = await headers()
    pathname = headersList.get('x-pathname') || ''
  } catch (e) {
    console.warn('Layout headers error:', e)
  }

  try {
    const logoConfig = await prisma.configuracionSistema.findUnique({
      where: { clave: 'logo' }
    })
    logo = logoConfig ? logoConfig.valor : null
  } catch (e) {
    console.warn('Layout logoConfig error:', e)
  }

  const cleanPathname = pathname.replace(/^\/(golocinas|vinnaty)/i, '') || '/'

  const isPublicRoute = 
    pathname === '/' || 
    pathname === '' ||
    pathname === '/login' ||
    cleanPathname === '/login' ||
    pathname.startsWith('/visitas-hoy') || 
    pathname.startsWith('/precios-publicos') || 
    pathname.startsWith('/reportes-publicos') ||
    cleanPathname.startsWith('/visitas-hoy') || 
    cleanPathname.startsWith('/precios-publicos') || 
    cleanPathname.startsWith('/reportes-publicos')

  // If there is no authenticated user session (e.g. /login) OR they are visiting a public landing page (like the Lobby), render page full screen
  if (!user || isPublicRoute) {
    return (
      <html lang="es">
        <body>
          <div className="min-h-screen bg-[#07090e]">
            {children}
          </div>
        </body>
      </html>
    )
  }

  // Super Admin Portal: Dedicated standalone layout, completely isolated from tenant sales shell
  const isSuperAdminRoute = pathname.startsWith('/super-admin')
  if (isSuperAdminRoute) {
    return (
      <html lang="es">
        <body className="bg-[#050505] text-white min-h-screen antialiased">
          <TenantProvider>
            <CurrencyProvider>
              {children}
            </CurrencyProvider>
          </TenantProvider>
        </body>
      </html>
    )
  }

  let zones: string[] = []
  let allZones: Array<{ id: number; nombre: string; tenantId: number | null }> = []
  let vendedoresPorZona: Record<string, Array<{ id: number, nombre: string, alias: string | null, zona: string | null, tenantId?: number | null }>> = {}

  try {
    const zonesList = await prisma.zona.findMany({
      select: { id: true, nombre: true, tenantId: true },
      orderBy: { nombre: 'asc' }
    })
    allZones = zonesList
    zones = zonesList.map(z => z.nombre)

    const vendedores = await prisma.usuario.findMany({
      where: { nivel: 3, activo: true },
      select: { id: true, nombre: true, alias: true, zona: true, tenantId: true }
    })

    vendedoresPorZona = vendedores.reduce((acc, v) => {
      const z = v.zona || 'Sin Zona'
      if (!acc[z]) acc[z] = []
      acc[z].push(v)
      return acc
    }, {} as Record<string, typeof vendedores>)
  } catch (e) {
    console.warn('Layout zones/vendedores error:', e)
  }

  return (
    <html lang="es">
      <body>
        <TenantProvider>
          <CurrencyProvider>
            <AppShellClient 
              logo={logo} 
              user={user} 
              zones={zones} 
              allZones={allZones}
              vendedoresPorZona={vendedoresPorZona}
            >
              {children}
            </AppShellClient>
          </CurrencyProvider>
        </TenantProvider>
      </body>
    </html>
  )
}
