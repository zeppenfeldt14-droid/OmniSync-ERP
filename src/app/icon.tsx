import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const size = { width: 256, height: 256 }
export const contentType = 'image/png'

export default async function Icon() {
  let logoUrl = ''
  if (process.env.DATABASE_URL) {
    try {
      const conf = await prisma.configuracionSistema.findUnique({ where: { clave: 'logo' } })
      logoUrl = conf?.valor || ''
    } catch (e) {
      console.warn('Icon: Could not load logo from DB during build:', e)
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
          <img src={logoUrl} style={{ width: '80%', objectFit: 'contain' }} />
        ) : (
          <div style={{ color: 'white', fontSize: 64, fontWeight: 'bold' }}>N</div>
        )}
      </div>
    ),
    { ...size }
  )
}
