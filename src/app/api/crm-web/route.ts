import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { tenantId } = await getAuthenticatedTenant(req)

    const pymes = await prisma.empresa.findMany({
      where: {
        tenantId
      },
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
      where: {
        tenantId
      },
      include: {
        empresa: {
          select: { id: true, nombre: true, telefono: true, email: true, responsable: true }
        }
      },
      orderBy: { diaCobro: 'asc' }
    })

    const productosServicios = await prisma.producto.findMany({
      where: {
        tenantId,
        activo: true
      },
      orderBy: { precioUnitario: 'asc' }
    })

    return NextResponse.json({
      pymes,
      abonos,
      productosServicios
    })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function POST(req: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(req)
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
          vendedorAsignado: vendedorAsignado || session.alias || 'Comercial Web',
          tenantId, // Forzado al inquilino autenticado
          estado: 'prospecto'
        }
      })

      return NextResponse.json(nuevaPyme, { status: 201 })
    }

    if (action === 'crear_abono') {
      const { empresaId, nombreServicio, montoMensual, moneda, diaCobro, frecuencia, notas } = body

      // Validar que la empresa pertenezca al inquilino
      const emp = await prisma.empresa.findFirst({
        where: { id: Number(empresaId), tenantId }
      })
      if (!emp) {
        return NextResponse.json({ error: 'Empresa no encontrada en este inquilino.' }, { status: 404 })
      }

      const nuevoAbono = await prisma.abonoRecurrente.create({
        data: {
          empresaId: Number(empresaId),
          tenantId,
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
    return authErrorResponse(error)
  }
}

export async function PUT(req: Request) {
  try {
    const { tenantId } = await getAuthenticatedTenant(req)
    const body = await req.json()
    const { id, etapaEmbudo, diagnosticoWeb, potencialCierre, notas, sitioWebActual } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de PyME requerido' }, { status: 400 })
    }

    const current = await prisma.empresa.findFirst({
      where: { id: Number(id), tenantId }
    })
    if (!current) {
      return NextResponse.json({ error: 'Empresa no encontrada en este inquilino.' }, { status: 404 })
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
    return authErrorResponse(error)
  }
}
