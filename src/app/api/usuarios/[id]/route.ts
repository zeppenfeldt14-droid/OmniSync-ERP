import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedTenant, registrarAccion, authErrorResponse } from '@/lib/auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, tenantId } = await getAuthenticatedTenant(request)
    if (session.nivel > 2 && session.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const { id } = await params
    const userId = Number(id)

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID de usuario inválido.' }, { status: 400 })
    }

    // Prevent deleting oneself
    if (userId === session.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propio perfil.' }, { status: 400 })
    }

    const userToDelete = await prisma.usuario.findFirst({
      where: { 
        id: userId,
        tenantId // Estricto: solo eliminar usuario del inquilino autenticado
      }
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuario no encontrado en este inquilino.' }, { status: 404 })
    }

    await prisma.usuario.delete({
      where: { id: userId }
    })

    await registrarAccion(
      session.id,
      session.alias,
      'DELETE_USER',
      `Usuario eliminado en inquilino #${tenantId}: ${userToDelete.nombre} (@${userToDelete.alias})`
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return authErrorResponse(error)
  }
}
