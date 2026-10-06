const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  console.log('--- AUDITORÍA DE USUARIOS Y TENANTS ---')
  const users = await prisma.usuario.findMany({
    select: {
      id: true,
      alias: true,
      email: true,
      rol: true,
      nivel: true,
      tenantId: true,
      tenant: { select: { slug: true, nombre: true } }
    },
    orderBy: [{ tenantId: 'asc' }, { id: 'asc' }]
  })
  
  console.table(users.map(u => ({
    id: u.id,
    alias: u.alias,
    rol: u.rol,
    nivel: u.nivel,
    tenantId: u.tenantId,
    tenantSlug: u.tenant?.slug || 'GLOBAL (SUPER ADMIN)'
  })))

  const superAdmins = users.filter(u => u.tenantId === null)
  console.log(`\n👑 Total Super Admins Globales (tenantId: null): ${superAdmins.length}`)
  superAdmins.forEach(sa => console.log(`   - @${sa.alias} (${sa.email}) [Rol: ${sa.rol}, Nivel: ${sa.nivel}]`))

  const tenantUsers = users.filter(u => u.tenantId !== null)
  console.log(`\n🏢 Total Operadores de Inquilino: ${tenantUsers.length}`)
}

check().finally(() => prisma.$disconnect())
