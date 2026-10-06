/**
 * OmniSync Cognitive Business Architecture & Niche Master Engine
 * Sincronizado con el catálogo de E-OmniSync (Modelo -> Sub-Modelo -> Nicho)
 */

export interface MasterSpecialty {
  code: string
  key: string
  name: string
  description: string
  emoji?: string
  templateId?: string
  color?: string
  activeModules?: string[]
  canalesSugeridos?: string[]
  perfilBusquedaIA?: {
    rubrosObjetivo: string[]
    palabrasClaveMaps: string[]
    criteriosICP: string
    ejemploMensajeWhatsApp: string
    ejemploPropuestaEmail: string
  }
  terminology?: {
    catalog: string
    service: string
    ticket: string
    budget: string
    vehicle: string
    customer: string
    mainAction: string
    secondaryAction: string
  }
}

export interface MasterSubModel {
  code: string
  key: string
  name: string
  description: string
  canal: 'B2B' | 'B2C' | 'TERRENO' | 'HIBRIDO'
  iconName?: string
  specialties: MasterSpecialty[]
}

export interface MasterBusinessModel {
  code: string
  key: string
  name: string
  category: string
  color: string
  description: string
  iconName?: string
  templateId?: string
  sampleCategories: string[]
  subModels: MasterSubModel[]
}

