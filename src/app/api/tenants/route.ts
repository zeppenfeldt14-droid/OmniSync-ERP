import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const INITIAL_TENANTS = [
  {
    slug: 'equipos-terreno',
    nombre: 'Equipos y Logística en Terreno',
    descripcion: 'Venta presencial de equipos, ruteo geolocalizado y distribución mayorista.',
    shortCode: 'EQP',
    colorPrimario: '#3b82f6',
    colorSecundario: '#1e293b',
    tipoModelo: 'FISICO_TERRENO',
    moneda: 'ARS',
    configuracion: { permiteVisitas: true, permiteGeolocalizacion: true, tieneLogistica: true },
    activo: true,
  },
  {
    slug: 'web-pymes',
    nombre: 'Páginas Web & Soluciones Digitales PyMEs',
    descripcion: 'Desarrollo web, e-commerce, software a medida y abonos mensuales de hosting.',
    shortCode: 'WEB',
    colorPrimario: '#10b981',
    colorSecundario: '#064e3b',
    tipoModelo: 'SERVICIOS_DIGITALES',
    moneda: 'ARS',
    configuracion: { permiteAbonos: true, permiteCotizadorWeb: true, diagnosticoPymes: true },
    activo: true,
  }
]

export async function GET() {
  try {
    let tenants = await prisma.tenant.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' }
    })

    // Seed default tenants if none exist
    if (tenants.length === 0) {
      for (const t of INITIAL_TENANTS) {
        await prisma.tenant.create({
          data: t
        })
      }
      tenants = await prisma.tenant.findMany({
        where: { activo: true },
        orderBy: { id: 'asc' }
      })
    }

    return NextResponse.json(tenants)
  } catch (error: any) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nombre, slug, descripcion, shortCode, colorPrimario, colorSecundario, tipoModelo, moneda, sheetUrl } = body

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
        colorPrimario: colorPrimario || '#3b82f6',
        colorSecundario: colorSecundario || '#1e293b',
        tipoModelo: tipoModelo || 'SERVICIOS_DIGITALES',
        moneda: moneda || 'ARS',
        sheetUrl: sheetUrl || null,
        configuracion: {
          permiteAbonos: tipoModelo !== 'FISICO_TERRENO',
          permiteCotizadorWeb: tipoModelo === 'SERVICIOS_DIGITALES',
          permiteVisitas: tipoModelo !== 'SERVICIOS_DIGITALES',
        }
      }
    })

    // Create default price list for this tenant
    await prisma.listaPrecio.create({
      data: {
        tenantId: newTenant.id,
        nombre: `Lista General - ${newTenant.nombre}`,
        vigenteDesde: new Date(),
        activa: true,
        unidadNegocio: newTenant.nombre,
        sheetUrl: sheetUrl || null,
      }
    })

    return NextResponse.json(newTenant, { status: 201 })
  } catch (error: any) {
    console.error('Error creating tenant:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
