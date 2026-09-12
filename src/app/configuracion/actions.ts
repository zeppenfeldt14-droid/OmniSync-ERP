'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { formatImageUrl } from '@/lib/imageUtils'

export async function saveLogo(logoValue: string, tenantId?: number | null) {
  const formatted = formatImageUrl(logoValue)

  await prisma.configuracionSistema.upsert({
    where: { clave: 'logo' },
    update: { valor: formatted },
    create: { clave: 'logo', valor: formatted }
  })

  if (tenantId) {
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { logoUrl: formatted }
      })
    } catch (e) {
      console.warn('Tenant logo update error:', e)
    }
  }
  
  revalidatePath('/', 'layout')
}

export async function deleteLogo(tenantId?: number | null) {
  await prisma.configuracionSistema.deleteMany({
    where: { clave: 'logo' }
  })

  if (tenantId) {
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { logoUrl: null }
      })
    } catch (e) {
      console.warn('Tenant logo delete error:', e)
    }
  }

  revalidatePath('/', 'layout')
}
