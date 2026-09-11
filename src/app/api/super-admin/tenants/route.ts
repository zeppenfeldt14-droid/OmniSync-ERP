import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1 (Super Admin)' }, { status: 403 })
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            empresas: true,
            usuarios: true,
            zonas: true,
            productos: true
          }
        },
        zonas: {
          select: { id: true, nombre: true, color: true }
        },
        usuarios: {
          select: { id: true, nombre: true, alias: true, email: true, rol: true, nivel: true, zona: true }
        }
      },
      orderBy: { id: 'asc' }
    })

    return NextResponse.json(tenants)
  } catch (error: any) {
    console.error('Error en GET /api/super-admin/tenants:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1 (Super Admin)' }, { status: 403 })
    }

    const body = await req.json()
    const { nombre, slug, descripcion, tipoModelo, moneda, colorPrimario, colorSecundario, terminologiaPersonalizada } = body

    if (!nombre || !slug) {
      return NextResponse.json({ error: 'El nombre y el slug son obligatorios' }, { status: 400 })
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')

    const existing = await prisma.tenant.findUnique({
      where: { slug: cleanSlug }
    })

    if (existing) {
      return NextResponse.json({ error: `Ya existe un inquilino con el slug "${cleanSlug}"` }, { status: 400 })
    }

    // 1. Crear el Tenant
    const newTenant = await prisma.tenant.create({
      data: {
        nombre,
        slug: cleanSlug,
        descripcion: descripcion || null,
        tipoModelo: tipoModelo || 'SERVICIOS_DIGITALES',
        moneda: moneda || (tipoModelo === 'FISICO_TERRENO' ? 'ARS' : 'USD'),
        colorPrimario: colorPrimario || (tipoModelo === 'FISICO_TERRENO' ? '#2563eb' : '#7c3aed'),
        colorSecundario: colorSecundario || (tipoModelo === 'FISICO_TERRENO' ? '#1d4ed8' : '#6d28d9'),
        terminologia: terminologiaPersonalizada || null,
        activo: true,
        configuracion: {
          permiteAbonos: tipoModelo !== 'FISICO_TERRENO',
          permiteCotizadorWeb: tipoModelo === 'SERVICIOS_DIGITALES',
          permiteVisitas: true,
          permiteGeolocalizacion: true
        }
      }
    })

    // 2. Aprovisionar 4 Zonas Estándar
    const zonasEstandar = [
      { nombre: 'Zona 1', color: '#8b5cf6' },
      { nombre: 'Zona 2', color: '#3b82f6' },
      { nombre: 'Zona 3', color: '#10b981' },
      { nombre: 'Zona 4', color: '#f59e0b' }
    ]

    for (const z of zonasEstandar) {
      await prisma.zona.create({
        data: {
          nombre: z.nombre,
          color: z.color,
          tenantId: newTenant.id,
          barrios: []
        }
      })
    }

    // 3. Aprovisionar los 8 usuarios estándar con los roles del negocio
    const defaultPassword = await bcrypt.hash(`${cleanSlug}123`, 10)
    const modulosEstandar = {
      dashboard: true,
      empresas: true,
      pedidos: true,
      visitas: true,
      cobranzas: true,
      productos: true,
      planificador: true
    }

    const equipoEstandar = [
      {
        alias: `gerente.${cleanSlug}`,
        nombre: `Gerente General (${nombre})`,
        email: `gerente@${cleanSlug}.com`,
        rol: 'SUPER_ADMIN',
        nivel: 1,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `supervisor.${cleanSlug}`,
        nombre: `Supervisor Comercial (${nombre})`,
        email: `supervisor@${cleanSlug}.com`,
        rol: 'SUPERVISOR',
        nivel: 2,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `asistente.${cleanSlug}`,
        nombre: `Asistente Operativo (${nombre})`,
        email: `asistente@${cleanSlug}.com`,
        rol: 'ASISTENTE',
        nivel: 2,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `analista.${cleanSlug}`,
        nombre: `Analista Comercial & KPIs (${nombre})`,
        email: `analista@${cleanSlug}.com`,
        rol: 'ANALISTA',
        nivel: 4,
        zona: 'Zona 1,Zona 2,Zona 3,Zona 4',
        zonasHabilitadas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'],
        isNivelTodo: true
      },
      {
        alias: `vendedor1.${cleanSlug}`,
        nombre: `Vendedor Zona 1 (${nombre})`,
        email: `z1@${cleanSlug}.com`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 1',
        zonasHabilitadas: ['Zona 1'],
        isNivelTodo: false
      },
      {
        alias: `vendedor2.${cleanSlug}`,
        nombre: `Vendedor Zona 2 (${nombre})`,
        email: `z2@${cleanSlug}.com`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 2',
        zonasHabilitadas: ['Zona 2'],
        isNivelTodo: false
      },
      {
        alias: `vendedor3.${cleanSlug}`,
        nombre: `Vendedor Zona 3 (${nombre})`,
        email: `z3@${cleanSlug}.com`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 3',
        zonasHabilitadas: ['Zona 3'],
        isNivelTodo: false
      },
      {
        alias: `vendedor4.${cleanSlug}`,
        nombre: `Vendedor Zona 4 (${nombre})`,
        email: `z4@${cleanSlug}.com`,
        rol: 'VENDEDOR',
        nivel: 3,
        zona: 'Zona 4',
        zonasHabilitadas: ['Zona 4'],
        isNivelTodo: false
      }
    ]

    for (const usr of equipoEstandar) {
      await prisma.usuario.create({
        data: {
          alias: usr.alias,
          nombre: usr.nombre,
          email: usr.email,
          passwordHash: defaultPassword,
          rol: usr.rol,
          nivel: usr.nivel,
          zona: usr.zona,
          zonasHabilitadas: usr.zonasHabilitadas,
          isNivelTodo: usr.isNivelTodo,
          activo: true,
          tenantId: newTenant.id,
          modulos: modulosEstandar
        }
      })
    }

    // 4. Catálogo inicial de muestra según tipo de modelo
    if (tipoModelo === 'FISICO_TERRENO') {
      const prodsFisicos = [
        { cod: `${cleanSlug.toUpperCase()}-EQ1`, nom: 'Equipo Modelo Alpha Pro', desc: 'Equipo de distribución estándar para comercios.', precio: 320 },
        { cod: `${cleanSlug.toUpperCase()}-EQ2`, nom: 'Equipo Modelo Beta Max', desc: 'Equipo de alta capacidad para mayoristas.', precio: 580 },
        { cod: `${cleanSlug.toUpperCase()}-CJ1`, nom: 'Caja x 24 Unidades Surtidas', desc: 'Pack de reposición para puntos de venta.', precio: 150 }
      ]
      for (const p of prodsFisicos) {
        await prisma.producto.create({
          data: {
            codigoInterno: p.cod,
            nombre: p.nom,
            descripcion: p.desc,
            precioUnitario: p.precio,
            precioPaquete: p.precio,
            precioCaja: p.precio,
            costoBase: p.precio * 0.5,
            moneda: newTenant.moneda,
            tipo: 'PRODUCTO',
            activo: true,
            tenantId: newTenant.id
          }
        })
      }
    } else {
      const prodsDigitales = [
        { cod: `${cleanSlug.toUpperCase()}-WEB`, nom: 'Desarrollo Web Responsive', desc: 'Sitio corporativo institucional optimizado.', precio: 450, tipo: 'SERVICIO' },
        { cod: `${cleanSlug.toUpperCase()}-ADS`, nom: 'Campaña Publicitaria Meta / Google', desc: 'Gestión mensual de anuncios y audiencias.', precio: 300, tipo: 'SERVICIO' },
        { cod: `${cleanSlug.toUpperCase()}-ABONO`, nom: 'Abono Mensual de Mantenimiento & Hosting', desc: 'Soporte, servidores y copias de seguridad.', precio: 80, tipo: 'ABONO_MENSUAL' }
      ]
      for (const p of prodsDigitales) {
        await prisma.producto.create({
          data: {
            codigoInterno: p.cod,
            nombre: p.nom,
            descripcion: p.desc,
            precioUnitario: p.precio,
            precioPaquete: p.precio,
            precioCaja: p.precio,
            costoBase: p.precio * 0.3,
            moneda: newTenant.moneda,
            tipo: p.tipo,
            activo: true,
            tenantId: newTenant.id
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      tenant: newTenant,
      message: `Inquilino "${nombre}" aprovisionado con éxito con 4 zonas estándar y 8 usuarios base.`
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error en POST /api/super-admin/tenants:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
