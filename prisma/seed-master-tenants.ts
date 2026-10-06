import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando sincronización de Inquilinos, Jerarquías y Claves en OmniSync...')

  // ─── 1. SUPER USUARIO GLOBAL (CENTRO DE MANDO) ──────────────────────────
  console.log('\n👑 Configurando Super Usuario Global (Centro de Mando)...')
  const superPassword = await bcrypt.hash('ElarezMaster2026!', 10)
  
  const superUser = await prisma.usuario.upsert({
    where: { alias: 'Elarez' },
    update: {
      nombre: 'Ernesto Lares (Super Admin)',
      email: 'admin@omnisync.com',
      passwordHash: superPassword,
      rol: 'SUPER_ADMIN',
      nivel: 1,
      tenantId: null, // Nivel global absoluto
      isNivelTodo: true,
      activo: true,
      modulos: {
        inicio: true,
        empresas: true,
        pedidos: true,
        visitas: true,
        planificador: true,
        reportes: true,
        ventas: true,
        cobranzas: true,
        usuarios: true,
        configuracion: true,
        zonas: true
      }
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
      activo: true,
      modulos: {
        inicio: true,
        empresas: true,
        pedidos: true,
        visitas: true,
        planificador: true,
        reportes: true,
        ventas: true,
        cobranzas: true,
        usuarios: true,
        configuracion: true,
        zonas: true
      }
    }
  })
  console.log(`✅ Super Usuario listo: @${superUser.alias} (${superUser.email}) -> ID: ${superUser.id}`)

  // ─── 2. INQUILINOS Y SUS ROLES ──────────────────────────────────────────
  const tenantsConfig = [
    {
      oldSlug: 'vinnaty',
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
      oldSlug: 'azuchel',
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
      oldSlug: 'golocinas',
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

  const modulosEstandar = {
    inicio: true,
    empresas: true,
    visitas: true,
    planificador: true,
    reportes: true,
    pedidos: true,
    ventas: true,
    cobranzas: true,
    usuarios: true,
    configuracion: true,
    zonas: true
  }

  for (const tConf of tenantsConfig) {
    console.log(`\n🏢 Sincronizando Inquilino: ${tConf.nombre} (Slug: /${tConf.slug})...`)

    // Verificar si existe con el slug viejo (ej. vinnaty)
    let tenant = null
    if (tConf.oldSlug && tConf.oldSlug !== tConf.slug) {
      tenant = await prisma.tenant.findUnique({ where: { slug: tConf.oldSlug } })
      if (tenant) {
        console.log(`🔄 Renombrando inquilino previo "${tConf.oldSlug}" -> "${tConf.slug}"...`)
        tenant = await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            slug: tConf.slug,
            nombre: tConf.nombre,
            descripcion: tConf.descripcion,
            shortCode: tConf.shortCode,
            colorPrimario: tConf.colorPrimario,
            colorSecundario: tConf.colorSecundario,
            tipoModelo: tConf.tipoModelo,
            modeloPrincipal: tConf.modeloPrincipal,
            subModelo: tConf.subModelo,
            nicho: tConf.nicho,
            canalesVenta: tConf.canalesVenta,
            bridgeConfig: tConf.bridgeConfig,
            moneda: tConf.moneda,
            activo: true
          }
        })
      }
    }

    if (!tenant) {
      tenant = await prisma.tenant.findUnique({ where: { slug: tConf.slug } })
    }

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          slug: tConf.slug,
          nombre: tConf.nombre,
          descripcion: tConf.descripcion,
          shortCode: tConf.shortCode,
          colorPrimario: tConf.colorPrimario,
          colorSecundario: tConf.colorSecundario,
          tipoModelo: tConf.tipoModelo,
          modeloPrincipal: tConf.modeloPrincipal,
          subModelo: tConf.subModelo,
          nicho: tConf.nicho,
          canalesVenta: tConf.canalesVenta,
          bridgeConfig: tConf.bridgeConfig,
          moneda: tConf.moneda,
          activo: true,
          configuracion: {
            permiteAbonos: tConf.tipoModelo !== 'FISICO_TERRENO',
            permiteCotizadorWeb: tConf.tipoModelo === 'SERVICIOS_DIGITALES',
            permiteVisitas: true,
            permiteGeolocalizacion: true
          }
        }
      })
      console.log(`✨ Inquilino creado: ${tenant.nombre} (ID: ${tenant.id})`)
    } else {
      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          nombre: tConf.nombre,
          descripcion: tConf.descripcion,
          shortCode: tConf.shortCode,
          colorPrimario: tConf.colorPrimario,
          colorSecundario: tConf.colorSecundario,
          tipoModelo: tConf.tipoModelo,
          modeloPrincipal: tConf.modeloPrincipal,
          subModelo: tConf.subModelo,
          nicho: tConf.nicho,
          canalesVenta: tConf.canalesVenta,
          bridgeConfig: tConf.bridgeConfig,
          moneda: tConf.moneda,
          activo: true
        }
      })
      console.log(`✅ Inquilino actualizado: ${tenant.nombre} (ID: ${tenant.id})`)
    }

    // Configuración del Agente IA del Inquilino
    if (tConf.aiConfig) {
      await prisma.agenteIAPromptConfig.upsert({
        where: { tenantId: tenant.id },
        update: {
          nichoId: tConf.aiConfig.nichoId,
          nombreAgente: tConf.aiConfig.nombreAgente,
          tono: tConf.aiConfig.tono,
          directivaSistema: tConf.aiConfig.directivaSistema,
          palabrasClave: tConf.aiConfig.palabrasClave,
          criteriosICP: tConf.aiConfig.criteriosICP,
          activo: true
        },
        create: {
          tenantId: tenant.id,
          nichoId: tConf.aiConfig.nichoId,
          nombreAgente: tConf.aiConfig.nombreAgente,
          tono: tConf.aiConfig.tono,
          directivaSistema: tConf.aiConfig.directivaSistema,
          palabrasClave: tConf.aiConfig.palabrasClave,
          criteriosICP: tConf.aiConfig.criteriosICP,
          activo: true
        }
      })
      console.log(`🤖 Agente IA configurado para ${tenant.nombre}: [${tConf.aiConfig.nombreAgente}]`)
    }

    // ─── 3. ZONAS ESTÁNDAR ──────────────────────────────────────────────────
    const zonasEstandar = [
      { nombre: 'Zona 1', color: '#8b5cf6' },
      { nombre: 'Zona 2', color: '#3b82f6' },
      { nombre: 'Zona 3', color: '#10b981' },
      { nombre: 'Zona 4', color: '#f59e0b' }
    ]

    for (const z of zonasEstandar) {
      const existingZona = await prisma.zona.findFirst({
        where: { tenantId: tenant.id, nombre: z.nombre }
      })
      if (!existingZona) {
        await prisma.zona.create({
          data: {
            nombre: z.nombre,
            color: z.color,
            tenantId: tenant.id,
            barrios: []
          }
        })
      }
    }

    // ─── 4. USUARIOS ESTÁNDAR DEL INQUILINO ─────────────────────────────────
    const tenantPassHash = await bcrypt.hash(tConf.defaultPass, 10)
    const equipo = [
      {
        alias: `gerente.${tConf.aliasSuffix}`,
        nombre: `Gerente General (${tConf.shortCode})`,
        email: `gerente@${tConf.domain}`,
        rol: 'ADMIN',
        nivel: 1,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `supervisor.${tConf.aliasSuffix}`,
        nombre: `Supervisor Comercial (${tConf.shortCode})`,
        email: `supervisor@${tConf.domain}`,
        rol: 'SUPERVISOR',
        nivel: 2,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `asistente.${tConf.aliasSuffix}`,
        nombre: `Asistente Operativo (${tConf.shortCode})`,
        email: `asistente@${tConf.domain}`,
        rol: 'ASISTENTE',
        nivel: 2,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `analista.${tConf.aliasSuffix}`,
        nombre: `Analista Comercial & Métricas (${tConf.shortCode})`,
        email: `analista@${tConf.domain}`,
        rol: 'ANALISTA',
        nivel: 4,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `vendedor1.${tConf.aliasSuffix}`,
        nombre: `Vendedor Zona 1 (${tConf.shortCode})`,
        email: `z1@${tConf.domain}`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 1',
        zonasHabilitadas: ['Zona 1'],
        isNivelTodo: false
      },
      {
        alias: `vendedor2.${tConf.aliasSuffix}`,
        nombre: `Vendedor Zona 2 (${tConf.shortCode})`,
        email: `z2@${tConf.domain}`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 2',
        zonasHabilitadas: ['Zona 2'],
        isNivelTodo: false
      },
      {
        alias: `vendedor3.${tConf.aliasSuffix}`,
        nombre: `Vendedor Zona 3 (${tConf.shortCode})`,
        email: `z3@${tConf.domain}`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 3',
        zonasHabilitadas: ['Zona 3'],
        isNivelTodo: false
      },
      {
        alias: `vendedor4.${tConf.aliasSuffix}`,
        nombre: `Vendedor Zona 4 (${tConf.shortCode})`,
        email: `z4@${tConf.domain}`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 4',
        zonasHabilitadas: ['Zona 4'],
        isNivelTodo: false
      }
    ]

    for (const usr of equipo) {
      await prisma.usuario.upsert({
        where: { alias: usr.alias },
        update: {
          nombre: usr.nombre,
          email: usr.email,
          passwordHash: tenantPassHash,
          rol: usr.rol,
          nivel: usr.nivel,
          zona: usr.zona,
          zonasHabilitadas: usr.zonasHabilitadas,
          isNivelTodo: usr.isNivelTodo,
          tenantId: tenant.id,
          activo: true,
          modulos: modulosEstandar
        },
        create: {
          alias: usr.alias,
          nombre: usr.nombre,
          email: usr.email,
          passwordHash: tenantPassHash,
          rol: usr.rol,
          nivel: usr.nivel,
          zona: usr.zona,
          zonasHabilitadas: usr.zonasHabilitadas,
          isNivelTodo: usr.isNivelTodo,
          tenantId: tenant.id,
          activo: true,
          modulos: modulosEstandar
        }
      })
      console.log(`  👤 Usuario listo: @${usr.alias} | Clave: ${tConf.defaultPass} | Rol: ${usr.rol}`)
    }
  }

  console.log('\n🎉 ¡Sincronización Multi-Tenant completada con éxito!')
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
