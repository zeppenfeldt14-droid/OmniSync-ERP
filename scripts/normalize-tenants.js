const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Sincronizando Modelos Maestros y Jerarquías en Neon PostgreSQL...')

  // 1. SUPER ADMIN GLOBAL (CENTRO DE MANDO)
  console.log('\n👑 1. Configurando Super Admin Global...')
  const superPassword = await bcrypt.hash('OmniSync2026!', 10)

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
  console.log(`✅ Super Admin: @${superAdmin.alias} (tenantId: null)`)

  // 2. INQUILINOS CON MODELOS DE 3 NIVELES
  console.log('\n🏢 2. Sincronizando Inquilinos y Modelos de Negocio...')
  const tenantsConfig = [
    {
      slug: 'ventas-vs',
      nombre: 'Ventas.VS - Servicios Comerciales & Digitales',
      descripcion: 'Agencia de marketing digital, desarrollo web, software a medida, pauta publicitaria y CRM.',
      shortCode: 'VVS',
      colorPrimario: '#7c3aed',
      colorSecundario: '#6d28d9',
      tipoModelo: 'SERVICIOS_DIGITALES',
      modeloPrincipal: 'MOD-MKT-01',
      subModelo: 'SUB-MKT-B2B',
      nicho: 'NICH-MKT-GROWTH',
      canalesVenta: ['B2B', 'WHATSAPP_CORP', 'EMAIL_PROPOSAL'],
      bridgeConfig: { eOmniSyncUrl: '', syncToken: '', autoTransplant: false, activeStoreId: 'ventas-vs' },
      moneda: 'USD',
      defaultPass: 'ventasvs123',
      aliasSuffix: 'ventasvs',
      domain: 'ventasvs.com',
      aiConfig: {
        nichoId: 'AGENCIA_MARKETING_VENTASVS',
        nombreAgente: 'Director Comercial Ventas.VS',
        tono: 'Estratégico, Persuasivo, Orientado a ROI y Alta Conversión',
        directivaSistema: 'Identificar comercios y empresas sin sitio web o con presencia digital deficiente para ofrecerles páginas web, tiendas online y automatización comercial.',
        palabrasClave: ['página web', 'tienda online', 'e-commerce', 'redes sociales', 'meta ads', 'google ads', 'crm', 'software a medida'],
        criteriosICP: { tipo: 'Empresas B2B y Comercios', antiguedadMinima: '1 año', empleadosMinimos: 3 }
      }
    },
    {
      slug: 'azuchel',
      nombre: 'Azuchel - Regalos & Merchandising Corporativo',
      descripcion: 'Tienda de regalos personalizados (B2C) y producción de material POP, stickers y box de regalos para empresas (B2B).',
      shortCode: 'AZU',
      colorPrimario: '#10b981',
      colorSecundario: '#059669',
      tipoModelo: 'HIBRIDO',
      modeloPrincipal: 'MOD-REG-01',
      subModelo: 'SUB-REG-B2B',
      nicho: 'NICH-REG-CORP',
      canalesVenta: ['B2C', 'B2B', 'WHATSAPP_MASIVO', 'EMAIL_CATALOGO_PDF'],
      bridgeConfig: { eOmniSyncUrl: '', syncToken: '', autoTransplant: false, activeStoreId: 'azuchel-regalos' },
      moneda: 'ARS',
      defaultPass: 'azuchel123',
      aliasSuffix: 'azuchel',
      domain: 'azuchel.com',
      aiConfig: {
        nichoId: 'REGALOS_MERCHANDISING_AZUCHEL',
        nombreAgente: 'Asesor Corporativo Azuchel',
        tono: 'Elegante, Creativo, Cálido y Enfocado en Branding de Empresas',
        directivaSistema: 'Captar empresas, departamentos de RRHH y agencias para ofrecerles material POP, stickers promocionales, regalos de fin de año y kits de onboarding para colaboradores.',
        palabrasClave: ['regalo corporativo', 'merchandising', 'material pop', 'stickers', 'box de regalo', 'kit de bienvenida', 'onboarding', 'branding'],
        criteriosICP: { tipo: 'Empresas Medianas y Grandes / RRHH', empleadosMinimos: 15 }
      }
    },
    {
      slug: 'golocinas',
      nombre: 'Golocinas - Distribución Mayorista & Snacks',
      descripcion: 'Distribución mayorista de golosinas, chocolates, galletas y snacks con ruteo geolocalizado en terreno.',
      shortCode: 'GLC',
      colorPrimario: '#2563eb',
      colorSecundario: '#1d4ed8',
      tipoModelo: 'FISICO_TERRENO',
      modeloPrincipal: 'MOD-DIST-01',
      subModelo: 'SUB-DIST-TERRENO',
      nicho: 'NICH-DIST-GOLOSINAS',
      canalesVenta: ['TERRENO', 'WHATSAPP_PRECIOS', 'VISITA_PREVENTISTA'],
      bridgeConfig: { eOmniSyncUrl: '', syncToken: '', autoTransplant: false, activeStoreId: 'golocinas-mayorista' },
      moneda: 'ARS',
      defaultPass: 'golocinas123',
      aliasSuffix: 'golocinas',
      domain: 'golocinas.com',
      aiConfig: {
        nichoId: 'CONSUMO_MASIVO_GOLOCINAS',
        nombreAgente: 'Coordinador de Prospección Golocinas',
        tono: 'Ágil, Comercial, Directo y Enfocado en Precios por Bulto',
        directivaSistema: 'Geolocalizar comercios minoristas (kioscos, maxikioscos, autoservicios, almacenes) para armar rutas de visitas a preventistas de calle con listas de precios mayoristas.',
        palabrasClave: ['golosinas', 'chocolates', 'galletitas', 'kiosco', 'mayorista', 'bulto cerrado', 'distribuidora', 'reparto'],
        criteriosICP: { tipo: 'Comercios minoristas a la calle', ubicacion: 'Zonas 1, 2, 3 y 4' }
      }
    }
  ]

  for (const t of tenantsConfig) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {
        nombre: t.nombre,
        descripcion: t.descripcion,
        shortCode: t.shortCode,
        colorPrimario: t.colorPrimario,
        colorSecundario: t.colorSecundario,
        tipoModelo: t.tipoModelo,
        modeloPrincipal: t.modeloPrincipal,
        subModelo: t.subModelo,
        nicho: t.nicho,
        canalesVenta: t.canalesVenta,
        bridgeConfig: t.bridgeConfig,
        moneda: t.moneda,
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
        modeloPrincipal: t.modeloPrincipal,
        subModelo: t.subModelo,
        nicho: t.nicho,
        canalesVenta: t.canalesVenta,
        bridgeConfig: t.bridgeConfig,
        moneda: t.moneda,
        activo: true
      }
    })
    console.log(`✅ Inquilino listo: ID ${tenant.id} -> ${tenant.nombre} (Modelo: ${tenant.modeloPrincipal})`)

    // Configuración de Agente IA
    if (t.aiConfig) {
      await prisma.agenteIAPromptConfig.upsert({
        where: { tenantId: tenant.id },
        update: {
          nichoId: t.aiConfig.nichoId,
          nombreAgente: t.aiConfig.nombreAgente,
          tono: t.aiConfig.tono,
          directivaSistema: t.aiConfig.directivaSistema,
          palabrasClave: t.aiConfig.palabrasClave,
          criteriosICP: t.aiConfig.criteriosICP,
          activo: true
        },
        create: {
          tenantId: tenant.id,
          nichoId: t.aiConfig.nichoId,
          nombreAgente: t.aiConfig.nombreAgente,
          tono: t.aiConfig.tono,
          directivaSistema: t.aiConfig.directivaSistema,
          palabrasClave: t.aiConfig.palabrasClave,
          criteriosICP: t.aiConfig.criteriosICP,
          activo: true
        }
      })
      console.log(`   🤖 Agente IA listo: ${t.aiConfig.nombreAgente}`)
    }
  }

  console.log('\n🎉 ¡Base de datos Neon 100% sincronizada y funcional!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error durante la sincronización:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
