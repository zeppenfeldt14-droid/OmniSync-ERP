import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FacturacionClient from './FacturacionClient'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function FacturacionPage() {
  const session = await getSessionUser()
  if (!session) redirect('/login')

  const logoConfig = await prisma.configuracionSistema.findUnique({ where: { clave: 'logo' } })
  const logo = logoConfig ? logoConfig.valor : null

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <FacturacionClient 
        userNivel={session.nivel} 
        userAlias={session.alias} 
        userZona={session.zona} 
        zonasHabilitadas={session.zonasHabilitadas}
        logo={logo}
      />
    </main>
  )
}
