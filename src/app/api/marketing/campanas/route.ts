import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tenantSlug = searchParams.get('tenantSlug')

    let tenantId = user.tenantId
    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      if (tenant) tenantId = tenant.id
    }

    const whereClause: any = {}
    if (tenantId) whereClause.tenantId = tenantId

    const [campanas, totalProspectos, totalMaduros, promptConfig] = await Promise.all([
      prisma.campanaMarketing.findMany({
        where: whereClause,
        orderBy: { creadoEn: 'desc' }
      }),
      prisma.leadProspecto.count({
        where: whereClause
      }),
      prisma.leadProspecto.count({
        where: { ...whereClause, scoreMadurez: { gte: 80 } }
      }),
      tenantId ? prisma.agenteIAPromptConfig.findUnique({ where: { tenantId } }) : null
    ])

    return NextResponse.json({
      campanas,
      metricas: {
        totalCampanas: campanas.length,
        campanasActivas: campanas.filter(c => c.estado === 'EN_EJECUCION').length,
        totalProspectos,
        totalMaduros
      },
      promptConfig
    })
  } catch (error: any) {
    console.error('Error en GET /api/marketing/campanas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      nombre, 
      tipoCanal, 
      nichoObjetivo, 
      mensajeTemplate, 
      tenantSlug 
    } = body

    if (!nombre || !mensajeTemplate) {
      return NextResponse.json({ error: 'El nombre y el mensaje de la campaña son obligatorios' }, { status: 400 })
    }

    let tenantId = user.tenantId
    if (tenantSlug) {
      const t = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      if (t) tenantId = t.id
    }

    // Contar prospectos calificados para esta campaña
    const prospectosCount = await prisma.leadProspecto.count({
      where: {
        tenantId: tenantId || undefined,
        estado: { notIn: ['DESCARTADO', 'CONVERTIDO_CLIENTE'] }
      }
    })

    const campana = await prisma.campanaMarketing.create({
      data: {
        nombre,
        tipoCanal: tipoCanal || 'WHATSAPP',
        nichoObjetivo: nichoObjetivo || 'General',
        mensajeTemplate,
        estado: 'PROGRAMADA',
        totalProspectos: prospectosCount,
        creadoPor: user.alias,
        tenantId: tenantId || null
      }
    })

    return NextResponse.json({
      success: true,
      campana,
      message: `Campaña "${nombre}" programada con éxito con ${prospectosCount} prospectos.`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error en POST /api/marketing/campanas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { id, estado, totalEnviados, totalRespondidos } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de campaña requerido' }, { status: 400 })
    }

    const dataToUpdate: any = {}
    if (estado) dataToUpdate.estado = estado
    if (typeof totalEnviados === 'number') dataToUpdate.totalEnviados = totalEnviados
    if (typeof totalRespondidos === 'number') dataToUpdate.totalRespondidos = totalRespondidos

    const updated = await prisma.campanaMarketing.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    })

    return NextResponse.json({ success: true, campana: updated })
  } catch (error: any) {
    console.error('Error en PATCH /api/marketing/campanas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
