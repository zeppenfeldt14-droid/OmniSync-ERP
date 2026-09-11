'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Layers, 
  Sparkles, 
  MapPin, 
  Users, 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  Monitor, 
  ShoppingBag,
  Plus
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface TemplateCard {
  id: string
  key: string
  title: string
  category: string
  icon: any
  badgeColor: string
  accentColor: string
  description: string
  zones: string[]
  catalogSummary: string[]
  rolesSummary: string[]
  terminology: Record<string, string>
}

const TEMPLATES: TemplateCard[] = [
  {
    id: '1',
    key: 'FISICO_TERRENO',
    title: 'Logística en Terreno & Distribución',
    category: 'Ventas de Calle & Preventa',
    icon: Truck,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentColor: '#2563eb',
    description: 'Plantilla de referencia diseñada para distribuidoras con fuerza comercial en la calle. Incluye ruteo georreferenciado, control de stock físico y preventa/cobranzas.',
    zones: ['CABA (Capital Federal)', 'Zona Oeste', 'Zona Sur', 'Zona Norte'],
    catalogSummary: [
      'Equipos y bultos de distribución',
      'Packs de reposición x 24 unidades',
      'Listas de precios A, B y descuentos por volumen'
    ],
    rolesSummary: [
      'Gerente General de Operaciones',
      'Supervisor Comercial',
      'Asistente de Despacho & Facturación',
      'Analista de Ruteo & Cobranzas',
      '4 Vendedores en Terreno asignados a cada zona'
    ],
    terminology: {
      empresas: 'Clientes / Comercios',
      visitas: 'Visitas en Terreno',
      pedidos: 'Pedidos / Preventa',
      cobranzas: 'Cobranzas & Saldos',
      productos: 'Equipos & Productos'
    }
  },
  {
    id: '2',
    key: 'SERVICIOS_DIGITALES',
    title: 'Agencia de Publicidad & Marketing Digital',
    category: 'Servicios Digitales & Cuentas',
    icon: Monitor,
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentColor: '#7c3aed',
    description: 'Plantilla especializada para agencias de publicidad, software factory y marketing digital. Diseñada para gestionar proyectos, consultoría, desarrollo web y abonos mensuales.',
    zones: ['Zona 1 (Comercial)', 'Zona 2 (Corporativo)', 'Zona 3 (Regional)', 'Zona 4 (Expansión)'],
    catalogSummary: [
      'Desarrollo Web Responsive & E-Commerce',
      'Plataformas & Sistemas a Medida',
      'Estrategias de Marketing & KPIs',
      'Gestión de Redes Sociales & Contenido',
      'Campañas de Publicidad Digital (Meta/Google Ads)',
      'Abono Mensual de Servidores & Mantenimiento'
    ],
    rolesSummary: [
      'Gerente General de Agencia',
      'Director Comercial',
      'Project Manager / Asistente Operativo',
      'Analista de Métricas & Growth',
      '4 Ejecutivos de Cuentas asignados a Zona 1..4'
    ],
    terminology: {
      empresas: 'Clientes & Cuentas',
      visitas: 'Reuniones & Pitches',
      pedidos: 'Servicios & Contratos',
      cobranzas: 'Abonos & Cobros',
      productos: 'Servicios Digitales'
    }
  },
  {
    id: '3',
    key: 'ECOMMERCE',
    title: 'E-Commerce B2B & Venta Mayorista',
    category: 'Venta Digital & Despacho',
    icon: ShoppingBag,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
    description: 'Plantilla para distribuidores mayoristas con catálogo online, cotizador de pedidos automáticos y logística de despacho programado con georreferenciación.',
    zones: ['Zona Despacho Norte', 'Zona Despacho Sur', 'Zona Despacho Centro', 'Zona Interior'],
    catalogSummary: [
      'Catálogo con stock en tiempo real y SKU',
      'Precios mayoristas según escala de volumen',
      'Cotizaciones web directas para PyMEs'
    ],
    rolesSummary: [
      'Gerente Comercial B2B',
      'Supervisor de Ventas Online',
      'Operador de Soporte & Despacho',
      'Analista de Conversión & Stock',
      '4 Ejecutivos Comerciales por Zona de entrega'
    ],
    terminology: {
      empresas: 'Compradores Mayoristas',
      visitas: 'Contactos & Seguimiento',
      pedidos: 'Órdenes de Compra',
      cobranzas: 'Pagos & Facturas',
      productos: 'Inventario Mayorista'
    }
  }
]

export default function TemplatesPage() {
  const router = useRouter()

  return (
    <div className="space-y-8 animate-fade-in text-zinc-200">
      {/* ── HEADER ── */}
      <div className="bg-[#0e1017] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-1.5">
              <Layers size={16} /> Arquitectura OmniSync • Plantillas Maestras
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Modelos de Negocio Disponibles
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Catálogo de plantillas maestras preconfiguradas. Al aprovisionar un nuevo inquilino bajo cualquiera de estos modelos, el sistema clona automáticamente 4 zonas estándar, el equipo de 8 roles y su catálogo inicial.
            </p>
          </div>

          <Link
            href="/super-admin/tenants"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Aprovisionar Nuevo Inquilino</span>
          </Link>
        </div>
      </div>

      {/* ── GRID DE PLANTILLAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon

          return (
            <div
              key={tmpl.id}
              className="bg-[#0e1017] border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all group"
            >
              <div className="space-y-5">
                {/* Cabecera Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: tmpl.accentColor }}
                  >
                    <Icon size={24} />
                  </div>
                  <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full border ${tmpl.badgeColor}`}>
                    {tmpl.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                    {tmpl.title}
                  </h3>
                  <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                {/* Zonas Estándar */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                    <MapPin size={12} className="text-indigo-400" />
                    4 Zonas Estándar:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-300 font-medium">
                    {tmpl.zones.map((z, idx) => (
                      <div key={idx} className="truncate bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                        • {z}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equipo Estándar */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                    <Users size={12} className="text-emerald-400" />
                    Equipo Estándar (8 Usuarios):
                  </span>
                  <ul className="text-[11px] text-zinc-400 space-y-1">
                    {tmpl.rolesSummary.map((r, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Catálogo de Soluciones */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                    <Package size={12} className="text-amber-400" />
                    Soluciones en Plantilla:
                  </span>
                  <ul className="text-[11px] text-zinc-400 space-y-1">
                    {tmpl.catalogSummary.map((c, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Terminología Adaptada */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                    Terminología Personalizada:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-400">
                    <div>Empresas: <strong className="text-zinc-200">{tmpl.terminology.empresas}</strong></div>
                    <div>Visitas: <strong className="text-zinc-200">{tmpl.terminology.visitas}</strong></div>
                    <div>Ventas: <strong className="text-zinc-200">{tmpl.terminology.pedidos}</strong></div>
                    <div>Cobranzas: <strong className="text-zinc-200">{tmpl.terminology.cobranzas}</strong></div>
                  </div>
                </div>
              </div>

              {/* Botón Aprovisionar con esta plantilla */}
              <div className="pt-5 border-t border-white/10 mt-5">
                <Link
                  href={`/super-admin/tenants`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-black border border-white/10 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Aprovisionar con este Modelo</span>
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
