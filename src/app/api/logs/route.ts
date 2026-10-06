import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'audit' (gestion) or 'connection' (conexiones)

    // Build query conditions
    const where: any = {}

    // Security scope por inquilino y nivel
    if (session.tenantId) {
      const tenantUsers = await prisma.usuario.findMany({
        where: { tenantId: session.tenantId },
        select: { id: true }
      })
      const tenantUserIds = tenantUsers.map(u => u.id)

      if (session.nivel > 1) {
        where.usuarioId = session.id
      } else {
        where.usuarioId = { in: tenantUserIds }
      }
    } else if (session.nivel > 1) {
      where.usuarioId = session.id
    }

    if (type === 'audit') {
      where.tipoAccion = {
        notIn: ['LOGIN', 'LOGOUT', 'HEARTBEAT', 'FIN_JORNADA', 'AUSENCIA_COMIDA', 'AUSENCIA_BANO', 'AUSENCIA_GESTION', 'AUSENCIA_CURSO']
      }
    } else if (type === 'connection') {
      where.tipoAccion = {
        in: ['LOGIN', 'LOGOUT', 'HEARTBEAT', 'FIN_JORNADA', 'AUSENCIA_COMIDA', 'AUSENCIA_BANO', 'AUSENCIA_GESTION', 'AUSENCIA_CURSO']
      }
    }

    const logs = await prisma.logBitacora.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      take: 1000
    })

    const formattedLogs = logs.map(l => ({
      id: l.id,
      user_id: l.usuarioId,
      user_name: l.usuarioAlias,
      user_alias: l.usuarioAlias,
      action_type: l.tipoAccion,
      details: l.detalles,
      created_at: l.creadoEn.toISOString()
    }))

    return NextResponse.json(formattedLogs)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
