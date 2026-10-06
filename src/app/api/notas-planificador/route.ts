import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)

    const { searchParams } = new URL(request.url)
    const zona = searchParams.get('zona')
    const alias = searchParams.get('alias')
    const global = searchParams.get('global')

    if (!zona && !global) {
      return NextResponse.json({ error: 'Zona o flag global requerido' }, { status: 400 })
    }

    const isVendedor = session.nivel === 3
    const userAlias = session.alias

    let whereClause: any = {
      OR: [
        { empresa: { tenantId } },
        { pedido: { tenantId } },
        { empresaId: null, pedidoId: null }
      ]
    }

    if (global === 'true' && alias) {
      whereClause.AND = [
        {
          OR: [
            { destinatario: alias },
            { creadoPor: alias }
          ]
        }
      ]
    } else {
      whereClause.AND = [
        { zona: zona as string },
        ...(isVendedor ? [{ OR: [{ destinatario: userAlias }, { creadoPor: userAlias }] }] : alias ? [{ destinatario: alias }] : [])
      ]
    }

    const notas = await prisma.notaPlanificador.findMany({
      where: whereClause,
      include: {
        empresa: {
          select: { nombre: true, id: true, tenantId: true }
        },
        pedido: {
          select: { numeroPedido: true, id: true, tenantId: true }
        },
        factura: {
          select: { numeroFactura: true, id: true }
        },
        cobranza: {
          select: { id: true, montoOriginal: true, cuota: true, totalCuotas: true }
        }
      },
      orderBy: { creadoEn: 'desc' }
    })

    return NextResponse.json(notas)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    const body = await request.json()
    const { texto, empresaId, destinatario, zona, fechaRecordatorio, pedidoId, facturaId, cobranzaId } = body

    if (!texto || !zona) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    if (empresaId) {
      const emp = await prisma.empresa.findFirst({ where: { id: Number(empresaId), tenantId } })
      if (!emp) return NextResponse.json({ error: 'Empresa no pertenece al inquilino.' }, { status: 404 })
    }

    const newNota = await prisma.notaPlanificador.create({
      data: {
        texto,
        empresaId: empresaId ? parseInt(empresaId) : null,
        pedidoId: pedidoId ? parseInt(pedidoId) : null,
        facturaId: facturaId ? parseInt(facturaId) : null,
        cobranzaId: cobranzaId ? parseInt(cobranzaId) : null,
        destinatario: destinatario || 'personal',
        zona,
        fechaRecordatorio: fechaRecordatorio ? new Date(fechaRecordatorio) : null,
        estado: 'pendiente',
        creadoPor: session.alias
      },
      include: {
        empresa: {
          select: { nombre: true, id: true }
        },
        pedido: {
          select: { numeroPedido: true, id: true }
        },
        factura: {
          select: { numeroFactura: true, id: true }
        },
        cobranza: {
          select: { id: true, montoOriginal: true, cuota: true, totalCuotas: true }
        }
      }
    })

    return NextResponse.json(newNota)
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
