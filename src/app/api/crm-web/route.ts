import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const where: any = {}
    if (tenantId) {
      where.tenantId = Number(tenantId)
    }

    const pymes = await prisma.empresa.findMany({
      where,
      include: {
        abonosRecurrentes: true,
        pedidos: {
          orderBy: { creadoEn: 'desc' },
          take: 5
        },
        visitas: {
          orderBy: { fecha: 'desc' },
          take: 3
        }
      },
      orderBy: { actualizadoEn: 'desc' }
    })

    const abonos = await prisma.abonoRecurrente.findMany({
      where: tenantId ? { tenantId: Number(tenantId) } : {},
      include: {
        empresa: {
          select: { id: true, nombre: true, telefono: true, email: true, responsable: true }
        }
      },
      orderBy: { diaCobro: 'asc' }
    })

    const productosServicios = await prisma.producto.findMany({
      where: {
        activo: true,
        ...(tenantId ? { tenantId: Number(tenantId) } : {})
      },
      orderBy: { precioUnitario: 'asc' }
    })

    return NextResponse.json({
      pymes,
      abonos,
      productosServicios
    })
  } catch (error: any) {
    console.error('Error in CRM Web API GET:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'crear_pyme') {
      const {
        nombre,
        rubro,
        responsable,
        telefono,
        email,
        direccion,
        barrio,
        partido,
        sitioWebActual,
        instagram,
        facebook,
        diagnosticoWeb,
        potencialCierre,
        etapaEmbudo,
        notas,
        tenantId,
        vendedorAsignado
      } = body

      const nuevaPyme = await prisma.empresa.create({
        data: {
          nombre,
          rubro: rubro || 'Comercio / PyME',
          responsable: responsable || null,
          telefono: telefono || null,
          email: email || null,
          direccion: direccion || null,
          barrio: barrio || null,
          partido: partido || null,
          sitioWebActual: sitioWebActual || null,
          instagram: instagram || null,
          facebook: facebook || null,
          diagnosticoWeb: diagnosticoWeb || 'Requiere análisis inicial',
          potencialCierre: potencialCierre || 'medio',
          etapaEmbudo: etapaEmbudo || 'prospeccion',
          notas: notas || null,
          vendedorAsignado: vendedorAsignado || 'Comercial Web',
          tenantId: tenantId ? Number(tenantId) : null,
          estado: 'prospecto'
        }
      })

      return NextResponse.json(nuevaPyme, { status: 201 })
    }

    if (action === 'crear_abono') {
      const { empresaId, tenantId, nombreServicio, montoMensual, moneda, diaCobro, frecuencia, notas } = body

      const nuevoAbono = await prisma.abonoRecurrente.create({
        data: {
          empresaId: Number(empresaId),
          tenantId: tenantId ? Number(tenantId) : null,
          nombreServicio: nombreServicio || 'Hosting & Mantenimiento Web',
          montoMensual: parseFloat(montoMensual) || 0,
          moneda: moneda || 'ARS',
          diaCobro: parseInt(diaCobro) || 10,
          frecuencia: frecuencia || 'mensual',
          estado: 'activo',
          notas: notas || null
        }
      })

      return NextResponse.json(nuevoAbono, { status: 201 })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in CRM Web API POST:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, etapaEmbudo, diagnosticoWeb, potencialCierre, notas, sitioWebActual } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de PyME requerido' }, { status: 400 })
    }

    const updated = await prisma.empresa.update({
      where: { id: Number(id) },
      data: {
        ...(etapaEmbudo && { etapaEmbudo }),
        ...(diagnosticoWeb && { diagnosticoWeb }),
        ...(potencialCierre && { potencialCierre }),
        ...(notas !== undefined && { notas }),
        ...(sitioWebActual !== undefined && { sitioWebActual })
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error in CRM Web API PUT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
