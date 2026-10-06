import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, registrarAccion, authErrorResponse } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// ─── PATCH: Editar producto (Nivel 1 o Super Admin) ──────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN')
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { codigoInterno, nombre, linea, precioPaquete, paqPorCaja, precioCaja, activo } = body

    const existing = await prisma.producto.findFirst({
      where: { id: Number(id), tenantId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado en este inquilino.' }, { status: 404 })
    }

    const producto = await prisma.producto.update({
      where: { id: Number(id) },
      data: {
        ...(codigoInterno !== undefined ? { codigoInterno: codigoInterno.trim() } : {}),
        ...(nombre        !== undefined ? { nombre: nombre.trim() } : {}),
        ...(linea         !== undefined ? { linea } : {}),
        ...(precioPaquete !== undefined ? { precioPaquete: Number(precioPaquete) } : {}),
        ...(paqPorCaja    !== undefined ? { paqPorCaja: Number(paqPorCaja) } : {}),
        ...(precioCaja    !== undefined ? { precioCaja: Number(precioCaja) } : {}),
        ...(activo        !== undefined ? { activo: Boolean(activo) } : {}),
      },
    })

    await registrarAccion(
      session.id, session.alias,
      'UPDATE_PRODUCTO',
      `Producto ${producto.codigoInterno} - ${producto.nombre} actualizado [Tenant #${tenantId}]`
    )

    return NextResponse.json({ success: true, producto })
  } catch (error: any) {
    if (error.code === 'P2002')
      return NextResponse.json({ error: 'El código ya existe en otro producto de este inquilino.' }, { status: 400 })
    return authErrorResponse(error)
  }
}

// ─── DELETE: Desactivar producto (soft delete) ───────────────────────────────
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN')
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    const { id } = await params
    const existing = await prisma.producto.findFirst({
      where: { id: Number(id), tenantId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado en este inquilino.' }, { status: 404 })
    }

    const producto = await prisma.producto.update({
      where: { id: Number(id) },
      data: { activo: false },
    })

    await registrarAccion(
      session.id, session.alias,
      'DELETE_PRODUCTO',
      `Producto ${producto.codigoInterno} desactivado [Tenant #${tenantId}]`
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