// ============================================================================
// MODELOS MAESTROS DE LA PLATAFORMA (TAXONOMÍA DE 3 NIVELES)
// ============================================================================
export const MASTER_BUSINESS_MODELS: MasterBusinessModel[] = [
  // ── 1. AGENCIA DE MARKETING DIGITAL, SOFTWARE & SOLUCIONES IA (VENTAS.VS) ──
  {
    code: 'MOD-MKT-01',
    key: 'agencia_marketing',
    name: 'Agencia de Marketing Digital, Software & Soluciones IA',
    category: 'Servicios Profesionales & Marketing',
    color: '#7c3aed',
    description: 'Plataforma para agencias de publicidad, desarrollo web, consultoría B2B, marketing digital y sistemas ERP.',
    sampleCategories: [
      'Desarrollo Web & Landing Pages',
      'Community Management & Redes',
      'Pauta Publicitaria Meta & Google Ads',
      'Implementación de ERP & Automatización CRM'
    ],
    subModels: [
      {
        code: 'SUB-MKT-B2B',
        key: 'servicios_b2b_retainers',
        name: 'Servicios B2B Recurrentes & Retainers',
        description: 'Gestión de abonos mensuales para empresas, creación de contenido y administración de pauta.',
        canal: 'B2B',
        specialties: [
          {
            code: 'NICH-MKT-GROWTH',
            key: 'agencia_growth_web',
            name: 'Agencia de Crecimiento Comercial & Desarrollo Web',
            description: 'Especializada en captar comercios para diseñarles páginas web, tiendas online y automatizaciones.',
            emoji: '💻',
            color: '#7c3aed',
            canalesSugeridos: ['B2B', 'WHATSAPP_CORP', 'EMAIL_PROPOSAL'],
            perfilBusquedaIA: {
              rubrosObjetivo: ['Comercios locales', 'Empresas de servicios', 'Profesionales', 'Inmobiliarias', 'Consultoras'],
              palabrasClaveMaps: ['distribuidora', 'estudio contable', 'fabrica', 'clinica', 'tienda de ropa'],
              criteriosICP: 'Negocios con más de 2 años de actividad que no tengan sitio web o cuyo sitio no esté adaptado a móviles.',
              ejemploMensajeWhatsApp: 'Hola {contacto}, vimos tu negocio {empresa} en Maps y notamos que no tienen su tienda digital activa. Desarrollamos plataformas con cobro y WhatsApp automático para triplicar pedidos.',
              ejemploPropuestaEmail: 'Estimado equipo de {empresa}, realizamos una auditoría de su presencia online y detectamos 3 oportunidades clave de captación de clientes.'
            }
          }
        ]
      },
      {
        code: 'SUB-MKT-CUSTOM',
        key: 'desarrollo_software_medida',
        name: 'Desarrollo de Software & Soluciones Cloud',
        description: 'Sistemas a medida, integraciones de API y arquitectura multitenant.',
        canal: 'B2B',
        specialties: [
          {
            code: 'NICH-MKT-SAAS',
            key: 'implementacion_erp_saas',
            name: 'Implementación de Sistemas ERP & CRM de Ventas',
            description: 'Venta de licencias y personalización del motor OmniSync para distribuidoras y cadenas comerciales.',
            emoji: '🚀',
            color: '#6d28d9',
            canalesSugeridos: ['B2B', 'DEMO_DIRECTA']
          }
        ]
      }
    ]
  },

  // ── 2. TIENDA DE REGALOS, MERCHANDISING & PACKAGING CORPORATIVO (AZUCHEL) ──
  {
    code: 'MOD-REG-01',
    key: 'regalos_merchandising',
    name: 'Tienda de Regalos, Merchandising & Detalles Personalizados',
    category: 'Comercio Especializado & Regalos',
    color: '#10b981',
    description: 'Comercialización de regalos para público general y canal corporativo B2B de material POP, packaging y cajas de regalo para empresas.',
    sampleCategories: [
      'Box de Regalos Corporativos & Fin de Año',
      'Material POP & Stickers Promocionales',
      'Tazas, Termos & Botellas Grabadas',
      'Papelería Fina, Tarjetería & Packaging de Marca',
      'Regalos Personalizados para Eventos & Ocasiones'
    ],
    subModels: [
      {
        code: 'SUB-REG-B2C',
        key: 'tienda_regalos_b2c',
        name: 'Tienda de Regalos & Ocasiones (B2C)',
        description: 'Venta directa a personas: cumpleaños, aniversarios, días festivos y regalos personalizados.',
        canal: 'B2C',
        specialties: [
          {
            code: 'NICH-REG-INDIV',
            key: 'regalos_personalizados_retail',
            name: 'Regalos Personalizados & Tienda de Ocasión',
            description: 'Box de bombones, tazas con foto, globos temáticos y packaging artesanal.',
            emoji: '🎁',
            color: '#10b981'
          }
        ]
      },
      {
        code: 'SUB-REG-B2B',
        key: 'merchandising_corporativo_b2b',
        name: 'Merchandising, Material POP & Regalos para Empresas (B2B)',
        description: 'Captación de corporativos: bienvenida de empleados (onboarding kits), fin de año, congresos y branding.',
        canal: 'B2B',
        specialties: [
          {
            code: 'NICH-REG-CORP',
            key: 'material_pop_cajas_corporativas',
            name: 'Material POP, Stickers & Box de Regalos Empresariales',
            description: 'Producción de kits de marca corporativos, stickers de alto impacto, regalos premium de fin de año.',
            emoji: '🏢',
            color: '#059669',
            canalesSugeridos: ['B2B', 'WHATSAPP_MASIVO', 'EMAIL_CATALOGO_PDF'],
            perfilBusquedaIA: {
              rubrosObjetivo: ['Empresas de tecnología', 'Bancos y financieras', 'Consultoras', 'Laboratorios', 'Agencias de RRHH', 'Colegios y Universidades'],
              palabrasClaveMaps: ['oficinas corporativas', 'recursos humanos', 'software factory', 'sanatorio', 'colegio privado'],
              criteriosICP: 'Empresas con más de 20 colaboradores con necesidad de merchandising de marca y regalos de fin de año / aniversarios.',
              ejemploMensajeWhatsApp: 'Hola {contacto}, en Azuchel diseñamos kits de bienvenida y regalos corporativos personalizados para empresas como {empresa}. ¿Te comparto nuestro catálogo B2B 2026 en PDF?',
              ejemploPropuestaEmail: 'Estimado/a {contacto} (Equipo de Personas & RRHH de {empresa}), acercamos nuestra propuesta de Kits Corporativos y Material POP exclusivo con su identidad de marca.'
            }
          }
        ]
      }
    ]
  },

  // ── 3. DISTRIBUCIÓN MAYORISTA & CONSUMO MASIVO (GOLOCINAS) ───────────────
  {
    code: 'MOD-DIST-01',
    key: 'consumo_masivo_golosinas',
    name: 'Distribución Mayorista de Golosinas, Snacks & Consumo Masivo',
    category: 'Consumo Masivo & Logística Terreno',
    color: '#2563eb',
    description: 'Preventa y distribución de productos alimenticios, golosinas, chocolates, galletas y bebidas en calle mediante geolocalización y 4 zonas de entrega.',
    sampleCategories: [
      'Chocolates & Bombones por Bulto',
      'Caramelos, Chupetines & Gomitas',
      'Galletitas Dulces & Saladas',
      'Alfajores & Barras de Cereal',
      'Snacks Salados & Bebidas'
    ],
    subModels: [
      {
        code: 'SUB-DIST-TERRENO',
        key: 'preventa_calle_distribuidoras',
        name: 'Preventa en Terreno & Ruteo Geográfico',
        description: 'Fuerza de ventas en calle equipada con catálogo móvil, geolocalización de clientes y toma de pedidos offline.',
        canal: 'TERRENO',
        specialties: [
          {
            code: 'NICH-DIST-GOLOSINAS',
            key: 'distribucion_kioscos_autoservicios',
            name: 'Distribución Mayorista de Golosinas, Galletas & Chocolates',
            description: 'Abastecimiento continuo a kioscos, maxikioscos, autoservicios, almacenes y minimercados zonales.',
            emoji: '🍬',
            color: '#2563eb',
            canalesSugeridos: ['TERRENO', 'WHATSAPP_PRECIOS', 'VISITA_PREVENTISTA'],
            perfilBusquedaIA: {
              rubrosObjetivo: ['Kioscos 24hs', 'Maxikioscos', 'Autoservicios', 'Almacenes de barrio', 'Estaciones de servicio', 'Dietéticas'],
              palabrasClaveMaps: ['kiosco', 'maxikiosco', 'autoservicio', 'golosineria', 'minimarket'],
              criteriosICP: 'Comercios a la calle con venta minorista de golosinas y snacks dentro de las 4 zonas de reparto.',
              ejemploMensajeWhatsApp: 'Hola {empresa}! Te escribe el preventista de Golocinas en tu zona. Te dejamos la lista de precios mayorista de chocolates y galletitas con entrega en 24hs.',
              ejemploPropuestaEmail: 'Lista de Precios Mayorista Golocinas - Ofertas en bultos cerrados para {empresa}.'
            }
          }
        ]
      }
    ]
  }
]

