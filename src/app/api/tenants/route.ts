import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const INITIAL_TENANTS = [
  {
    id: 1,
    slug: 'golocinas',
    nombre: 'Golocinas',
    descripcion: 'Distribución mayorista, consumo masivo, ruteo geolocalizado y venta en terreno.',
    shortCode: 'GLC',
    colorPrimario: '#2563eb',
    colorSecundario: '#1d4ed8',
    tipoModelo: 'FISICO_TERRENO',
    moneda: 'ARS',
    configuracion: { permiteVisitas: true, permiteGeolocalizacion: true, tieneLogistica: true },
    activo: true,
  },
  {
    id: 2,
    slug: 'ventas-vs',
    nombre: 'Ventas.VS - Servicios Comerciales & Digitales',
    descripcion: 'Servicios de marketing, diseño web, desarrollo de software, KPIs y pauta digital.',
    shortCode: 'VVS',
    colorPrimario: '#7c3aed',
    colorSecundario: '#6d28d9',
    tipoModelo: 'SERVICIOS_DIGITALES',
    moneda: 'USD',
    configuracion: { permiteAbonos: true, permiteCotizadorWeb: true, diagnosticoPymes: true },
    activo: true,
  },
  {
    id: 3,
    slug: 'azuchel',
    nombre: 'Azuchel',
    descripcion: 'Venta y distribución mayorista de golosinas y consumo masivo en terreno.',
    shortCode: 'AZU',
    colorPrimario: '#10b981',
    colorSecundario: '#059669',
    tipoModelo: 'FISICO_TERRENO',
    moneda: 'ARS',
    configuracion: { permiteVisitas: true, permiteGeolocalizacion: true, tieneLogistica: true },
    activo: true,
  }
]

export async function GET() {
  try {
    // 1. Migrar vinnaty a ventas-vs si existe
    const vinnatyTenant = await prisma.tenant.findUnique({ where: { slug: 'vinnaty' } })
    if (vinnatyTenant) {
      await prisma.tenant.update({
        where: { id: vinnatyTenant.id },
        data: {
          slug: 'ventas-vs',
          nombre: 'Ventas.VS - Servicios Comerciales & Digitales',
          shortCode: 'VVS',
          colorPrimario: '#7c3aed',
          colorSecundario: '#6d28d9',
          tipoModelo: 'SERVICIOS_DIGITALES',
          moneda: 'USD',
          activo: true
        }
      })
    }

    // 2. Asegurar que los 3 tenants base existan con sus 4 zonas estándar
    for (const t of INITIAL_TENANTS) {
      const existing = await prisma.tenant.findUnique({ where: { slug: t.slug } })
      if (!existing) {
        const created = await prisma.tenant.create({
          data: {
            slug: t.slug,
            nombre: t.nombre,
            descripcion: t.descripcion,
            shortCode: t.shortCode,
            colorPrimario: t.colorPrimario,
            colorSecundario: t.colorSecundario,
            tipoModelo: t.tipoModelo,
            moneda: t.moneda,
            activo: true,
            configuracion: t.configuracion
          }
        })
        const zonasEstandar = [
          { nombre: 'Zona 1', color: '#8b5cf6' },
          { nombre: 'Zona 2', color: '#3b82f6' },
          { nombre: 'Zona 3', color: '#10b981' },
          { nombre: 'Zona 4', color: '#f59e0b' }
        ]
        for (const z of zonasEstandar) {
          await prisma.zona.create({
            data: {
              nombre: z.nombre,
              color: z.color,
              tenantId: created.id,
              barrios: []
            }
          })
        }
      }
    }

    const tenants = await prisma.tenant.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: {
            empresas: true,
            usuarios: true,
            zonas: true
          }
        },
        zonas: {
          select: { id: true, nombre: true, color: true }
        }
      },
      orderBy: { id: 'asc' }
    })

    return NextResponse.json(tenants)
  } catch (error: any) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, slug, descripcion, shortCode, colorPrimario, colorSecundario, tipoModelo, moneda, sheetUrl, terminologia } = body

    if (!nombre || !slug) {
      return NextResponse.json({ error: 'Nombre y slug son requeridos' }, { status: 400 })
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const existing = await prisma.tenant.findUnique({
      where: { slug: cleanSlug }
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una unidad de negocio con ese slug' }, { status: 400 })
    }

    const newTenant = await prisma.tenant.create({
      data: {
        nombre,
        slug: cleanSlug,
        descripcion: descripcion || null,
        shortCode: shortCode || cleanSlug.substring(0, 3).toUpperCase(),
        colorPrimario: colorPrimario || '#2563eb',
        colorSecundario: colorSecundario || '#1d4ed8',
        tipoModelo: tipoModelo || 'SERVICIOS_DIGITALES',
        moneda: moneda || 'USD',
        sheetUrl: sheetUrl || null,
        terminologia: terminologia || null,
        configuracion: {
          permiteAbonos: tipoModelo !== 'FISICO_TERRENO',
          permiteCotizadorWeb: tipoModelo === 'SERVICIOS_DIGITALES',
          permiteVisitas: tipoModelo !== 'SERVICIOS_DIGITALES',
        }
      }
    })

    // Auto-aprovisionar las 4 ZONAS ESTÁNDAR para el nuevo inquilino
    const zonasEstandar = [
      { nombre: 'Zona 1', color: '#8b5cf6' },
      { nombre: 'Zona 2', color: '#3b82f6' },
      { nombre: 'Zona 3', color: '#10b981' },
      { nombre: 'Zona 4', color: '#f59e0b' },
    ]

    for (const z of zonasEstandar) {
      await prisma.zona.create({
        data: {
          nombre: z.nombre,
          color: z.color,
          tenantId: newTenant.id,
          barrios: []
        }
      })
    }

    return NextResponse.json(newTenant, { status: 201 })
  } catch (error: any) {
    console.error('Error creating tenant:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
