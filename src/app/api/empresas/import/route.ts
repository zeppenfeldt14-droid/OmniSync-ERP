import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function extractLocality(addr: string): string | null {
  if (!addr) return null
  const parts = addr.split(',').map(p => p.trim())
  if (parts.length >= 3) {
    return parts[1]
  }
  return null
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { empresas, tenantId } = await request.json()
    if (!empresas || !Array.isArray(empresas)) {
      return NextResponse.json({ error: 'Formato de datos inválido' }, { status: 400 })
    }

    const targetTenantId = tenantId ? parseInt(String(tenantId)) : (user.tenantId || null)

    let successCount = 0
    let ignoredCount = 0

    // Fetch existing companies ONLY within this tenant to avoid false duplicate collisions across tenants
    const existingEmpresas = await prisma.empresa.findMany({
      where: targetTenantId ? { tenantId: targetTenantId } : undefined,
      select: { nombre: true, telefono: true }
    })

    const existingNames = new Set(existingEmpresas.map(e => e.nombre.toLowerCase().trim()))
    const existingPhones = new Set(existingEmpresas.map(e => e.telefono?.trim()).filter(Boolean))

    const empresasToCreate = []

    for (const emp of empresas) {
      const nombreNorm = (emp.nombre || '').toLowerCase().trim()
      const telefonoNorm = (emp.telefono || '').trim()

      if (!nombreNorm) continue // Skip empty rows

      const isDuplicateByName = existingNames.has(nombreNorm)
      const isDuplicateByPhone = telefonoNorm && existingPhones.has(telefonoNorm)

      if (isDuplicateByName || isDuplicateByPhone) {
        ignoredCount++
      } else {
        const direccionClean = emp.direccion?.trim() || null
        const localidad = extractLocality(direccionClean || '')
        
        let latitud = null
        let longitud = null
        if (emp.coordenadas) {
          const cparts = String(emp.coordenadas).split(',')
          if (cparts.length >= 2) {
            const lat = parseFloat(cparts[0].trim())
            const lng = parseFloat(cparts[1].trim())
            if (!isNaN(lat) && !isNaN(lng)) {
              latitud = lat
              longitud = lng
            }
          }
        }

        empresasToCreate.push({
          nombre: emp.nombre.trim(),
          telefono: telefonoNorm || null,
          direccion: direccionClean,
          partido: localidad,
          barrio: localidad,
          subZona: null,
          rubro: emp.rubro?.trim() || null,
          zona: emp.zona?.trim() || null, // Zona asignada por fila o por defecto
          estado: 'prospecto',
          vendedorAsignado: emp.vendedorAsignado || (user.nivel === 3 ? user.alias : null),
          latitud: latitud,
          longitud: longitud,
          tenantId: targetTenantId
        })
        
        // Add to sets to prevent duplicates WITHIN the imported batch itself
        existingNames.add(nombreNorm)
        if (telefonoNorm) existingPhones.add(telefonoNorm)
      }
    }

    if (empresasToCreate.length > 0) {
      const result = await prisma.empresa.createMany({
        data: empresasToCreate,
        skipDuplicates: true
      })
      successCount = result.count
    }

    return NextResponse.json({ 
      success: successCount,
      ignored: ignoredCount
    })
  } catch (error: any) {
    console.error('Error importando empresas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
