const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando Normalización y Limpieza Multi-Tenant en la Base de Datos...')

  // 1. SUPER ADMIN GLOBAL (CENTRO DE MANDO)
  console.log('\n👑 1. Verificando Super Admin Global...')
  const superPassword = await bcrypt.hash('ElarezMaster2026!', 10)

  const superAdmin = await prisma.usuario.upsert({
    where: { alias: 'Elarez' },
    update: {
      nombre: 'Ernesto Lares (Super Admin)',
      email: 'admin@omnisync.com',
      passwordHash: superPassword,
      rol: 'SUPER_ADMIN',
      nivel: 1,
      tenantId: null, // Global
      isNivelTodo: true,
      activo: true
    },
    create: {
      alias: 'Elarez',
      nombre: 'Ernesto Lares (Super Admin)',
      email: 'admin@omnisync.com',
      passwordHash: superPassword,
      rol: 'SUPER_ADMIN',
      nivel: 1,
      tenantId: null,
      isNivelTodo: true,
      activo: true
    }
  })
  console.log(`✅ Super Admin configurado: @${superAdmin.alias} (ID: ${superAdmin.id}, tenantId: null)`)

  // 2. INQUILINOS MAESTROS
  console.log('\n🏢 2. Verificando y Sincronizando Inquilinos Maestros...')
  const tenantsData = [
    {
      slug: 'ventas-vs',
      nombre: 'Ventas.VS - Servicios Comerciales & Digitales',
      descripcion: 'Agencia de marketing digital, desarrollo web y software comercial.',
      shortCode: 'VVS',
      colorPrimario: '#7c3aed',
      colorSecundario: '#6d28d9',
      tipoModelo: 'SERVICIOS_DIGITALES',
      defaultPass: 'ventasvs123',
      aliasSuffix: 'ventasvs',
      domain: 'ventasvs.com'
    },
    {
      slug: 'azuchel',
      nombre: 'Azuchel - Regalos & Merchandising Corporativo',
      descripcion: 'Tienda de regalos personalizados (B2C) y material POP corporativo (B2B).',
      shortCode: 'AZU',
      colorPrimario: '#10b981',
      colorSecundario: '#059669',
      tipoModelo: 'HIBRIDO',
      defaultPass: 'azuchel123',
      aliasSuffix: 'azuchel',
      domain: 'azuchel.com'
    },
    {
      slug: 'golocinas',
      nombre: 'Golocinas - Distribución Mayorista & Snacks',
      descripcion: 'Distribución mayorista de golosinas, chocolates y snacks en terreno.',
      shortCode: 'GLC',
      colorPrimario: '#2563eb',
      colorSecundario: '#1d4ed8',
      tipoModelo: 'FISICO_TERRENO',
      defaultPass: 'golocinas123',
      aliasSuffix: 'golocinas',
      domain: 'golocinas.com'
    }
  ]

  for (const t of tenantsData) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {
        nombre: t.nombre,
        descripcion: t.descripcion,
        shortCode: t.shortCode,
        colorPrimario: t.colorPrimario,
        colorSecundario: t.colorSecundario,
        tipoModelo: t.tipoModelo,
        activo: true
      },
      create: {
        slug: t.slug,
        nombre: t.nombre,
        descripcion: t.descripcion,
        shortCode: t.shortCode,
        colorPrimario: t.colorPrimario,
        colorSecundario: t.colorSecundario,
        tipoModelo: t.tipoModelo,
        activo: true
      }
    })
    console.log(`✅ Inquilino listo: ID ${tenant.id} -> ${tenant.nombre} (/${tenant.slug})`)

    // Crear/actualizar equipo estándar para cada inquilino
    const passHash = await bcrypt.hash(t.defaultPass, 10)
    const equipo = [
      { alias: `gerente.${t.aliasSuffix}`, nombre: `Gerente General (${t.shortCode})`, email: `gerente@${t.domain}`, rol: 'ADMIN', nivel: 1 },
      { alias: `supervisor.${t.aliasSuffix}`, nombre: `Supervisor Comercial (${t.shortCode})`, email: `supervisor@${t.domain}`, rol: 'SUPERVISOR', nivel: 2 },
      { alias: `vendedor1.${t.aliasSuffix}`, nombre: `Vendedor Zona 1 (${t.shortCode})`, email: `z1@${t.domain}`, rol: 'VENDEDOR', nivel: 3, zona: 'Zona 1' },
      { alias: `vendedor2.${t.aliasSuffix}`, nombre: `Vendedor Zona 2 (${t.shortCode})`, email: `z2@${t.domain}`, rol: 'VENDEDOR', nivel: 3, zona: 'Zona 2' }
    ]

    for (const usr of equipo) {
      await prisma.usuario.upsert({
        where: { alias: usr.alias },
        update: {
          nombre: usr.nombre,
          email: usr.email,
          passwordHash: passHash,
          rol: usr.rol,
          nivel: usr.nivel,
          tenantId: tenant.id,
          zona: usr.zona || 'Todas',
          activo: true
        },
        create: {
          alias: usr.alias,
          nombre: usr.nombre,
          email: usr.email,
          passwordHash: passHash,
          rol: usr.rol,
          nivel: usr.nivel,
          tenantId: tenant.id,
          zona: usr.zona || 'Todas',
          activo: true
        }
      })
      console.log(`   👤 Operador: @${usr.alias} | Clave: ${t.defaultPass} | Rol: ${usr.rol} [Tenant #${tenant.id}]`)
    }
  }

  // 3. AISLAMIENTO Y LIMPIEZA DE REGISTROS HUÉRFANOS
  console.log('\n🧹 3. Verificando aislamiento de entidades operativas...')
  const golocinasTenant = await prisma.tenant.findUnique({ where: { slug: 'golocinas' } })
  const defaultTenantId = golocinasTenant ? golocinasTenant.id : 1

  const updatedEmpresas = await prisma.empresa.updateMany({
    where: { tenantId: null },
    data: { tenantId: defaultTenantId }
  })
  console.log(`   📦 Empresas normalizadas: ${updatedEmpresas.count}`)

  const updatedPedidos = await prisma.pedido.updateMany({
    where: { tenantId: null },
    data: { tenantId: defaultTenantId }
  })
  console.log(`   🛒 Pedidos normalizados: ${updatedPedidos.count}`)

  const updatedProductos = await prisma.producto.updateMany({
    where: { tenantId: null },
    data: { tenantId: defaultTenantId }
  })
  console.log(`   🏷️ Productos normalizados: ${updatedProductos.count}`)

  console.log('\n✨ ¡Normalización Multi-Tenant completada al 100%!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error durante la normalización:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
