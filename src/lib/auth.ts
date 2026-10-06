import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'neosol_secret_key_2026'
const SESSION_COOKIE_NAME = 'neosol_session'

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

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
  tenantSlug?: string | null
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

    // Fetch fresh user data from database with tenant info
    const dbUser = await prisma.usuario.findUnique({
      where: { id: decrypted.id },
      include: {
        tenant: {
          select: { id: true, slug: true }
        }
      }
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
      tenantId: dbUser.tenantId,
      tenantSlug: dbUser.tenant?.slug || null
    }
  } catch (e) {
    return null
  }
}

/**
 * Exige que el usuario sea Super Admin Global (tenantId: null y nivel 1 / rol SUPER_ADMIN).
 * Lanza AuthError 403 si el usuario es un operador de inquilino o no está autenticado.
 */
export async function requireSuperAdmin(): Promise<UserSession> {
  const session = await getSessionUser()
  if (!session) {
    throw new AuthError(401, 'No autenticado. Se requiere inicio de sesión.')
  }
  if (session.tenantId !== null || (session.nivel !== 1 && session.rol !== 'SUPER_ADMIN')) {
    throw new AuthError(403, 'Acceso denegado. Se requiere cuenta de Super Administrador Global.')
  }
  return session
}

/**
 * Obtiene el contexto seguro de inquilino para operaciones de negocio.
 * - Si el usuario es operador de inquilino, su tenantId proviene forzosamente de su sesión.
 * - Si el usuario es Super Admin, puede operar sobre un inquilino específico pasando cabecera x-tenant-slug o query tenantId.
 * - Si no se especifica tenant, lanza error para evitar consultas indiscriminadas sobre toda la base de datos.
 */
export async function getAuthenticatedTenant(request?: Request): Promise<{ session: UserSession; tenantId: number; tenantSlug: string }> {
  const session = await getSessionUser()
  if (!session) {
    throw new AuthError(401, 'No autenticado. Se requiere inicio de sesión.')
  }

  // 1. Usuario con tenant fijo asignado
  if (session.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { id: true, slug: true, activo: true }
    })
    if (!tenant || !tenant.activo) {
      throw new AuthError(403, 'El inquilino asociado a esta cuenta está inactivo o no existe.')
    }
    return { session, tenantId: tenant.id, tenantSlug: tenant.slug }
  }

  // 2. Super Admin operando en contexto de un inquilino explícito
  if (session.nivel === 1 || session.rol === 'SUPER_ADMIN') {
    let slug: string | null = null
    let idNum: number | null = null

    if (request) {
      slug = request.headers.get('x-tenant-slug')
      const url = new URL(request.url)
      const paramId = url.searchParams.get('tenantId')
      if (paramId) idNum = parseInt(paramId)
    }

    if (idNum) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: idNum },
        select: { id: true, slug: true, activo: true }
      })
      if (tenant) return { session, tenantId: tenant.id, tenantSlug: tenant.slug }
    }

    if (slug && slug !== '__saas_landing' && slug !== 'omnisync') {
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, slug: true, activo: true }
      })
      if (tenant) return { session, tenantId: tenant.id, tenantSlug: tenant.slug }
    }

    throw new AuthError(400, 'Operación denegada: Como Super Admin debes especificar el inquilino (x-tenant-slug o tenantId).')
  }

  throw new AuthError(403, 'Esta cuenta no posee permisos para operar en este inquilino.')
}

/**
 * Respuesta JSON estandarizada para excepciones de autenticación/autorización.
 */
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('[Auth Error]', error)
  return Response.json({ error: 'Error interno de autenticación o permisos' }, { status: 500 })
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

