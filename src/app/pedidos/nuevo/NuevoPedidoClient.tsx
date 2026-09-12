'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ShoppingCart, Search, ChevronDown, Plus, Minus, Trash2,
  CheckCircle2, AlertCircle, Info, Send, Save, X, Package,
  Calculator, FileText, Banknote, Percent, Gift, BadgeDollarSign, Tag
} from 'lucide-react'
import { useTenant } from '@/lib/tenantContext'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Producto {
  id: number
  codigoInterno: string
  nombre: string
  linea: string
  precioPaquete: number
  paqPorCaja: number
  precioCaja: number
  precioPaqueteMin?: number
  precioCajaMin?: number
  precioPaqueteMax?: number
  precioCajaMax?: number
}

interface Empresa {
  id: number
  nombre: string
  cuit: string | null
  zona: string | null
  estado: string
  responsable: string | null
  direccion: string | null
  telefono: string | null
}

interface LineaPedido {
  producto: Producto
  cantidadCajas: number
  cajasBonus: number
  descripcionBonus: string
  precioCajaNegociado: number
  subtotal: number
  hasCustomPrice: boolean
}

const LINEAS_LABELS: Record<string, string> = {
  pack_individual: 'Línea Pack Individual',
  tripack:         'Línea Tripack',
  minis:           'Línea Minis',
  snacks:          'Línea Snacks Horneados',
}

const CONDICIONES_PAGO = [
  { label: '20% / 80%', pA: 20, pB: 80 },
  { label: '30% / 70%', pA: 30, pB: 70 },
  { label: '50% / 50%', pA: 50, pB: 50 },
  { label: '70% / 30%', pA: 70, pB: 30 },
  { label: '100% A (con IVA)', pA: 100, pB: 0 },
  { label: '100% B (sin IVA)', pA: 0, pB: 100 },
  { label: 'Personalizada', pA: -1, pB: -1 },
]

const IVA_RATE = 0.21
const FINANCIERA_RATE = 0.03
const PROMO_10x1_TRIGGER = 10

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
}

