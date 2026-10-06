import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tenantIdParam = searchParams.get('tenantId')
    const tenantSlugParam = searchParams.get('tenantSlug')
    const estadoParam = searchParams.get('estado')
    const search = searchParams.get('search') || ''

    const where: any = {}

    // Resolver inquilino
    if (tenantIdParam) {
      where.tenantId = Number(tenantIdParam)
    } else if (tenantSlugParam) {
      const t = await prisma.tenant.findUnique({ where: { slug: tenantSlugParam } })
      if (t) where.tenantId = t.id
    } else if (user.tenantId && user.nivel !== 1) {
      where.tenantId = user.tenantId
    }

    if (estadoParam && estadoParam !== 'ALL') {
      where.estado = estadoParam
    }

    if (search.trim()) {
      where.OR = [
        { empresa: { contains: search, mode: 'insensitive' } },
        { contacto: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } },
        { rubro: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [leads, stats] = await Promise.all([
      prisma.leadProspecto.findMany({
        where,
        orderBy: [{ scoreMadurez: 'desc' }, { creadoEn: 'desc' }],
        take: 100,
        include: {
          tenant: {
            select: { id: true, nombre: true, slug: true, colorPrimario: true }
          }
        }
      }),
      prisma.leadProspecto.groupBy({
        by: ['estado'],
        where: where.tenantId ? { tenantId: where.tenantId } : {},
        _count: { _all: true }
      })
    ])

    const counts: Record<string, number> = {
      TOTAL: 0,
      NUEVO: 0,
      VALIDADO: 0,
      EN_CAMPANA: 0,
      MADURO: 0,
      TRASPLANTADO: 0,
      CONVERTIDO_CLIENTE: 0,
      DESCARTADO: 0
    }

    stats.forEach(s => {
      counts[s.estado] = s._count._all
      counts.TOTAL += s._count._all
    })

    return NextResponse.json({
      leads,
      counts
    })
  } catch (error: any) {
    console.error('Error en GET /api/leads:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { id, estado, scoreMadurez, notas, accion } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de lead requerido' }, { status: 400 })
    }

    const lead = await prisma.leadProspecto.findUnique({ where: { id: Number(id) } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    }

    // ACCIÓN ESPECIAL: CONVERTIR EN EMPRESA / CLIENTE IN-HOUSE EN EL ERP
    if (accion === 'CONVERTIR_EN_EMPRESA') {
      const nuevaEmpresa = await prisma.empresa.create({
        data: {
          tenantId: lead.tenantId,
          nombre: lead.empresa,
          responsable: lead.contacto,
          telefono: lead.whatsapp || lead.telefono,
          email: lead.email,
          direccion: lead.direccion,
          sitioWebActual: lead.sitioWeb,
          instagram: lead.instagram,
          facebook: lead.facebook,
          googleMaps: lead.googleMapsUrl,
          zona: lead.zona || 'Zona 1',
          rubro: lead.rubro,
          estado: 'activo',
          potencialCierre: 'alto',
          etapaEmbudo: 'cerrado',
          notas: `Convertido automáticamente desde la Granja de Prospección IA. Diagnóstico: ${lead.diagnosticoIA || 'Lead validado'}`
        }
      })

      const updated = await prisma.leadProspecto.update({
        where: { id: lead.id },
        data: {
          estado: 'CONVERTIDO_CLIENTE',
          scoreMadurez: 100,
          convertidoEmpresaId: nuevaEmpresa.id
        }
      })

      return NextResponse.json({
        success: true,
        mensaje: `Lead convertido en Empresa cliente ID #${nuevaEmpresa.id}`,
        empresa: nuevaEmpresa,
        lead: updated
      })
    }

    // Actualización regular de estado / score
    const updated = await prisma.leadProspecto.update({
      where: { id: lead.id },
      data: {
        estado: estado || lead.estado,
        scoreMadurez: scoreMadurez !== undefined ? Number(scoreMadurez) : lead.scoreMadurez,
        notas: notas !== undefined ? notas : lead.notas
      }
    })

    return NextResponse.json({ success: true, lead: updated })
  } catch (error: any) {
    console.error('Error en PATCH /api/leads:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
