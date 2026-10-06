const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  console.log('--- TEST SUPER ADMIN DASHBOARD QUERIES ---')
  const [
    totalTenants,
    activeTenants,
    totalEmpresas,
    totalUsuarios,
    totalProductos,
    totalZonas,
    tenantsList,
    totalLeads
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { activo: true } }),
    prisma.empresa.count(),
    prisma.usuario.count(),
    prisma.producto.count(),
    prisma.zona.count(),
    prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            empresas: true,
            usuarios: true,
            zonas: true,
            productos: true,
            leadsProspectos: true
          }
        },
        zonas: { select: { id: true, nombre: true, color: true } },
        usuarios: { select: { id: true, nombre: true, alias: true, email: true, rol: true, nivel: true, zona: true } }
      },
      orderBy: { id: 'asc' }
    }),
    prisma.leadProspecto.count()
  ])

  console.log('Total Tenants:', totalTenants)
  console.log('Active Tenants:', activeTenants)
  console.log('Total Empresas:', totalEmpresas)
  console.log('Total Usuarios:', totalUsuarios)
  console.log('Total Productos:', totalProductos)
  console.log('Total Zonas:', totalZonas)
  console.log('Total Leads:', totalLeads)
  console.log('\nTenants List:')
  tenantsList.forEach(t => {
    console.log(`- ID: ${t.id} | ${t.nombre} | Slug: /${t.slug} | Modelo: ${t.modeloPrincipal} | Usuarios: ${t._count.usuarios} | Empresas: ${t._count.empresas}`)
  })
}

test()
  .then(() => console.log('\n✅ Todas las consultas ejecutadas con 100% de éxito.'))
  .catch(e => console.error('❌ Error en consultas:', e))
  .finally(() => prisma.$disconnect())
