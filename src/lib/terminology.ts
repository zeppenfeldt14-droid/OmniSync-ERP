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
  zonas: 'Zonas de Calle'
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
  zonas: 'Zonas Comerciales'
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
  zonas: 'Regiones de Entrega'
}

export function getTenantTerminology(tenant: TenantData | null | undefined): TenantTerminology {
  if (!tenant) return LOGISTICA_TERMINOLOGY

  // 1. Si el tenant tiene terminología personalizada en base de datos
  if (tenant.terminologia && typeof tenant.terminologia === 'object') {
    return {
      ...LOGISTICA_TERMINOLOGY,
      ...(tenant.terminologia as Record<string, string>)
    }
  }

  // 2. Por tipo de modelo
  if (tenant.tipoModelo === 'SERVICIOS_DIGITALES' || tenant.slug.includes('publicidad') || tenant.slug.includes('web')) {
    return AGENCIA_TERMINOLOGY
  }

  if ((tenant.tipoModelo as string) === 'ECOMMERCE') {
    return ECOMMERCE_TERMINOLOGY
  }

  return LOGISTICA_TERMINOLOGY
}
