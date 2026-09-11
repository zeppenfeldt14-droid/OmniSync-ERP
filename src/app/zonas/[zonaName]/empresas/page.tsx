import { prisma } from '@/lib/prisma'
import EmpresasClient from './EmpresasClient'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { areZonasEqual } from '@/lib/zonaUtils'

export const dynamic = 'force-dynamic'

export default async function EmpresasPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ zonaName: string }>
  searchParams: Promise<{ vendedor?: string }>
}) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { zonaName } = await params
  const { vendedor: queryVendedor } = await searchParams
  const decodedZona = decodeURIComponent(zonaName)

  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  let currentTenant = null
  if (tenantSlug) {
    currentTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })
  } else if (user.tenantId) {
    currentTenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId }
    })
  } else {
    currentTenant = await prisma.tenant.findFirst({
      where: { slug: 'golocinas' }
    })
  }
  const currentTenantId = currentTenant?.id || 1

  // Verify access permissions to this zone
  if (user.nivel === 3 && !areZonasEqual(user.zona, decodedZona)) {
    redirect(`/zonas/${user.zona || 'CABA'}/empresas`)
  } else if (user.nivel === 2) {
    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = typeof user.zonasHabilitadas === 'string'
          ? JSON.parse(user.zonasHabilitadas)
          : JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    const hasAccess = enabledZones.some(ez => areZonasEqual(ez, decodedZona))
    if (!hasAccess && enabledZones.length > 0) {
      redirect(`/zonas/${enabledZones[0] || 'CABA'}/empresas`)
    }
  }

  const isVendedor = user.nivel === 3
  const userAlias = isVendedor ? user.alias : queryVendedor
  const hasVendedorFilter = Boolean(userAlias)
  
  const whereFilter: any = {
    tenantId: currentTenantId,
    zona: { equals: decodedZona, mode: 'insensitive' },
    ...(hasVendedorFilter ? { vendedorAsignado: { equals: userAlias, mode: 'insensitive' } } : {}),
    ...(isVendedor ? { ocultarVendedor: false } : {})
  }

  const empresasAll = await prisma.empresa.findMany({
    where: whereFilter,
    orderBy: { nombre: 'asc' },
    include: {
      visitas: {
        orderBy: { fecha: 'desc' },
        take: 1
      }
    }
  })

  // Fetch available sub-zones in DB for this major zone
  const dbSubZonas = await prisma.subZona.findMany({
    where: { zona: { equals: decodedZona, mode: 'insensitive' } },
    orderBy: { nombre: 'asc' }
  })

  // Get unique sub-zones (combining predefined ones with actual company subZones)
  const subZonesSet = new Set<string>()
  dbSubZonas.forEach(sz => subZonesSet.add(sz.nombre.trim().toUpperCase()))
  empresasAll.forEach(emp => {
    if (emp.subZona) {
      subZonesSet.add(emp.subZona.trim().toUpperCase())
    }
  })
  subZonesSet.add('SIN ASIGNAR')
  subZonesSet.add('CORREO')

  const subZones = Array.from(subZonesSet).sort()

  // Fetch rubros from DB and unique company rubros
  const dbRubros = await prisma.rubro.findMany({
    orderBy: { nombre: 'asc' }
  })
  const rubrosSet = new Set<string>()
  dbRubros.forEach(r => rubrosSet.add(r.nombre.trim().toUpperCase()))
  empresasAll.forEach(emp => {
    if (emp.rubro) {
      rubrosSet.add(emp.rubro.trim().toUpperCase())
    }
  })
  const rubrosList = Array.from(rubrosSet).sort()

  return (
    <EmpresasClient empresas={empresasAll} zonas={subZones} rubros={rubrosList} />
  )
}

