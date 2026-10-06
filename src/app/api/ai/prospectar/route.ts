import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { ejecutarProspeccionGemini } from '@/lib/ai/geminiProspector'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      tenantSlug, 
      nichoId, 
      zonaGeografica, 
      palabrasClaveExtra = [], 
      limite = 6, 
      guardarDirecto = true 
    } = body

    // Resolver inquilino objetivo
    let targetTenant = null
    if (tenantSlug) {
      targetTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    } else if (user.tenantId) {
      targetTenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
    }

    if (!targetTenant && user.nivel !== 1) {
      return NextResponse.json({ error: 'Inquilino no especificado' }, { status: 400 })
    }

    const effectiveSlug = targetTenant?.slug || 'ventas-vs'

    // Ejecutar prospección inteligente con Gemini + Guardrails
    const resultado = await ejecutarProspeccionGemini({
      tenantSlug: effectiveSlug,
      nichoId: nichoId || (targetTenant?.nicho as string) || undefined,
      zonaGeografica: zonaGeografica || 'CABA y GBA',
      palabrasClaveExtra,
      limite: Number(limite) || 6
    })

    const leadsGuardados: any[] = []

    if (guardarDirecto && targetTenant && resultado.leads.length > 0) {
      for (const lead of resultado.leads) {
        // Verificar si ya existe para evitar duplicados
        const existe = await prisma.leadProspecto.findFirst({
          where: {
            tenantId: targetTenant.id,
            empresa: lead.empresa
          }
        })

        if (!existe) {
          const nuevo = await prisma.leadProspecto.create({
            data: {
              tenantId: targetTenant.id,
              empresa: lead.empresa,
              contacto: lead.contacto,
              cargo: lead.cargo,
              telefono: lead.telefono,
              whatsapp: lead.whatsapp,
              whatsappValidado: Boolean(lead.whatsappValidado),
              email: lead.email,
              emailValidado: Boolean(lead.emailValidado),
              sitioWeb: lead.sitioWeb,
              instagram: lead.instagram,
              facebook: lead.facebook,
              googleMapsUrl: lead.googleMapsUrl,
              direccion: lead.direccion,
              latitud: lead.latitud,
              longitud: lead.longitud,
              zona: lead.zona,
              rubro: lead.rubro,
              nicho: targetTenant.nicho || 'General',
              canalInteres: lead.canalInteres || 'B2B',
              fuente: 'GEMINI_EXPLORER',
              scoreMadurez: lead.scoreMadurez || 30,
              estado: 'VALIDADO',
              notas: lead.notas,
              diagnosticoIA: lead.diagnosticoIA
            }
          })
          leadsGuardados.push(nuevo)
        }
      }
    }

    // Registrar métrica de uso del Agente IA
    if (targetTenant) {
      await prisma.metricaAgenteIA.create({
        data: {
          tenantId: targetTenant.id,
          tipoAccion: 'PROSPECCION_PLACES',
          queryUtilizada: `${effectiveSlug} | ${zonaGeografica} | ${palabrasClaveExtra.join(', ')}`,
          leadsEncontrados: resultado.totalEncontrados,
          leadsValidados: resultado.totalValidados,
          leadsDescartados: resultado.totalDescartados,
          tiempoEjecucionMs: resultado.tiempoEjecucionMs,
          tokensUsados: 1250,
          detalles: {
            resumen: resultado.resumenEjecutivo,
            guardadosEnBd: leadsGuardados.length
          }
        }
      }).catch(err => console.warn('Error guardando métrica:', err))
    }

    return NextResponse.json({
      success: true,
      resultado,
      totalGuardados: leadsGuardados.length,
      leadsGuardados
    })
  } catch (error: any) {
    console.error('Error en POST /api/ai/prospectar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
