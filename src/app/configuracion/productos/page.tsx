import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProductosPageClient } from './ProductosPageClient'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  const session = await getSessionUser()
  if (!session) redirect('/login')
  return <ProductosPageClient userNivel={session.nivel} />
}
