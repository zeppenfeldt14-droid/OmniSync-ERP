import { prisma } from '@/lib/prisma'
import EmpresasGlobalClient from './EmpresasGlobalClient'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function EmpresasGlobalPage() {
  let user = null
  try {
    user = await getSessionUser()
  } catch (e) {
    console.warn('Error getSessionUser in /empresas:', e)
  }

  if (!user) {
    redirect('/login')
  }

  let tenantSlug: string | null = null
  try {
    const headersList = await headers()
    tenantSlug = headersList.get('x-tenant-slug')
  } catch (e) {
    console.warn('Error headers in /empresas:', e)
  }

  let currentTenant = null
  try {
    if (tenantSlug) {
      currentTenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug }
      })
    } else if (user.tenantId) {
      currentTenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId }
      })
    }
    
    if (!currentTenant) {
      currentTenant = await prisma.tenant.findFirst({
        where: { activo: true },
        orderBy: { id: 'asc' }
      })
    }
  } catch (e) {
    console.warn('Error finding tenant in /empresas:', e)
  }

  const currentTenantId = currentTenant?.id || null

  let empresasAll: any[] = []
  try {
    const whereClause: any = {}
    if (currentTenantId) {
      whereClause.OR = [
        { tenantId: currentTenantId },
        { tenantId: null }
      ]
    }

    empresasAll = await prisma.empresa.findMany({
      where: whereClause,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        zona: true,
        subZona: true,
        rubro: true,
        vendedorAsignado: true,
        ocultarVendedor: true,
        direccion: true,
        barrio: true,
        telefono: true,
        telefono2: true,
        estado: true,
        cicloVentaDias: true,
        creadoEn: true,
        tenantId: true,
        visitas: {
          orderBy: { fecha: 'desc' },
          take: 1
        }
      }
    })
  } catch (e) {
    console.error('Error fetching empresas in /empresas:', e)
    empresasAll = []
  }

  // Obtener zonas con su tenantId
  let dbZonas: Array<{ id: number; nombre: string; tenantId: number | null }> = []
  try {
    dbZonas = await prisma.zona.findMany({
      where: currentTenantId ? { OR: [{ tenantId: currentTenantId }, { tenantId: null }] } : {},
      select: { id: true, nombre: true, tenantId: true },
      orderBy: { nombre: 'asc' }
    })
  } catch (e) {
    console.warn('Error fetching zonas in /empresas:', e)
  }

  // Fallback zonas estándar si la base está vacía
  if (dbZonas.length === 0) {
    dbZonas = [
      { id: 1, nombre: 'Zona 1', tenantId: currentTenantId },
      { id: 2, nombre: 'Zona 2', tenantId: currentTenantId },
      { id: 3, nombre: 'Zona 3', tenantId: currentTenantId },
      { id: 4, nombre: 'Zona 4', tenantId: currentTenantId }
    ]
  }

  // Obtener sub-zonas únicas
  let dbSubZonas: any[] = []
  try {
    dbSubZonas = await prisma.subZona.findMany({
      orderBy: { nombre: 'asc' }
    })
  } catch (e) {
    dbSubZonas = []
  }
  
  const subZonesSet = new Set<string>()
  dbSubZonas.forEach(sz => {
    if (sz.nombre) subZonesSet.add(sz.nombre.trim().toUpperCase())
  })
  empresasAll.forEach(emp => {
    if (emp.subZona) {
      subZonesSet.add(emp.subZona.trim().toUpperCase())
    }
  })
  subZonesSet.add('SIN ASIGNAR')
  subZonesSet.add('CORREO')
  const subZones = Array.from(subZonesSet).sort()

  // Obtener rubros
  let dbRubros: any[] = []
  try {
    dbRubros = await prisma.rubro.findMany({
      orderBy: { nombre: 'asc' }
    })
  } catch (e) {
    dbRubros = []
  }

  const rubrosSet = new Set<string>()
  dbRubros.forEach(r => {
    if (r.nombre) rubrosSet.add(r.nombre.trim().toUpperCase())
  })
  empresasAll.forEach(emp => {
    if (emp.rubro) {
      rubrosSet.add(emp.rubro.trim().toUpperCase())
    }
  })
  const rubrosList = Array.from(rubrosSet).sort()

  // Obtener usuarios activos (Vendedores)
  let usuariosActivos: any[] = []
  try {
    usuariosActivos = await prisma.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, alias: true, zona: true, nivel: true, tenantId: true, limitesEstado: true }
    })
  } catch (e) {
    console.warn('Error fetching usuarios in /empresas:', e)
  }
  
  const vendedores = usuariosActivos.filter(u => {
    if (u.nivel === 3) return true
    try {
      const limites = typeof u.limitesEstado === 'string' ? JSON.parse(u.limitesEstado) : (u.limitesEstado || {})
      if (limites.metasActivas) return true
    } catch(e) {}
    return false
  }).map(u => ({ id: u.id, nombre: u.nombre, alias: u.alias, zona: u.zona, tenantId: u.tenantId }))

  return (
    <EmpresasGlobalClient 
      empresas={empresasAll}
      zonasBase={dbZonas.map(z => z.nombre)}
      allZonas={dbZonas}
      subZonas={subZones}
      rubros={rubrosList}
      vendedores={vendedores}
      userNivel={user.nivel}
    />
  )
}

