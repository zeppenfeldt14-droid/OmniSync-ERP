import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const logs = await prisma.logBitacora.findMany({
      take: 50,
      orderBy: { creadoEn: 'desc' }
    }).catch(() => [])

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error('Error en GET /api/super-admin/audit:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
