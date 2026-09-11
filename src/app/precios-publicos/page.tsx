import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import PreciosPublicosClient from './PreciosPublicosClient'

export const dynamic = 'force-dynamic'

export default async function PreciosPublicosPage({ 
  searchParams 
}: { 
  searchParams?: Promise<{ tenant?: string }> 
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const headersList = await headers()
  const headerSlug = headersList.get('x-tenant-slug')
  const user = await getSessionUser()

  const targetSlug = resolvedParams.tenant || headerSlug || null

  let currentTenantId: number | null = null
  let tenantName: string = 'Golocinas'

  if (targetSlug) {
    const matchedTenant = await prisma.tenant.findUnique({
      where: { slug: targetSlug.toLowerCase() },
      select: { id: true, nombre: true }
    })
    if (matchedTenant) {
      currentTenantId = matchedTenant.id
      tenantName = matchedTenant.nombre
    }
  } else if (user?.tenantId) {
    const matchedTenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, nombre: true }
    })
    if (matchedTenant) {
      currentTenantId = matchedTenant.id
      tenantName = matchedTenant.nombre
    }
  }

  // Where condition for tenant
  const listWhere = currentTenantId 
    ? { OR: [{ tenantId: currentTenantId }, { tenantId: null }] }
    : {}

  // Query price lists ordered by active state and date
  const priceLists = await prisma.listaPrecio.findMany({
    where: listWhere,
    orderBy: [
      { activa: 'desc' },
      { vigenteDesde: 'desc' }
    ],
    include: {
      precios: true
    }
  })

  // Get active list to set as default in client component
  const now = new Date()
  const activeList = priceLists.find(l => l.activa && new Date(l.vigenteDesde) <= now) || priceLists[0] || null
  const activeListId = activeList ? activeList.id : null

  // Fetch all active products
  const productWhere = currentTenantId
    ? { activo: true, OR: [{ tenantId: currentTenantId }, { tenantId: null }] }
    : { activo: true }

  const productos = await prisma.producto.findMany({
    where: productWhere,
    orderBy: [
      { linea: 'asc' },
      { nombre: 'asc' }
    ]
  })

  return (
    <PreciosPublicosClient 
      productos={productos} 
      priceLists={priceLists} 
      activeListId={activeListId} 
      tenantName={tenantName}
    />
  )
}
