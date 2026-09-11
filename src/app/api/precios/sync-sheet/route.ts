import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

export interface ParsedItem {
  codigoInterno: string
  nombre: string
  linea?: string
  tipo: 'PRODUCTO' | 'SERVICIO' | 'ABONO_MENSUAL'
  descripcion?: string
  costoBase: number
  precioUnitario: number
  precioCaja?: number
  precioPaquete?: number
  paqPorCaja?: number
  moneda: string
  margenPorcentaje: number
  comisionPorcentaje: number
  sku?: string
  isValid: boolean
  error?: string
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sheetUrl, csvContent, tenantId, listaId, listaNombre } = body

    let rawText = csvContent || ''

    // If Google Sheet URL provided, fetch direct CSV export
    if (sheetUrl && !rawText) {
      let exportUrl = sheetUrl.trim()
      if (exportUrl.includes('/edit')) {
        exportUrl = exportUrl.replace(/\/edit.*$/, '/export?format=csv')
      } else if (!exportUrl.includes('/export')) {
        exportUrl = exportUrl + '/export?format=csv'
      }

      const res = await fetch(exportUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      })

      if (!res.ok) {
        return NextResponse.json(
          { error: 'No se pudo descargar el Google Sheet. Verifica que el enlace tenga permisos públicos de lectura ("Cualquier persona con el enlace").' },
          { status: 400 }
        )
      }

      rawText = await res.text()
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: 'No se recibieron datos para sincronizar.' }, { status: 400 })
    }

    // Parse CSV
    const parsed = Papa.parse<string[]>(rawText.trim(), {
      skipEmptyLines: true,
    })

    const rows = parsed.data
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'El archivo debe tener al menos una fila de encabezados y una de datos.' }, { status: 400 })
    }

    const headerRow = rows[0].map(normalizeHeader)

    const findColIdx = (aliases: string[], fallbackIdx: number) => {
      const idx = headerRow.findIndex(h => aliases.some(a => h === a || h.includes(a)))
      return idx !== -1 ? idx : fallbackIdx
    }

    const codeIdx = findColIdx(['codigo', 'sku', 'cod', 'id'], 0)
    const nameIdx = findColIdx(['nombre', 'servicio', 'producto', 'titulo', 'item', 'descripcioncorta'], 1)
    const catIdx = findColIdx(['categoria', 'rubro', 'linea', 'familia', 'tipoitem'], 2)
    const typeIdx = findColIdx(['tipo', 'modalidad', 'recurrencia', 'formato'], 3)
    const descIdx = findColIdx(['descripcion', 'detalle', 'alcance', 'notas'], 4)
    const costIdx = findColIdx(['costo', 'costobase', 'costoars', 'costousd'], 5)
    const priceIdx = findColIdx(['precio', 'preciolista', 'preciounitario', 'valor', 'monto', 'precioventa'], 6)
    const marginIdx = findColIdx(['margen', 'markup', 'ganancia', 'margenporcentaje'], 7)
    const comIdx = findColIdx(['comision', 'comisionvendedor', 'com'], 8)
    const currencyIdx = findColIdx(['moneda', 'currency'], 9)

    const parsedItems: ParsedItem[] = []
    const now = new Date()

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0 || !r.some(cell => cell && cell.trim())) continue

      const getCell = (idx: number) => (r[idx] !== undefined ? String(r[idx]).trim() : '')

      const rawCode = getCell(codeIdx)
      const rawName = getCell(nameIdx)
      const rawCat = getCell(catIdx) || 'General'
      const rawType = getCell(typeIdx).toLowerCase()
      const rawDesc = getCell(descIdx)
      const rawCostStr = getCell(costIdx).replace(/[$\s.]/g, '').replace(',', '.')
      const rawPriceStr = getCell(priceIdx).replace(/[$\s.]/g, '').replace(',', '.')
      const rawMarginStr = getCell(marginIdx).replace(/[%,\s]/g, '')
      const rawComStr = getCell(comIdx).replace(/[%,\s]/g, '')
      const rawCurrency = getCell(currencyIdx).toUpperCase() || 'ARS'

      const costo = parseFloat(rawCostStr) || 0
      let precio = parseFloat(rawPriceStr) || 0
      const margen = parseFloat(rawMarginStr) || 0
      const comision = parseFloat(rawComStr) || 0

      // Calculate price if missing but margin is provided
      if (precio === 0 && costo > 0 && margen > 0) {
        precio = costo * (1 + margen / 100)
      }

      let tipo: 'PRODUCTO' | 'SERVICIO' | 'ABONO_MENSUAL' = 'SERVICIO'
      if (rawType.includes('abono') || rawType.includes('mensual') || rawType.includes('hosting') || rawType.includes('recurrente')) {
        tipo = 'ABONO_MENSUAL'
      } else if (rawType.includes('producto') || rawType.includes('fisico') || rawType.includes('caja')) {
        tipo = 'PRODUCTO'
      }

      const codigo = rawCode || `ITM-${(1000 + i).toString()}`
      const isValid = Boolean(rawName && (precio > 0 || costo > 0))

      parsedItems.push({
        codigoInterno: codigo,
        sku: codigo,
        nombre: rawName || 'Item sin nombre',
        linea: rawCat,
        tipo,
        descripcion: rawDesc || undefined,
        costoBase: costo,
        precioUnitario: precio,
        precioCaja: tipo === 'PRODUCTO' ? precio : 0,
        precioPaquete: tipo === 'PRODUCTO' ? Number((precio / 10).toFixed(2)) : 0,
        paqPorCaja: 1,
        moneda: rawCurrency === 'USD' ? 'USD' : 'ARS',
        margenPorcentaje: margen,
        comisionPorcentaje: comision,
        isValid,
        error: !isValid ? 'Nombre o precio requeridos' : undefined
      })
    }

    // Upsert into database
    let createdCount = 0
    let updatedCount = 0
    const validItems = parsedItems.filter(p => p.isValid)

    // Ensure or get PriceList
    let targetList = null
    const targetTenantId = tenantId ? Number(tenantId) : null

    if (listaId) {
      targetList = await prisma.listaPrecio.findUnique({ where: { id: Number(listaId) } })
    }

    if (!targetList) {
      targetList = await prisma.listaPrecio.create({
        data: {
          tenantId: targetTenantId,
          nombre: listaNombre || `Lista Sincronizada ${now.toLocaleDateString('es-AR')}`,
          vigenteDesde: now,
          activa: true,
          sheetUrl: sheetUrl || null,
          ultimaSincronizacion: now,
          unidadNegocio: targetTenantId ? `Tenant #${targetTenantId}` : 'General',
        }
      })
    } else {
      await prisma.listaPrecio.update({
        where: { id: targetList.id },
        data: {
          sheetUrl: sheetUrl || targetList.sheetUrl,
          ultimaSincronizacion: now
        }
      })
    }

    // Update Tenant sheet sync date if applicable
    if (targetTenantId && sheetUrl) {
      await prisma.tenant.update({
        where: { id: targetTenantId },
        data: {
          sheetUrl,
          sheetUltimaSync: now
        }
      }).catch(() => {})
    }

    // Upsert products and price records
    for (const item of validItems) {
      const existing = await prisma.producto.findUnique({
        where: { codigoInterno: item.codigoInterno }
      })

      let prodId: number

      if (existing) {
        const updated = await prisma.producto.update({
          where: { id: existing.id },
          data: {
            nombre: item.nombre,
            linea: item.linea,
            tipo: item.tipo,
            descripcion: item.descripcion,
            costoBase: item.costoBase,
            precioUnitario: item.precioUnitario,
            precioCaja: item.precioCaja || 0,
            precioPaquete: item.precioPaquete || 0,
            moneda: item.moneda,
            margenPorcentaje: item.margenPorcentaje,
            comisionPorcentaje: item.comisionPorcentaje,
            sku: item.sku,
            tenantId: targetTenantId || existing.tenantId,
            activo: true,
          }
        })
        prodId = updated.id
        updatedCount++
      } else {
        const created = await prisma.producto.create({
          data: {
            codigoInterno: item.codigoInterno,
            nombre: item.nombre,
            linea: item.linea,
            tipo: item.tipo,
            descripcion: item.descripcion,
            costoBase: item.costoBase,
            precioUnitario: item.precioUnitario,
            precioCaja: item.precioCaja || 0,
            precioPaquete: item.precioPaquete || 0,
            paqPorCaja: item.paqPorCaja || 1,
            moneda: item.moneda,
            margenPorcentaje: item.margenPorcentaje,
            comisionPorcentaje: item.comisionPorcentaje,
            sku: item.sku,
            tenantId: targetTenantId,
            activo: true,
          }
        })
        prodId = created.id
        createdCount++
      }

      // Upsert in PrecioProducto for the active ListaPrecio
      await prisma.precioProducto.upsert({
        where: {
          listaId_productoId: {
            listaId: targetList.id,
            productoId: prodId
          }
        },
        create: {
          listaId: targetList.id,
          productoId: prodId,
          productoCodigo: item.codigoInterno,
          precioPaqueteMin: item.precioUnitario,
          precioCajaMin: item.precioUnitario,
          precioPaqueteMax: item.precioUnitario * 1.15,
          precioCajaMax: item.precioUnitario * 1.15,
        },
        update: {
          productoCodigo: item.codigoInterno,
          precioPaqueteMin: item.precioUnitario,
          precioCajaMin: item.precioUnitario,
          precioPaqueteMax: item.precioUnitario * 1.15,
          precioCajaMax: item.precioUnitario * 1.15,
        }
      })
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      totalParsed: parsedItems.length,
      validCount: validItems.length,
      listaId: targetList.id,
      listaNombre: targetList.nombre,
      items: parsedItems.slice(0, 50),
    })

  } catch (error: any) {
    console.error('Error syncing prices from sheet:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar la lista' }, { status: 500 })
  }
}
