import type { Metadata } from 'next'
import './globals.css'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { AppShellClient } from './AppShellClient'
import { TenantProvider } from '@/lib/tenantContext'
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

  const isPublicRoute = 
    pathname.startsWith('/visitas-hoy') || 
    pathname.startsWith('/precios-publicos') || 
    pathname.startsWith('/reportes-publicos') ||
    pathname === '/login'

  // If there is no authenticated user session (e.g. /login) OR they are visiting a public landing page, render page full screen
  if (!user || isPublicRoute) {
    return (
      <html lang="es">
        <body>
          <div className="min-h-screen bg-[#0B132B]">
            {children}
          </div>
        </body>
      </html>
    )
  }

  let zones: string[] = []
  let vendedoresPorZona: Record<string, Array<{ id: number, nombre: string, alias: string | null, zona: string | null }>> = {}

  try {
    const zonesList = await prisma.zona.findMany({
      orderBy: { nombre: 'asc' }
    })
    zones = zonesList.map(z => z.nombre)

    const vendedores = await prisma.usuario.findMany({
      where: { nivel: 3, activo: true },
      select: { id: true, nombre: true, alias: true, zona: true }
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
          <AppShellClient logo={logo} user={user} zones={zones} vendedoresPorZona={vendedoresPorZona}>
            {children}
          </AppShellClient>
        </TenantProvider>
      </body>
    </html>
  )
}

