import { TenantData } from './tenantContext'

export interface TenantTerminology {
  pedidos: string
  pedido: string
  nuevoPedido: string
  empresas: string
  empresa: string
  nuevaEmpresa: string
  ventas: string
  venta: string
  visitas: string
  visita: string
  nuevaVisita: string
  cobranzas: string
  cobranza: string
  productos: string
  producto: string
  planificador: string
  vendedor: string
  vendedores: string
  zona: string
  zonas: string

  // Unidades de Medida y Métricas
  unidadMedida: string
  unidadMedidaSingular: string
  unidadSubItem: string
  unidadSubItemSingular: string

  // Columnas de Listas de Precios y Tablas
  columnaUnidad: string
  columnaPrecioUnitario: string
  columnaPrecioTotal: string

  // Reglas de Volumen y Tarifas
  reglaVolumenMinimo: string
  tarifaMinLabel: string
  tarifaMaxLabel: string
  leyendaIva: string
}

export const LOGISTICA_TERMINOLOGY: TenantTerminology = {
  pedidos: 'Gestión de Pedidos',
  pedido: 'Pedido',
  nuevoPedido: 'Nuevo Pedido',
  empresas: 'Empresas / Comercios',
  empresa: 'Empresa / Comercio',
  nuevaEmpresa: 'Nueva Empresa',
  ventas: 'Ventas & Remitos',
  venta: 'Venta / Remito',
  visitas: 'Visitas en Terreno',
  visita: 'Visita Calle',
  nuevaVisita: 'Registrar Visita',
  cobranzas: 'Cobranzas de Cajas',
  cobranza: 'Cobranza',
  productos: 'Equipos & Productos',
  producto: 'Equipo / Caja',
  planificador: 'Hoja de Ruta',
  vendedor: 'Vendedor',
  vendedores: 'Fuerza de Ventas',
  zona: 'Zona de Distribución',
  zonas: 'Zonas de Calle',

  unidadMedida: 'Cajas',
  unidadMedidaSingular: 'Caja',
  unidadSubItem: 'Paquetes',
  unidadSubItemSingular: 'Paquete',

  columnaUnidad: 'Paq / Caja',
  columnaPrecioUnitario: 'Precio Paq',
  columnaPrecioTotal: 'Total Caja c/IVA',

  reglaVolumenMinimo: 'Mínimo de Cajas para Tarifa por Volumen',
  tarifaMinLabel: 'Lista B (- 300 cajas)',
  tarifaMaxLabel: 'Lista A (+ 300 cajas)',
  leyendaIva: 'IVA 21% sobre precio de caja'
}

export const AGENCIA_TERMINOLOGY: TenantTerminology = {
  pedidos: 'Servicios & Campañas',
  pedido: 'Servicio / Campaña',
  nuevoPedido: 'Contratar Servicio',
  empresas: 'Clientes & Cuentas PyME',
  empresa: 'Cliente / Cuenta PyME',
  nuevaEmpresa: 'Nuevo Cliente',
  ventas: 'Facturación & Cierres',
  venta: 'Factura / Cierre',
  visitas: 'Reuniones Comerciales',
  visita: 'Reunión Comercial',
  nuevaVisita: 'Agendar Reunión',
  cobranzas: 'Abonos Mensuales (MRR)',
  cobranza: 'Abono / Cuota',
  productos: 'Servicios de Agencia',
  producto: 'Servicio Digital',
  planificador: 'Planificador de Entregables',
  vendedor: 'Ejecutivo de Cuentas',
  vendedores: 'Ejecutivos Comerciales',
  zona: 'Zona Comercial',
  zonas: 'Zonas Comerciales',

  unidadMedida: 'Servicios / Horas',
  unidadMedidaSingular: 'Servicio / Proyecto',
  unidadSubItem: 'Entregables / Módulos',
  unidadSubItemSingular: 'Entregable',

  columnaUnidad: 'Modalidad / Alcance',
  columnaPrecioUnitario: 'Tarifa Base',
  columnaPrecioTotal: 'Precio Servicio c/IVA',

  reglaVolumenMinimo: 'Mínimo de Unidades / Horas para Tarifa Preferencial',
  tarifaMinLabel: 'Tarifa Estándar',
  tarifaMaxLabel: 'Tarifa Corporativa / Escala',
  leyendaIva: 'Precios c/IVA · Impuestos incluidos'
}

export const ECOMMERCE_TERMINOLOGY: TenantTerminology = {
  pedidos: 'Órdenes de Compra',
  pedido: 'Orden de Compra',
  nuevoPedido: 'Nueva Orden',
  empresas: 'Clientes & Compradores',
  empresa: 'Cliente / Comprador',
  nuevaEmpresa: 'Registrar Comprador',
  ventas: 'Ventas Online',
  venta: 'Venta Online',
  visitas: 'Contactos & Consultas',
  visita: 'Consulta Web',
  nuevaVisita: 'Registrar Contacto',
  cobranzas: 'Cobranzas & Pasarelas',
  cobranza: 'Cobro de Orden',
  productos: 'Catálogo de Artículos',
  producto: 'Artículo / SKU',
  planificador: 'Planificador de Despachos',
  vendedor: 'Agente de Soporte / Ventas',
  vendedores: 'Equipo de Soporte',
  zona: 'Región de Envío',
  zonas: 'Regiones de Entrega',

  unidadMedida: 'Unidades / Bultos',
  unidadMedidaSingular: 'Unidad / SKU',
  unidadSubItem: 'Unidades por Empaque',
  unidadSubItemSingular: 'Unidad',

  columnaUnidad: 'Unid / Bulto',
  columnaPrecioUnitario: 'Precio Unitario',
  columnaPrecioTotal: 'Total Mayorista c/IVA',

  reglaVolumenMinimo: 'Mínimo de Unidades para Tarifa Mayorista',
  tarifaMinLabel: 'Tarifa Minorista',
  tarifaMaxLabel: 'Tarifa Mayorista / Distribuidor',
  leyendaIva: 'Precios con IVA incluido'
}

export function getTenantTerminology(tenant: TenantData | null | undefined): TenantTerminology {
  if (!tenant) return LOGISTICA_TERMINOLOGY

  // 1. Si el tenant tiene terminología personalizada en base de datos
  if (tenant.terminologia && typeof tenant.terminologia === 'object') {
    const base = (tenant.tipoModelo === 'SERVICIOS_DIGITALES' || tenant.slug?.includes('publicidad') || tenant.slug?.includes('web'))
      ? AGENCIA_TERMINOLOGY
      : (tenant.tipoModelo as string) === 'ECOMMERCE'
      ? ECOMMERCE_TERMINOLOGY
      : LOGISTICA_TERMINOLOGY

    return {
      ...base,
      ...(tenant.terminologia as Record<string, string>)
    }
  }

  // 2. Por tipo de modelo
  if (tenant.tipoModelo === 'SERVICIOS_DIGITALES' || tenant.slug?.includes('publicidad') || tenant.slug?.includes('web')) {
    return AGENCIA_TERMINOLOGY
  }

  if ((tenant.tipoModelo as string) === 'ECOMMERCE') {
    return ECOMMERCE_TERMINOLOGY
  }

  return LOGISTICA_TERMINOLOGY
}