// ============================================================================
// PERFILES COGNITIVOS PARA EL AGENTE IA (PROMPT DIRECTIVES)
// ============================================================================
export interface NicheCognitiveProfile {
  nichoId: string
  nombre: string
  tono: string
  keywords: string[]
  directivaSistema: string
  guardrails: string[]
}

export const NICHE_COGNITIVE_PROFILES: Record<string, NicheCognitiveProfile> = {
  'REGALOS_MERCHANDISING_AZUCHEL': {
    nichoId: 'REGALOS_MERCHANDISING_AZUCHEL',
    nombre: 'Asesor Corporativo de Merchandising & Regalos Azuchel',
    tono: 'Elegante, creativo, cálido, profesional y enfocado en el impacto de marca y satisfacción del cliente.',
    keywords: ['regalo', 'corporativo', 'merchandising', 'material pop', 'stickers', 'box de regalo', 'kit de bienvenida', 'onboarding', 'fin de año', 'branding'],
    directivaSistema: `Eres el Asesor Comercial Senior B2B y Diseñador de Soluciones de Marca de Azuchel.
Tu misión es identificar empresas, agencias y pymes que requieran:
1. Regalos corporativos de fin de año o aniversarios.
2. Material POP promocional (stickers en vinilo, packaging con logo, exhibidores).
3. Kits de onboarding para empleados nuevos.
Destacas siempre la calidad del detalle, la personalización 100% con logo de la empresa y la puntualidad de entrega en packaging premium.
Nunca ofreces productos ajenos a papelería, regalos, tazas, botellas térmicas, stickers, textiles y cajas de regalo corporativas.`,
    guardrails: [
      'No inventar precios de productos sin catálogo oficial.',
      'Verificar siempre que el número telefónico incluya código de área internacional antes de guardarlo.',
      'No ofrecer servicios de consultoría de software ni productos alimenticios perecederos sin empaque.'
    ]
  },

  'CONSUMO_MASIVO_GOLOCINAS': {
    nichoId: 'CONSUMO_MASIVO_GOLOCINAS',
    nombre: 'Coordinador de Prospección Mayorista Golocinas',
    tono: 'Ágil, comercial, directo, enfocado en precios por bulto, margen para el comerciante y rapidez de entrega.',
    keywords: ['golosinas', 'chocolates', 'galletitas', 'chupetines', 'caramelos', 'kiosco', 'mayorista', 'bulto', 'reparto 24hs', 'preventa'],
    directivaSistema: `Eres el Coordinador de Inteligencia Comercial de Golocinas.
Tu misión es geolocalizar y contactar comercios minoristas (kioscos, autoservicios, almacenes y minimarkets) en las 4 zonas de reparto.
Tu propuesta de valor es:
1. Precios directos de fábrica por bulto cerrado.
2. Reparto programado en 24/48hs sin costo en la zona.
3. Flexibilidad de pago para clientes habituales.
Generas rutas claras y datos de contacto precisos para que los preventistas de calle visiten el comercio con el catálogo en mano.`,
    guardrails: [
      'Asegurarse de clasificar la dirección dentro de la Zona 1, 2, 3 o 4.',
      'Descartar empresas que no sean comercios o distribuidoras alimenticias.',
      'Priorizar comercios con número de WhatsApp activo.'
    ]
  },

  'AGENCIA_MARKETING_VENTASVS': {
    nichoId: 'AGENCIA_MARKETING_VENTASVS',
    nombre: 'Director de Crecimiento & Consultor Digital Ventas.VS',
    tono: 'Estratégico, persuasivo, orientado a retorno de inversión (ROI), tecnológico y autoritativo.',
    keywords: ['página web', 'tienda online', 'e-commerce', 'redes sociales', 'meta ads', 'google ads', 'crm', 'software a medida', 'automatización'],
    directivaSistema: `Eres el Director de Desarrollo de Negocios de Ventas.VS.
Tu objetivo es auditar y contactar pymes y comercios que tengan presencia digital deficiente para ofrecerles:
1. Creación de sitios web profesionales y tiendas online de alta conversión.
2. Gestión integral de redes sociales y community management.
3. Campañas de pauta publicitaria en Meta Ads y Google Ads para generar clientes diarios.
4. Implementación de software CRM y sistemas de ventas OmniSync.
Hablas con autoridad comercial, demostrando cómo la digitalización multiplica las ventas y ahorra tiempo operativo.`,
    guardrails: [
      'No prometer ventas mágicas sin pauta o estrategia.',
      'Verificar si el prospecto ya tiene un sitio web activo antes de formular el copy.',
      'Enfocarse en dueños de negocio o tomadores de decisión.'
    ]
  }
}
