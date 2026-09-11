import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'neosol_secret_key_2026'
const SESSION_COOKIE_NAME = 'neosol_session'

export interface UserSession {
  id: number
  alias: string
  email: string
  nombre: string
  nivel: number
  rol: string
  modulos: any
  zona: string | null
  zonasHabilitadas: any
  unidadesNegocio: string[]
  isNivelTodo: boolean
  tenantId?: number | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession
  } catch (error) {
    return null
  }
}

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie || !sessionCookie.value) return null
    const decrypted = verifyToken(sessionCookie.value)
    if (!decrypted) return null

    // Fetch fresh user data from database to prevent stale token redirect loops
    const dbUser = await prisma.usuario.findUnique({
      where: { id: decrypted.id }
    })
    if (!dbUser || !dbUser.activo) return null

    return {
      id: dbUser.id,
      alias: dbUser.alias,
      email: dbUser.email,
      nombre: dbUser.nombre,
      nivel: dbUser.nivel,
      rol: dbUser.rol,
      modulos: dbUser.modulos || {},
      zona: dbUser.zona,
      zonasHabilitadas: dbUser.zonasHabilitadas,
      unidadesNegocio: Array.isArray(dbUser.unidadesNegocio) ? dbUser.unidadesNegocio as string[] : ['Gerencia Comercial'],
      isNivelTodo: dbUser.isNivelTodo,
      tenantId: dbUser.tenantId
    }
  } catch (e) {
    return null
  }
}

export async function registrarAccion(
  usuarioId: number | null,
  usuarioAlias: string,
  tipoAccion: string,
  detalles: string
): Promise<any> {
  try {
    return await prisma.logBitacora.create({
      data: {
        usuarioId,
        usuarioAlias,
        tipoAccion,
        detalles
      }
    })
  } catch (error) {
    console.error("[Bitacora] Error al guardar registro:", error)
  }
}
