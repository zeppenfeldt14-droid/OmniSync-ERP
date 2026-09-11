import { prisma } from '@/lib/prisma'
import EmpresasGlobalClient from './EmpresasGlobalClient'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EmpresasGlobalPage() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  // Solo niveles 1 y 2 pueden acceder al módulo global
  if (user.nivel >= 3) {
    redirect('/')
  }

  const empresasAll = await prisma.empresa.findMany({
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

  // Obtener zonas con su tenantId
  const dbZonas = await prisma.zona.findMany({
    select: { id: true, nombre: true, tenantId: true },
    orderBy: { nombre: 'asc' }
  })

  // Obtener sub-zonas únicas
  const dbSubZonas = await prisma.subZona.findMany({
    orderBy: { nombre: 'asc' }
  })
  
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

  // Obtener rubros
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

  // Obtener usuarios activos (Vendedores)
  const usuariosActivos = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, alias: true, zona: true, nivel: true, tenantId: true, limitesEstado: true }
  })
  
  const vendedores = usuariosActivos.filter(u => {
    if (u.nivel === 3) return true;
    try {
      const limites = typeof u.limitesEstado === 'string' ? JSON.parse(u.limitesEstado) : (u.limitesEstado || {});
      if (limites.metasActivas) return true;
    } catch(e) {}
    return false;
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