export function NuevoPedidoClient({ userNivel, userAlias, userZona }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const paramEmpresaId = searchParams.get('empresaId')
  const { activeTenant, terminology } = useTenant()

  // Data
  const [productos, setProductos]   = useState<Producto[]>([])
  const [empresas, setEmpresas]     = useState<Empresa[]>([])
  const [loading, setLoading]       = useState(true)

  // Form state
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null)
  const [empresaBusqueda, setEmpresaBusqueda]         = useState('')
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false)
  const [lineasPedido, setLineasPedido]               = useState<LineaPedido[]>([])
  const [productoBusqueda, setProductoBusqueda]       = useState('')
  const [showMobilePrices, setShowMobilePrices]       = useState(false)
  const [showMobilePromos, setShowMobilePromos]       = useState(false)

  // Negociación
  const [condicionIdx, setCondicionIdx]       = useState(0)
  const [pctACustom, setPctACustom]           = useState(20)
  const [pctBCustom, setPctBCustom]           = useState(80)
  const [aplicaFinanciera, setAplicaFinanciera] = useState(false)
  const [plazosPago, setPlazosPago]           = useState('')
  const [metodoPagoA, setMetodoPagoA]         = useState<'cheque' | 'transferencia' | ''>('')
  const [fechaPagoA, setFechaPagoA]           = useState('')
  const [observaciones, setObservaciones]     = useState('')
  const [acuerdosComerciales, setAcuerdosComerciales] = useState('')
  const [requierePresupuesto, setRequierePresupuesto] = useState(false)
  const [turnoEntrega, setTurnoEntrega]       = useState<'SI' | 'NO' | ''>('')
  const [negociarTarifaVolumen, setNegociarTarifaVolumen] = useState(false)
  const [promosActivas, setPromosActivas] = useState<any[]>([])
  const [promosSeleccionadas, setPromosSeleccionadas] = useState<{ [key: number]: boolean }>({})
  const [priceLists, setPriceLists] = useState<any[]>([])
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [minimoCajas, setMinimoCajas] = useState<number>(300)
  const [limiteListaA, setLimiteListaA] = useState<number>(60)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const [pendingSubmit, setPendingSubmit] = useState(false)

  // ── Fetch data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const zoneQueryParam = userNivel === 3 ? (userZona || '') : ''
      const [prodRes, empRes, promoRes, listsRes, reglasRes] = await Promise.all([
        fetch('/api/productos'),
        fetch(`/api/empresas?estado=activo&zona=${zoneQueryParam}&limit=200`),
        fetch('/api/configuracion/promociones'),
        fetch('/api/configuracion/tarifas'),
        fetch('/api/configuracion/reglas'),
      ])
      const prodData = await prodRes.json()
      const empData  = await empRes.json()
      const promoData = await promoRes.json()
      const listsData = await listsRes.json()
      const reglasData = await reglasRes.json()
      if (reglasData.minimoCajas) setMinimoCajas(reglasData.minimoCajas)
      if (reglasData.limiteListaA) setLimiteListaA(reglasData.limiteListaA)
      
      const prodsList = Array.isArray(prodData) ? prodData : []
      const empsList = Array.isArray(empData) ? empData : (empData.empresas || [])
      const activePromos = Array.isArray(promoData) ? promoData.filter((p: any) => p.activa) : []

      setProductos(prodsList)
      setEmpresas(empsList)
      setPromosActivas(activePromos)

      if (Array.isArray(listsData)) {
        setPriceLists(listsData)
        const now = new Date()
        const active = listsData.find((l: any) => l.activa && new Date(l.vigenteDesde) <= now) || listsData[0]
        if (active) setSelectedListId(active.id)
      }

      // If in edit mode, fetch order details
      if (editId) {
        try {
          const orderRes = await fetch(`/api/pedidos/${editId}`)
          if (orderRes.ok) {
            const orderToEdit = await orderRes.json()
            if (orderToEdit) {
              // Populate order details
              const matchedEmpresa = empsList.find((e: any) => e.id === orderToEdit.empresaId)
              if (matchedEmpresa) {
                setEmpresaSeleccionada(matchedEmpresa)
                setEmpresaBusqueda(matchedEmpresa.nombre)
              }
              
              setNegociarTarifaVolumen(orderToEdit.tieneTarifaNegociada)
              setAplicaFinanciera(orderToEdit.aplicaFinanciera)
              setPlazosPago(orderToEdit.plazosPago || '')
              setObservaciones(orderToEdit.observaciones || '')
              setAcuerdosComerciales(orderToEdit.acuerdosComerciales || '')
              setRequierePresupuesto(orderToEdit.requierePresupuesto)
              setTurnoEntrega(orderToEdit.turnoEntrega || '')
              setMetodoPagoA(orderToEdit.metodoPagoA || '')
              if (orderToEdit.fechaPagoA) {
                setFechaPagoA(new Date(orderToEdit.fechaPagoA).toISOString().split('T')[0])
              }

              // Match payment condition
              const matchIdx = CONDICIONES_PAGO.findIndex(
                c => c.pA === orderToEdit.porcentajePagoA && c.pB === orderToEdit.porcentajePagoB
              )
              if (matchIdx !== -1) {
                setCondicionIdx(matchIdx)
              } else {
                setCondicionIdx(CONDICIONES_PAGO.length - 1) // Personalizada
                setPctACustom(orderToEdit.porcentajePagoA)
                setPctBCustom(orderToEdit.porcentajePagoB)
              }

              // Mapped lines
              const mappedLines = orderToEdit.detalles.map((d: any) => {
                const prod = prodsList.find((p: any) => p.id === d.productoId)
                return {
                  producto: prod || d.producto,
                  cantidadCajas: d.cantidadCajas,
                  cajasBonus: d.cajasBonus || 0,
                  descripcionBonus: d.descripcionBonus || '',
                  precioCajaNegociado: d.precioCajaSnapshot,
                  subtotal: d.subtotal,
                  hasCustomPrice: Math.abs(d.precioCajaSnapshot - d.precioCajaOriginal) > 0.01
                }
              })
              setLineasPedido(mappedLines)

              // Parse selected promotions
              const selectedPromos: { [key: number]: boolean } = {}
              orderToEdit.detalles.forEach((d: any) => {
                if (d.descripcionBonus) {
                  activePromos.forEach((p: any) => {
                    if (d.descripcionBonus.includes(p.nombre)) {
                      selectedPromos[p.id] = true
                    }
                  })
                }
              })
              setPromosSeleccionadas(selectedPromos)
            }
          }
        } catch (error) {
          console.error(error)
        }
      } else if (paramEmpresaId) {
        // Modo Nuevo Pedido pero con empresa preseleccionada desde la URL
        const matchedEmpresa = empsList.find((e: any) => e.id === Number(paramEmpresaId))
        if (matchedEmpresa) {
          setEmpresaSeleccionada(matchedEmpresa)
          setEmpresaBusqueda(matchedEmpresa.nombre)
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [userZona, editId])

  // ── Derived values ───────────────────────────────────────────────────────
  const condicion = CONDICIONES_PAGO[condicionIdx]
  const pctA = condicion.pA === -1 ? pctACustom : condicion.pA
  const pctB = condicion.pB === -1 ? pctBCustom : condicion.pB

  const subtotalSinIVA = lineasPedido.reduce((s, l) => s + l.subtotal, 0)
  const montoParteA    = subtotalSinIVA * (pctA / 100)
  const montoParteB    = subtotalSinIVA * (pctB / 100)
  const montoIVA       = montoParteA * IVA_RATE
  const baseFinanciera = subtotalSinIVA + montoIVA
  const montoFinanciera = aplicaFinanciera ? baseFinanciera * FINANCIERA_RATE : 0
  const totalGeneral   = subtotalSinIVA + montoIVA + montoFinanciera

  const totalCajas     = lineasPedido.reduce((s, l) => s + l.cantidadCajas, 0)
  const totalBonus     = lineasPedido.reduce((s, l) => s + l.cajasBonus, 0)

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  // Helper to check if a promotion applies to a specific product
  const doesPromoApplyToProduct = useCallback((promo: any, prod: Producto) => {
    // If the promo has explicit `detallesPromocion`, use them!
    if (promo.detallesPromocion && promo.detallesPromocion.length > 0) {
      return promo.detallesPromocion.some((dp: any) => dp.productoId === prod.id)
    }

    const promoNameLower = promo.nombre.toLowerCase()
    const prodNombreLower = prod.nombre.toLowerCase()
    const prodLineaLower = (prod.linea || '').toLowerCase()
    const prodCodigo = prod.codigoInterno

    if (promoNameLower.includes(prodCodigo)) return true

    // Removido hasOtherCode para evitar falsos negativos en rangos como 80000-80007.
    // Para promociones de un solo producto, se debe usar la selección explícita (checkboxes) en Configuración.
    if (promoNameLower.includes('minis') || promoNameLower.includes('mini')) {
      return prodLineaLower === 'minis' || prodNombreLower.includes('mini')
    }

    if (promoNameLower.includes('dulce') && !prodNombreLower.includes('dulce')) {
      return false
    }

    if (promoNameLower.includes('snacks') || promoNameLower.includes('baguetines') || promoNameLower.includes('neox') || promoNameLower.includes('neolitas') || promoNameLower.includes('horneados')) {
      return prodLineaLower === 'snacks' || prodNombreLower.includes('baguetine') || prodNombreLower.includes('neolita') || prodNombreLower.includes('neox')
    }

    return true
  }, [])

  // Helper to calculate bonus details globally for all lines based on promos
  const recalculateAllBonuses = useCallback((lines: LineaPedido[]) => {
    // 1. Reset all bonuses
    const newLines = lines.map(l => ({ ...l, cajasBonus: 0, descripcionBonus: '' }))

    // 2. For each active and selected promo, calculate total boxes in the block
    for (const promo of promosActivas) {
      if (!promosSeleccionadas[promo.id]) continue

      // Find all lines that this promo applies to
      const applicableLinesIndices = newLines
        .map((l, idx) => doesPromoApplyToProduct(promo, l.producto) ? idx : -1)
        .filter(idx => idx !== -1)
      
      if (applicableLinesIndices.length === 0) continue

      // Sum quantities
      const totalCajasPromo = applicableLinesIndices.reduce((sum, idx) => sum + newLines[idx].cantidadCajas, 0)

      if (promo.compraMinima && totalCajasPromo >= promo.compraMinima) {
        const bonusCount = Math.floor(totalCajasPromo / promo.compraMinima) * (promo.bonificacion || 1)
        
        // Distribuir el bonus proporcionalmente entre los productos aplicables
        if (bonusCount > 0) {
          let remainingBonus = bonusCount
          
          // Sort indices by cantidadCajas descending to prioritize giving bonuses to items they bought more of
          const sortedIndices = [...applicableLinesIndices].sort((a, b) => newLines[b].cantidadCajas - newLines[a].cantidadCajas)

          // 1. Initial proportional distribution
          const distributions = sortedIndices.map(idx => {
            const fraction = (newLines[idx].cantidadCajas / totalCajasPromo)
            const qty = Math.floor(bonusCount * fraction)
            remainingBonus -= qty
            return { idx, qty, remainder: (bonusCount * fraction) - qty }
          })

          // 2. Distribute remaining based on highest remainder
          distributions.sort((a, b) => {
            if (Math.abs(b.remainder - a.remainder) > 0.0001) {
              return b.remainder - a.remainder
            }
            return newLines[b.idx].cantidadCajas - newLines[a.idx].cantidadCajas
          })

          for (let i = 0; i < remainingBonus && i < distributions.length; i++) {
             distributions[i].qty += 1
          }

          // 3. Apply to lines
          for (const dist of distributions) {
            if (dist.qty > 0) {
              newLines[dist.idx].cajasBonus += dist.qty
              const existingDesc = newLines[dist.idx].descripcionBonus
              const newDesc = `${promo.nombre}: +${dist.qty} reg`
              newLines[dist.idx].descripcionBonus = existingDesc ? `${existingDesc}, ${newDesc}` : newDesc
            }
          }
        }
      }
    }
    
    return newLines
  }, [promosActivas, promosSeleccionadas, doesPromoApplyToProduct])

  const getListPriceForProduct = useCallback((prod: Producto, isVolume: boolean) => {
    const selectedList = priceLists.find(l => l.id === selectedListId)
    const priceRecord = selectedList?.precios.find((pr: any) => pr.productoId === prod.id)
    if (priceRecord) {
      return isVolume ? priceRecord.precioCajaMax : priceRecord.precioCajaMin
    }
    return isVolume
      ? (prod.precioCajaMax !== undefined ? prod.precioCajaMax : prod.precioCaja)
      : (prod.precioCajaMin !== undefined ? prod.precioCajaMin : prod.precioCaja)
  }, [priceLists, selectedListId])

  const getAllListPricesForProduct = useCallback((prod: Producto) => {
    const selectedList = priceLists.find(l => l.id === selectedListId)
    const priceRecord = selectedList?.precios.find((pr: any) => pr.productoId === prod.id)
    let priceA = prod.precioCajaMax !== undefined ? prod.precioCajaMax : prod.precioCaja
    let priceB = prod.precioCajaMin !== undefined ? prod.precioCajaMin : prod.precioCaja
    if (priceRecord) {
      priceA = priceRecord.precioCajaMax
      priceB = priceRecord.precioCajaMin
    }
    return { priceA, priceB }
  }, [priceLists, selectedListId])

  const isSelectedListUpcoming = useCallback(() => {
    const selectedList = priceLists.find(l => l.id === selectedListId)
    if (!selectedList) return false
    return new Date(selectedList.vigenteDesde) > new Date()
  }, [priceLists, selectedListId])

  // ── Add product line ─────────────────────────────────────────────────────
  const agregarProducto = (prod: Producto) => {
    if (lineasPedido.find(l => l.producto.id === prod.id)) return
    
    const isVolume = totalCajas >= 300 || negociarTarifaVolumen
    const listPrice = getListPriceForProduct(prod, isVolume)

    setLineasPedido(prev => recalculateAllBonuses([...prev, {
      producto: prod,
      cantidadCajas: 0,
      cajasBonus: 0,
      descripcionBonus: '',
      precioCajaNegociado: listPrice,
      subtotal: 0,
      hasCustomPrice: false
    }]))
  }

  const actualizarCantidad = (prodId: number, delta: number) => {
    setLineasPedido(prev => {
      const mapped = prev.map(l => {
        if (l.producto.id !== prodId) return l
        const nuevaCantidad = Math.max(0, l.cantidadCajas + delta)
        return {
          ...l,
          cantidadCajas: nuevaCantidad,
          subtotal: nuevaCantidad * l.precioCajaNegociado,
        }
      })
      return recalculateAllBonuses(mapped)
    })
  }

  const setCantidadDirecta = (prodId: number, valor: number) => {
    const nuevaCantidad = Math.max(0, valor || 0)
    setLineasPedido(prev => {
      const mapped = prev.map(l => {
        if (l.producto.id !== prodId) return l
        return {
          ...l,
          cantidadCajas: nuevaCantidad,
          subtotal: nuevaCantidad * l.precioCajaNegociado,
        }
      })
      return recalculateAllBonuses(mapped)
    })
  }

  const actualizarPrecioNegociado = (prodId: number, nuevoPrecio: number) => {
    setLineasPedido(prev => {
      const exists = prev.find(l => l.producto.id === prodId)
      const prod = productos.find(p => p.id === prodId)!
      const listPrice = getListPriceForProduct(prod, totalCajas >= 300 || negociarTarifaVolumen)

      const hasCustom = Math.abs(nuevoPrecio - listPrice) > 0.01

      if (!exists) {
        return recalculateAllBonuses([...prev, {
          producto: prod,
          cantidadCajas: 0,
          cajasBonus: 0,
          descripcionBonus: '',
          precioCajaNegociado: nuevoPrecio,
          subtotal: 0,
          hasCustomPrice: hasCustom
        }])
      }
      return prev.map(l => {
        if (l.producto.id !== prodId) return l
        return {
          ...l,
          precioCajaNegociado: nuevoPrecio,
          subtotal: l.cantidadCajas * nuevoPrecio,
          hasCustomPrice: hasCustom
        }
      })
    })
  }

  const eliminarLinea = (prodId: number) =>
    setLineasPedido(prev => recalculateAllBonuses(prev.filter(l => l.producto.id !== prodId)))

  // Recalculate bonuses when selected promotions change
  useEffect(() => {
    setLineasPedido(prev => recalculateAllBonuses([...prev]))
  }, [promosSeleccionadas, promosActivas, recalculateAllBonuses])

  // Dynamic prices sync when volume tier or price list switches
  useEffect(() => {
    const isVolume = totalCajas >= 300 || negociarTarifaVolumen
    setLineasPedido(prev => prev.map(l => {
      if (l.hasCustomPrice) return l
      
      const listPrice = getListPriceForProduct(l.producto, isVolume)

      return {
        ...l,
        precioCajaNegociado: listPrice,
        subtotal: l.cantidadCajas * listPrice
      }
    }))
  }, [totalCajas, negociarTarifaVolumen, selectedListId, priceLists, getListPriceForProduct])

  // ── Custom pct sync ──────────────────────────────────────────────────────
  const handlePctAChange = (v: number) => {
    setPctACustom(Math.min(100, Math.max(0, v)))
    setPctBCustom(100 - Math.min(100, Math.max(0, v)))
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleGuardar = async (enviarAlSupervisor = false, skipModal = false) => {
    if (!empresaSeleccionada) { setError('Seleccioná una empresa'); return }
    if (lineasPedido.filter(l => l.cantidadCajas > 0).length === 0) {
      setError('Ingresá al menos un producto con cantidad mayor a 0')
      return
    }
    
    const pctA = condicionIdx === 6 ? pctACustom : CONDICIONES_PAGO[condicionIdx].pA
    if (pctA > 0 && enviarAlSupervisor) {
      if (!metodoPagoA) { setError('Selecciona un método de pago para la Parte A'); return }
      if (!fechaPagoA) { setError('Ingresa la fecha de vencimiento para la Parte A'); return }
    }


    setSubmitting(true)
    setError('')

    try {
      const url = editId ? `/api/pedidos/${editId}` : '/api/pedidos'
      const method = editId ? 'PUT' : 'POST'

      const is100PercentListA = lineasPedido.filter(l => l.cantidadCajas > 0).every(l => {
        const { priceA } = getAllListPricesForProduct(l.producto);
        return Math.abs(l.precioCajaNegociado - priceA) < 0.01;
      });
      const needsApproval = (negociarTarifaVolumen && totalCajas < minimoCajas) || (is100PercentListA && totalCajas < minimoCajas) || isSelectedListUpcoming();

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: empresaSeleccionada.id,
          tieneTarifaNegociada: needsApproval,
          listaPrecioId: selectedListId,
          detalles: lineasPedido
            .filter(l => l.cantidadCajas > 0)
            .map(l => ({
              productoId: l.producto.id,
              cantidadCajas: l.cantidadCajas,
              cajasBonus: l.cajasBonus,
              descripcionBonus: l.descripcionBonus,
              precioCajaSnapshot: l.precioCajaNegociado,
              cajasFacturaA: 0,
              cajasFacturaX: 0,
            })),
          condicionPago: condicion.label === 'Personalizada' ? `${pctA}/${pctB}` : condicion.label,
          porcentajePagoA: pctA,
          porcentajePagoB: pctB,
          aplicaFinanciera,
          plazosPago,
          observaciones,
          acuerdosComerciales,
          requierePresupuesto,
          turnoEntrega,
          metodoPagoA,
          fechaPagoA
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // If sending to supervisor, patch status
      if (enviarAlSupervisor) {
        const orderId = editId ? Number(editId) : data.pedido.id
        await fetch(`/api/pedidos/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'enviar' }),
        })
      }

      router.push('/pedidos')
    } catch (e: any) {
      setError(e.message || 'Error al guardar el pedido')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Company filter ───────────────────────────────────────────────────────
  const empresasFiltradas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(empresaBusqueda.toLowerCase()) ||
    (e.cuit || '').includes(empresaBusqueda)
  ).slice(0, 8)

  // Group products by line
  const productosPorLinea = productos.reduce((acc, p) => {
    const linea = p.linea || 'otros'
    if (!acc[linea]) acc[linea] = []
    acc[linea].push(p)
    return acc
  }, {} as Record<string, Producto[]>)
  const getListCodeForLine = (l: LineaPedido) => {
    const { priceA, priceB } = getAllListPricesForProduct(l.producto);
    if (Math.abs(l.precioCajaNegociado - priceA) < 0.01) return 'A';
    if (Math.abs(l.precioCajaNegociado - priceB) < 0.01) return 'B';
    return 'C';
  };
  const uniqueListsUsed = new Set(lineasPedido.filter(l => l.cantidadCajas > 0).map(getListCodeForLine));
  const hasMixedLists = uniqueListsUsed.size > 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary text-sm">Cargando formulario...</p>
        </div>
      </div>
    )
  }

  const renderNegociacionBlock = () => (
    <>
          {/* Negociación */}
          <div className="glass-panel card border border-white/5 p-5 flex flex-col gap-4 sticky top-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <Calculator size={15} className="text-yellow-400" />
              Negociación y Facturación
            </h2>

            {/* Condición de pago */}
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">
                Condición de Pago (A% / B%)
              </label>
              <div className="flex flex-col gap-2">
                {CONDICIONES_PAGO.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setCondicionIdx(i)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all flex justify-between items-center ${
                      condicionIdx === i
                        ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400'
                        : 'border-white/10 text-secondary hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>{c.label}</span>
                    {condicionIdx === i && c.pA >= 0 && (
                      <span className="text-[10px] font-black">
                        {c.pA}% A / {c.pB}% B
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom percentages */}
              {condicion.pA === -1 && (
                <div className="flex gap-3 mt-3">
                  <div className="flex-1">
                    <label className="form-label text-[9px] uppercase font-black text-secondary">% Parte A (con IVA)</label>
                    <input
                      type="number" min="0" max="100"
                      value={pctACustom}
                      onChange={e => handlePctAChange(parseInt(e.target.value) || 0)}
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-center text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="form-label text-[9px] uppercase font-black text-secondary">% Parte B (sin IVA)</label>
                    <input
                      type="number" min="0" max="100"
                      value={pctBCustom}
                      onChange={e => { setPctBCustom(parseInt(e.target.value) || 0); setPctACustom(100 - (parseInt(e.target.value) || 0)) }}
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-center text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Financiera toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
              <div>
                <p className="text-white text-xs font-bold">Pago por Financiera</p>
                <p className="text-secondary text-[10px]">Recargo del 3% sobre el total</p>
              </div>
              <div
                onClick={() => setAplicaFinanciera(!aplicaFinanciera)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${aplicaFinanciera ? 'bg-orange-400' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${aplicaFinanciera ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>

            {/* Plazos y Parte A */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="form-label text-[8px] uppercase font-black text-secondary tracking-tight">Plazos de Pago</label>
                <input
                  type="text"
                  value={plazosPago}
                  onChange={e => setPlazosPago(e.target.value)}
                  placeholder="Ej: 30 días / 60 días..."
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>

              {pctA > 0 && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="form-label text-[8px] uppercase font-black text-secondary tracking-tight">Método de Pago (Parte A) *</label>
                    <select
                      value={metodoPagoA}
                      onChange={e => setMetodoPagoA(e.target.value as any)}
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                    >
                      <option value="" className="bg-black text-white">Seleccionar...</option>
                      <option value="cheque" className="bg-black text-white">Cheque</option>
                      <option value="transferencia" className="bg-black text-white">Transferencia</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="form-label text-[8px] uppercase font-black text-secondary tracking-tight">Fecha Venc. (Parte A) *</label>
                    <input
                      type="date"
                      value={fechaPagoA}
                      onChange={e => setFechaPagoA(e.target.value)}
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Dynamic Volume Tier and Negotiation */}
            <div className="p-4 rounded-xl border flex flex-col gap-3 bg-black/30 border-white/5">
              <p className="text-[10px] font-black uppercase text-secondary tracking-wider">Tarifa del Pedido</p>
              
              {totalCajas >= minimoCajas ? (
                <div className="px-3 py-2 rounded-lg bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold flex items-center gap-2">
                  <Package size={14} />
                  ¡Tarifa por Volumen Aplicada! (≥ {minimoCajas} cajas)
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold">
                    Tarifa Estándar activa. Faltan {minimoCajas - totalCajas} cajas para descuento por volumen.
                  </div>
                  
                  {/* Negotiated override */}
                  <label className="flex items-center gap-2 cursor-pointer mt-1 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <input 
                      type="checkbox" 
                      className="shrink-0 h-4 w-4 rounded border-white/10 bg-black/40 text-primary focus:ring-0"
                      checked={negociarTarifaVolumen}
                      onChange={(e) => setNegociarTarifaVolumen(e.target.checked)}
                    />
                    <div className="flex flex-col">
                      <span className="text-white text-xs font-bold">Negociar Tarifa por Volumen</span>
                      <span className="text-secondary text-[9px]">Aplica precios de ≥ {minimoCajas} cajas (Aprobación N1)</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* ── Resumen financiero ──────────────────────────────────────── */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/30 border border-white/5">
              <p className="text-[10px] font-black uppercase text-secondary tracking-wider mb-1">Resumen del Pedido</p>

              <div className="flex justify-between text-xs">
                <span className="text-secondary">Total Cajas</span>
                <span className="text-white font-bold">{totalCajas} {totalBonus > 0 ? `(+${totalBonus} bonus)` : ''}</span>
              </div>

              <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                <span className="text-secondary">Subtotal (sin IVA)</span>
                <span className="text-white font-bold">{fmt(subtotalSinIVA)}</span>
              </div>

              {pctA > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-blue-400/20 text-blue-400 text-[9px] font-black">A</span>
                    Parte A ({pctA}%)
                  </span>
                  <span className="text-blue-300 font-semibold">{fmt(montoParteA)}</span>
                </div>
              )}

              {pctB > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-yellow-400/20 text-yellow-400 text-[9px] font-black">B</span>
                    Parte B ({pctB}%)
                  </span>
                  <span className="text-yellow-300 font-semibold">{fmt(montoParteB)}</span>
                </div>
              )}

              {montoIVA > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <Percent size={11} /> IVA 21% (sobre parte A)
                  </span>
                  <span className="text-blue-400 font-bold">+ {fmt(montoIVA)}</span>
                </div>
              )}

              {aplicaFinanciera && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <Banknote size={11} /> Recargo Financiera 3%
                  </span>
                  <span className="text-orange-400 font-bold">+ {fmt(montoFinanciera)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-white/10 pt-2 mt-1">
                <span className="text-white font-black text-sm">TOTAL GENERAL</span>
                <span className="text-primary font-black text-lg">{fmt(totalGeneral)}</span>
              </div>
            </div>

            {/* Warning if price is negotiated */}
            {(lineasPedido.some(l => l.hasCustomPrice) || (negociarTarifaVolumen && totalCajas < 300) || isSelectedListUpcoming()) && (
              <div className="p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20 text-[10px] text-yellow-400 font-semibold flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Has seleccionado un tarifario no vigente, o negociado precios o tarifas especiales. Este pedido requerirá la aprobación obligatoria de <strong>Gerencia (Nivel 1)</strong>.
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => handleGuardar(false)}
                disabled={submitting}
                className="btn btn-secondary w-full flex items-center justify-center gap-2 text-sm font-bold border border-white/10 hover:border-white/30"
              >
                <Save size={15} />
                {submitting ? 'Guardando...' : 'Guardar Borrador'}
              </button>
              <button
                onClick={() => handleGuardar(true)}
                disabled={submitting}
                className="btn btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-sm font-black"
              >
                <Send size={15} />
                {submitting ? 'Enviando...' : 'Enviar al Supervisor'}
              </button>
            </div>

            {userNivel < 3 && (
              <p className="text-[10px] text-secondary text-center">
                Como Nivel {userNivel}, podés aprobar el pedido directamente
              </p>
            )}
          </div>
    </>
  )

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="text-primary" size={26} />
            {editId ? `Editar ${terminology.pedido}` : `Nuevo ${terminology.pedido}`}
          </h1>
          <p className="text-secondary text-sm mt-1">
            {editId ? `Modificando ${terminology.pedido}` : terminology.pedido} · {activeTenant?.nombre || 'OmniSync'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMobilePrices(!showMobilePrices)}
            className={`md:hidden btn text-xs flex items-center justify-center p-2 rounded-lg ${showMobilePrices ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:bg-white/10'}`}
          >
            <BadgeDollarSign size={16} />
          </button>
          <button 
            onClick={() => setShowMobilePromos(!showMobilePromos)}
            className={`md:hidden btn text-xs flex items-center justify-center p-2 rounded-lg ${showMobilePromos ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:bg-white/10'}`}
          >
            <Tag size={16} />
          </button>
          <button onClick={() => router.back()} className="btn btn-secondary text-xs flex items-center gap-2">
            <X size={14} /> Cancelar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center gap-3 text-red-400 text-sm font-semibold">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="hidden md:grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── LEFT: Main form (2/3) ───────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* ── Sección 1: Datos del cliente ─────────────────────────────── */}
          <div className="glass-panel card border border-white/5 p-6 flex flex-col gap-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <FileText size={15} className="text-primary" />
              Datos del Cliente
            </h2>

            {/* Empresa selector */}
            <div className="form-group mb-0 relative">
              <label className="form-label text-[10px] uppercase font-black text-secondary">
                Razón Social / Empresa *
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary z-10" />
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={empresaSeleccionada ? empresaSeleccionada.nombre : empresaBusqueda}
                  onChange={e => {
                    setEmpresaBusqueda(e.target.value)
                    setEmpresaSeleccionada(null)
                    setShowEmpresaDropdown(true)
                  }}
                  onFocus={() => setShowEmpresaDropdown(true)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl !pl-10"
                />
                {empresaSeleccionada && (
                  <button
                    onClick={() => { setEmpresaSeleccionada(null); setEmpresaBusqueda('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {showEmpresaDropdown && !empresaSeleccionada && empresasFiltradas.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full glass-panel card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                  {empresasFiltradas.map(e => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setEmpresaSeleccionada(e)
                        setShowEmpresaDropdown(false)
                        setEmpresaBusqueda('')
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <p className="text-white text-xs font-bold">{e.nombre}</p>
                      <p className="text-secondary text-[10px]">
                        {e.cuit ? `CUIT: ${e.cuit} · ` : ''}{e.zona || '—'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected company details */}
            {empresaSeleccionada && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                {[
                  { label: 'CUIT', value: empresaSeleccionada.cuit || '—' },
                  { label: 'Zona', value: empresaSeleccionada.zona || '—' },
                  { label: 'Responsable', value: empresaSeleccionada.responsable || '—' },
                  { label: 'Dirección', value: empresaSeleccionada.direccion || '—' },
                  { label: 'Teléfono', value: empresaSeleccionada.telefono || '—' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[10px] uppercase font-black text-secondary">{f.label}</p>
                    <p className="text-white text-xs font-semibold mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tarifario Selector */}
          <div className="glass-panel card border border-white/5 p-6 flex flex-col gap-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <FileText size={15} className="text-primary" />
              Tarifario del Pedido
            </h2>
            
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">
                Seleccionar Tarifario *
              </label>
              {priceLists.length === 0 ? (
                <div className="text-secondary text-xs italic">Cargando tarifarios...</div>
              ) : (
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedListId || ''}
                    onChange={(e) => setSelectedListId(Number(e.target.value))}
                    className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                  >
                    {priceLists.map((l: any) => (
                      <option key={l.id} value={l.id} className="bg-black text-white">
                        {l.nombre} {new Date(l.vigenteDesde) > new Date() ? '(Próxima - Requiere Aprobación N1)' : '(Vigente)'}
                      </option>
                    ))}
                  </select>

                  {isSelectedListUpcoming() && (
                    <div className="px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold flex items-start gap-2">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Atención:</strong> Has seleccionado un tarifario no vigente. Este pedido requerirá la aprobación obligatoria de <strong>Gerencia (Nivel 1)</strong>.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Sección 2: Lista de productos ────────────────────────────── */}
          <div className="glass-panel card border border-white/5 p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <Package size={15} className="text-primary" />
                  Productos y Promociones Activas
                </h2>
              </div>
              
              {promosActivas.length > 0 ? (
                <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] font-black uppercase text-secondary tracking-wider">Promociones Disponibles (Seleccioná para aplicar)</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
                    {promosActivas.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setPromosSeleccionadas(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${promosSeleccionadas[p.id] ? 'bg-primary' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${promosSeleccionadas[p.id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs font-bold text-secondary flex items-center gap-1">
                          <Gift size={12} className={promosSeleccionadas[p.id] ? 'text-primary' : ''} />
                          {p.nombre} (Mín. {p.compraMinima})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-secondary text-xs">No hay promociones activas actualmente.</p>
              )}
            </div>

            {/* Product table per line */}
            {Object.entries(productosPorLinea).map(([linea, prods]) => (
              <div key={linea} className="flex flex-col gap-2">
                <div className="px-1 py-1 text-[10px] font-black uppercase text-primary/70 tracking-widest border-b border-white/5">
                  {LINEAS_LABELS[linea] || linea}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] table-fixed">
                    <colgroup>
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '38%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '6%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '2%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          { label: 'Cód.', align: 'text-left' },
                          { label: 'Producto', align: 'text-left' },
                          { label: 'Paq/Caja', align: 'text-center' },
                          { label: 'Precio Caja (sin IVA)', align: 'text-right' },
                          { label: 'Cantidad', align: 'text-center' },
                          { label: 'Bonus', align: 'text-center' },
                          { label: 'Subtotal', align: 'text-right' },
                          { label: '', align: 'text-center' }
                        ].map((col, idx) => (
                          <th key={idx} className={`px-1 py-1.5 text-[7px] font-black uppercase text-white/30 tracking-wider whitespace-nowrap ${col.align}`}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prods.map(prod => {
                        const linea_ = lineasPedido.find(l => l.producto.id === prod.id)
                        const listPrice = getListPriceForProduct(prod, totalCajas >= 300 || negociarTarifaVolumen)
                        return (
                          <tr key={prod.id} className={`border-t border-white/5 transition-colors ${linea_ && linea_.cantidadCajas > 0 ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}>
                            <td className="px-2 py-2 text-primary font-bold text-[10px] text-left">{prod.codigoInterno}</td>
                            <td className="px-2 py-2 text-white font-semibold text-left leading-tight">{prod.nombre}</td>
                            <td className="px-2 py-2 text-secondary text-center">{prod.paqPorCaja}</td>
                            {/* Negotiated Price Input */}
                            <td className="px-2 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <select 
                                  className={`bg-black/40 border border-white/10 rounded px-1 py-1 text-[9px] focus:outline-none ${
                                    (() => {
                                      if (hasMixedLists && linea_ && linea_.cantidadCajas > 0) {
                                        const { priceA, priceB } = getAllListPricesForProduct(prod);
                                        if (Math.abs(linea_.precioCajaNegociado - priceA) < 0.01) return 'text-green-400 font-bold';
                                        if (Math.abs(linea_.precioCajaNegociado - priceB) < 0.01) return 'text-blue-400 font-bold';
                                        return 'text-red-400 font-bold';
                                      }
                                      return 'text-white';
                                    })()
                                  }`}
                                  value={
                                    (() => {
                                      const currentVal = linea_ ? linea_.precioCajaNegociado : listPrice;
                                      const { priceA, priceB } = getAllListPricesForProduct(prod);
                                      if (Math.abs(currentVal - priceA) < 0.01) return 'A';
                                      if (Math.abs(currentVal - priceB) < 0.01) return 'B';
                                      return 'C';
                                    })()
                                  }
                                  onChange={e => {
                                    const { priceA, priceB } = getAllListPricesForProduct(prod);
                                    let newVal = linea_ ? linea_.precioCajaNegociado : listPrice;
                                    if (e.target.value === 'A') newVal = priceA;
                                    if (e.target.value === 'B') newVal = priceB;
                                    actualizarPrecioNegociado(prod.id, newVal);
                                  }}
                                >
                                  <option value="A">Lista A</option>
                                  <option value="B">Lista B</option>
                                  {(() => {
                                    const currentVal = linea_ ? linea_.precioCajaNegociado : listPrice;
                                    const { priceA, priceB } = getAllListPricesForProduct(prod);
                                    if (Math.abs(currentVal - priceA) >= 0.01 && Math.abs(currentVal - priceB) >= 0.01) {
                                      return <option value="C">C (Manual)</option>;
                                    }
                                    return null;
                                  })()}
                                </select>
                                <div className="relative inline-block text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={linea_ ? linea_.precioCajaNegociado : listPrice}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0
                                      actualizarPrecioNegociado(prod.id, val)
                                    }}
                                    className={`w-16 bg-black/40 border rounded-lg px-1.5 py-0.5 text-[10px] text-white font-semibold text-right focus:border-primary focus:outline-none pr-3 ${
                                      (() => {
                                        const currentVal = linea_ ? linea_.precioCajaNegociado : listPrice;
                                        const { priceA, priceB } = getAllListPricesForProduct(prod);
                                        if (Math.abs(currentVal - priceA) >= 0.01 && Math.abs(currentVal - priceB) >= 0.01) {
                                          return 'border-red-400/50 text-red-400 font-bold bg-red-400/[0.03]';
                                        }
                                        return 'border-white/10';
                                      })()
                                    }`}
                                  />
                                  <span className={`absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black ${
                                    (() => {
                                      const currentVal = linea_ ? linea_.precioCajaNegociado : listPrice;
                                      const { priceA, priceB } = getAllListPricesForProduct(prod);
                                      if (Math.abs(currentVal - priceA) < 0.01) return 'text-green-400';
                                      if (Math.abs(currentVal - priceB) < 0.01) return 'text-blue-400';
                                      return 'text-red-400';
                                    })()
                                  }`}>
                                    {(() => {
                                      const currentVal = linea_ ? linea_.precioCajaNegociado : listPrice;
                                      const { priceA, priceB } = getAllListPricesForProduct(prod);
                                      if (Math.abs(currentVal - priceA) < 0.01) return 'A';
                                      if (Math.abs(currentVal - priceB) < 0.01) return 'B';
                                      return 'C';
                                    })()}
                                  </span>
                                </div>
                              </div>
                              {/* ALERTS */}
                              {(() => {
                                const currentVal = linea_ ? linea_.precioCajaNegociado : listPrice;
                                const { priceA, priceB } = getAllListPricesForProduct(prod);
                                const isCustom = Math.abs(currentVal - priceA) >= 0.01 && Math.abs(currentVal - priceB) >= 0.01;
                                const isDifferentFromDefault = Math.abs(currentVal - listPrice) >= 0.01;

                                if (isCustom) {
                                  return <span className="block text-[8px] text-red-500 font-bold uppercase mt-1 text-right">Cambio de Tarifa</span>;
                                } else if (isDifferentFromDefault) {
                                  return <span className="block text-[8px] text-yellow-400 font-bold uppercase mt-1 text-right">Negociada</span>;
                                }
                                return null;
                              })()}
                            </td>

                            {/* Quantity input */}
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  onClick={() => linea_ ? actualizarCantidad(prod.id, -1) : null}
                                  className="w-5 h-5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-secondary hover:text-white transition-all"
                                >
                                  <Minus size={9} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={linea_?.cantidadCajas || 0}
                                  onChange={e => {
                                    if (!linea_) agregarProducto(prod)
                                    setCantidadDirecta(prod.id, parseInt(e.target.value) || 0)
                                  }}
                                  onFocus={() => !linea_ && agregarProducto(prod)}
                                  className={`w-10 text-center bg-black/40 border border-white/10 rounded-lg py-0.5 text-[10px] font-bold focus:border-primary focus:outline-none ${
                                    (() => {
                                      if (hasMixedLists && linea_ && linea_.cantidadCajas > 0) {
                                        const { priceA, priceB } = getAllListPricesForProduct(prod);
                                        if (Math.abs(linea_.precioCajaNegociado - priceA) < 0.01) return 'text-green-400';
                                        if (Math.abs(linea_.precioCajaNegociado - priceB) < 0.01) return 'text-blue-400';
                                        return 'text-red-400';
                                      }
                                      return 'text-white';
                                    })()
                                  }`}
                                />
                                <button
                                  onClick={() => {
                                    if (!linea_) agregarProducto(prod)
                                    actualizarCantidad(prod.id, 1)
                                  }}
                                  className="w-5 h-5 rounded-lg bg-white/5 hover:bg-primary/30 flex items-center justify-center text-secondary hover:text-primary transition-all"
                                >
                                  <Plus size={9} />
                                </button>
                              </div>
                            </td>

                            {/* Bonus */}
                            <td className="px-2 py-2 text-center">
                              {linea_ && linea_.cajasBonus > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black">
                                  +{linea_.cajasBonus}
                                </span>
                              ) : (
                                <span className="text-white/20 text-[10px]">—</span>
                              )}
                            </td>

                            {/* Subtotal */}
                            <td className="px-2 py-2 text-white text-[11px] font-black whitespace-nowrap text-right">
                              {linea_ && linea_.cantidadCajas > 0 ? fmt(linea_.subtotal) : '—'}
                            </td>

                            {/* Remove */}
                            <td className="px-2 py-2 text-center">
                              {linea_ && (
                                <button
                                  onClick={() => eliminarLinea(prod.id)}
                                  className="btn-action w-6 h-6 text-secondary hover:text-red-400 hover:bg-red-400/10 border-transparent"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {lineasPedido.filter(l => l.cajasBonus > 0).length > 0 && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-semibold text-primary flex items-center gap-2">
                <Gift size={13} />
                Total cajas bonificadas: <strong>{totalBonus}</strong> caja(s) de regalo
              </div>
            )}
          </div>

          {/* ── Sección 3: Logística ─────────────────────────────────────── */}
          <div className="glass-panel card border border-white/5 p-6 flex flex-col gap-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <Info size={15} className="text-secondary" />
              Logística y Observaciones
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Turno entrega */}
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">
                  Turno para entrega
                </label>
                <div className="flex gap-3">
                  {['SI', 'NO'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTurnoEntrega(turnoEntrega === opt ? '' : opt as 'SI' | 'NO')}
                      className={`btn-toggle flex-1 justify-center ${
                        turnoEntrega === opt ? 'active' : ''
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requiere presupuesto */}
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">
                  Requiere Presupuesto
                </label>
                <div className="flex gap-3">
                  {['SI', 'NO'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setRequierePresupuesto(opt === 'SI')}
                      className={`btn-toggle flex-1 justify-center ${
                        (requierePresupuesto && opt === 'SI') || (!requierePresupuesto && opt === 'NO') ? 'active' : ''
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Observaciones generales del pedido..."
                rows={2}
                className="form-input bg-black/40 border border-white/10 rounded-xl resize-none text-sm"
                spellCheck="true" lang="es-AR" autoCorrect="on"
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Acuerdos Comerciales</label>
              <textarea
                value={acuerdosComerciales}
                onChange={e => setAcuerdosComerciales(e.target.value)}
                placeholder="Acuerdos especiales pactados en la negociación..."
                rows={2}
                className="form-input bg-black/40 border border-white/10 rounded-xl resize-none text-sm"
                spellCheck="true" lang="es-AR" autoCorrect="on"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Calculator & Negotiation (1/3) ───────────────────────── */}
        <div className="flex flex-col gap-4">

          {renderNegociacionBlock()}
        </div>
      </div>

      {/* ── MOBILE VIEW (PRE-PEDIDO) ────────────────────────────────────────── */}
      <div className="flex md:hidden flex-col gap-4 mb-24">
        {/* Empresa Selector */}
        <div className="glass-panel p-4 rounded-xl flex flex-col gap-3">
          <label className="text-xs font-black uppercase text-secondary">Cliente</label>
          {empresaSeleccionada ? (
            <div className="flex justify-between items-center bg-primary/10 border border-primary/20 p-3 rounded-xl">
              <div>
                <p className="text-white font-bold text-sm">{empresaSeleccionada.nombre}</p>
                <p className="text-secondary text-[10px]">{empresaSeleccionada.direccion || 'Sin dirección'}</p>
              </div>
              <button onClick={() => setEmpresaSeleccionada(null)} className="text-white bg-black/50 p-2 rounded-full">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary z-10" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={empresaBusqueda}
                onChange={e => {
                  setEmpresaBusqueda(e.target.value)
                  setShowEmpresaDropdown(true)
                }}
                onFocus={() => setShowEmpresaDropdown(true)}
                className="form-input bg-black/40 border border-white/10 rounded-xl pl-9"
              />
              {showEmpresaDropdown && empresasFiltradas.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full glass-panel card border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                  {empresasFiltradas.map(e => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setEmpresaSeleccionada(e)
                        setShowEmpresaDropdown(false)
                        setEmpresaBusqueda('')
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <p className="text-white text-xs font-bold">{e.nombre}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showMobilePromos && (
          <div className="glass-panel card border border-white/5 p-4 flex flex-col gap-3">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Package size={15} className="text-primary" />
              Promociones Activas
            </h2>
            {promosActivas.length > 0 ? (
              <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] font-black uppercase text-secondary tracking-wider">Seleccioná para aplicar</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
                  {promosActivas.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!promosSeleccionadas[p.id]}
                        onChange={() => setPromosSeleccionadas(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className="form-checkbox shrink-0 h-4 w-4 bg-black/40 border-white/20 text-primary rounded focus:ring-primary/50"
                      />
                      <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{p.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-secondary text-xs">No hay promociones activas actualmente.</p>
            )}
          </div>
        )}

        {/* Productos */}
        <div className="glass-panel p-4 rounded-xl flex flex-col gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary z-10" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={productoBusqueda}
              onChange={e => setProductoBusqueda(e.target.value)}
              className="form-input bg-black/40 border border-white/10 rounded-xl pl-9 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            {productos
              .filter(p => p.nombre.toLowerCase().includes(productoBusqueda.toLowerCase()) || p.codigoInterno.includes(productoBusqueda))
              .map(prod => {
                const linea = lineasPedido.find(l => l.producto.id === prod.id)
                const cantidad = linea ? linea.cantidadCajas : 0
                return (
                  <div key={prod.id} className="flex flex-col bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col flex-1 pr-2">
                        <span className="text-[10px] text-primary font-bold">{prod.codigoInterno}</span>
                        <span className="text-white text-xs font-semibold leading-tight">{prod.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                        onClick={() => setCantidadDirecta(prod.id, cantidad - 1)}
                        className="bg-white/10 p-2 rounded-full text-white active:bg-white/20"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={cantidad === 0 ? '' : cantidad}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          if (!linea && val > 0) {
                            agregarProducto(prod)
                            setTimeout(() => setCantidadDirecta(prod.id, val), 50)
                          } else {
                            setCantidadDirecta(prod.id, val)
                          }
                        }}
                        className={`w-12 text-center bg-transparent font-bold outline-none border-b border-white/20 focus:border-primary ${
                        (() => {
                          if (hasMixedLists && cantidad > 0 && linea) {
                            const { priceA, priceB } = getAllListPricesForProduct(prod);
                            if (Math.abs(linea.precioCajaNegociado - priceA) < 0.01) return 'text-green-400';
                            if (Math.abs(linea.precioCajaNegociado - priceB) < 0.01) return 'text-blue-400';
                            return 'text-red-400';
                          }
                          return 'text-white';
                        })()
                      }`} />
                      <button 
                        onClick={() => {
                          if (!linea) {
                            agregarProducto(prod)
                            setTimeout(() => setCantidadDirecta(prod.id, 1), 50)
                          } else {
                            setCantidadDirecta(prod.id, cantidad + 1)
                          }
                        }}
                        className="bg-primary p-2 rounded-full text-white active:bg-primary/80"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  {showMobilePrices && linea && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-secondary font-bold uppercase">Precio Negociado ($):</span>
                        <div className="flex items-center gap-1">
                          <select
                            className="bg-black/50 border border-white/20 rounded-md text-xs text-white px-1 py-1 outline-none focus:border-primary"
                            value={
                              (() => {
                                const listPrice = getListPriceForProduct(prod, totalCajas >= 300 || negociarTarifaVolumen);
                                const currentVal = linea.precioCajaNegociado;
                                const { priceA, priceB } = getAllListPricesForProduct(prod);
                                if (Math.abs(currentVal - priceA) < 0.01) return 'A';
                                if (Math.abs(currentVal - priceB) < 0.01) return 'B';
                                return 'C';
                              })()
                            }
                            onChange={e => {
                              const listPrice = getListPriceForProduct(prod, totalCajas >= 300 || negociarTarifaVolumen);
                              const { priceA, priceB } = getAllListPricesForProduct(prod);
                              let newVal = linea.precioCajaNegociado;
                              if (e.target.value === 'A') newVal = priceA;
                              if (e.target.value === 'B') newVal = priceB;
                              actualizarPrecioNegociado(prod.id, newVal);
                            }}
                          >
                            <option value="A">Lista A</option>
                            <option value="B">Lista B</option>
                            {(() => {
                              const currentVal = linea.precioCajaNegociado;
                              const { priceA, priceB } = getAllListPricesForProduct(prod);
                              if (Math.abs(currentVal - priceA) >= 0.01 && Math.abs(currentVal - priceB) >= 0.01) {
                                return <option value="C">C (Manual)</option>;
                              }
                              return null;
                            })()}
                          </select>
                          <input
                            type="number"
                            value={linea.precioCajaNegociado || ''}
                            onChange={(e) => actualizarPrecioNegociado(prod.id, Number(e.target.value))}
                            className={`bg-black/50 border rounded-md text-right text-sm text-white px-2 py-1 w-20 outline-none focus:border-primary ${
                              (() => {
                                const currentVal = linea.precioCajaNegociado;
                                const { priceA, priceB } = getAllListPricesForProduct(prod);
                                if (Math.abs(currentVal - priceA) >= 0.01 && Math.abs(currentVal - priceB) >= 0.01) {
                                  return 'border-red-400/50 text-red-400 font-bold bg-red-400/[0.03]';
                                }
                                return 'border-white/20';
                              })()
                            }`}
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>

        <div className="md:hidden mt-4 pb-12">{renderNegociacionBlock()}</div>

    </div>
  )
}
