import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  let logoUrl = ''
  if (process.env.DATABASE_URL) {
    try {
      const conf = await prisma.configuracionSistema.findUnique({ where: { clave: 'logo' } })
      logoUrl = conf?.valor || ''
    } catch (e) {
      console.warn('OpenGraph: Could not load logo from DB during build:', e)
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B132B',
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} style={{ width: '60%', objectFit: 'contain' }} />
        ) : (
          <div style={{ color: 'white', fontSize: 120, fontWeight: 'bold' }}>NEOSOL</div>
        )}
      </div>
    ),
    { ...size }
  )
}
