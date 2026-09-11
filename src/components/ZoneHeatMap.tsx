'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Flame, Eye, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react'

type HeatPoint = {
  lat: number
  lng: number
  weight: number
  nombre: string
  zona?: string
}

type AllPoint = {
  id?: number
  lat: number
  lng: number
  zona?: string | null
  nombre?: string
  estado?: string | null
  motivoBaja?: string | null
  vendedorAsignado?: string | null
}

type Props = {
  visitas: HeatPoint[]
  ventas: HeatPoint[]
  totalEmpresas: number
  empresasSinCoordenadas?: number
  selectedZones?: string[]
  userNivel?: number
  userZona?: string | null
  allPoints?: AllPoint[]
  vendedoresDisponibles?: { alias: string, nombre: string }[]
}

// Color and label per estado
const ESTADO_CONFIG: Record<string, { color: string; glow: string; label: string; emoji: string }> = {
  activo:     { color: '#22c55e', glow: '#22c55e80', label: 'Cliente Activo', emoji: '✅' },
  prospecto:  { color: '#f59e0b', glow: '#f59e0b80', label: 'Potencial',      emoji: '🟡' },
  descartada: { color: '#8b5cf6', glow: '#8b5cf680', label: 'Descartada',     emoji: '🟣' },
  baja:       { color: '#ef4444', glow: '#ef444480', label: 'Baja',           emoji: '🔴' },
}

// GBA default center — wide view
const GBA_CENTER: [number, number] = [-34.65, -58.55]
const GBA_ZOOM = 10

const ZONE_CENTERS: Record<string, [number, number]> = {
  'CABA':      [-34.6118, -58.4173],
  'GBA NORTE': [-34.48,   -58.52],
  'GBA SUR':   [-34.82,   -58.40],
  'GBA OESTE': [-34.66,   -58.72],
  'SUR':       [-34.82,   -58.40],
  'NORTE':     [-34.48,   -58.52],
  'OESTE':     [-34.66,   -58.72],
}

// Dynamic palette for sellers (Fluorescent/Neon colors)
const SELLER_PALETTE = [
  '#00ffff', // Cyan Fluorescente
  '#ffffff', // Blanco
  '#ff00ff', // Magenta Fluorescente
  '#ccff00', // Amarillo Fluorescente
  '#39ff14', // Verde Neón
  '#ff0055', // Rosa/Rojo Neón
]

export function ZoneHeatMap({ visitas, ventas, totalEmpresas, empresasSinCoordenadas = 0, selectedZones, userNivel, userZona, allPoints, vendedoresDisponibles = [] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const heatLayerRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const companyMarkersRef = useRef<any>(null)
  const territoryLayerRef = useRef<any>(null)

  // Default mode → ventas
  const [mode, setMode] = useState<'visitas' | 'ventas'>('ventas')
  const [showCompanies, setShowCompanies] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeMsg, setGeocodeMsg] = useState('')
  const [territories, setTerritories] = useState<any[]>([])
  const [visibleEstados, setVisibleEstados] = useState<string[]>(['activo', 'prospecto', 'descartada', 'baja'])
  const [isFullscreen, setIsFullscreen] = useState(false)

  const activeData = mode === 'visitas' ? visitas : ventas
  const hasData = activeData.length > 0
  const noEmpresas = totalEmpresas === 0
  const hasPendingCoordinates = empresasSinCoordenadas > 0

  const getMapCenter = () => {
    if (userNivel === 3 && userZona) {
      const key = Object.keys(ZONE_CENTERS).find(k =>
        userZona.toUpperCase().includes(k) || k.includes(userZona.toUpperCase())
      )
      if (key) return { center: ZONE_CENTERS[key], zoom: 12 }
    }
    return { center: GBA_CENTER, zoom: GBA_ZOOM }
  }

  const handleGeocode = useCallback(async () => {
    setIsGeocoding(true)
    setGeocodeMsg('Geocodificando direcciones...')
    
    let remaining = 1
    let totalUpdated = 0

    try {
      while (remaining > 0) {
        const res = await fetch('/api/geocode', { method: 'POST' })
        if (!res.ok) throw new Error('Network response was not ok')
        const data = await res.json()
        
        if (data.updated) totalUpdated += data.updated
        
        remaining = data.remaining || 0
        
        if (remaining > 0) {
          setGeocodeMsg(`Buscando... Actualizadas: ${totalUpdated}. Faltan: ${remaining}.`)
        } else {
          setGeocodeMsg(`✓ ${totalUpdated} empresas actualizadas. Recargá la página para ver los cambios en el mapa.`)
        }
      }
    } catch {
      setGeocodeMsg('Error al geocodificar. Intentá de nuevo.')
    } finally {
      setIsGeocoding(false)
    }
  }, [])

  // Build company marker layer
  const buildCompanyMarkers = useCallback(async (L: any, map: any) => {
    if (companyMarkersRef.current) {
      companyMarkersRef.current.remove()
      companyMarkersRef.current = null
    }
    if (!showCompanies || !allPoints || allPoints.length === 0) return

    const group = L.layerGroup()
    const isSegmented = selectedZones && selectedZones.length === 1

    allPoints.forEach((point: AllPoint, index: number) => {
      const estadoKey = point.estado?.toLowerCase() || ''
      if (visibleEstados.length > 0 && !visibleEstados.includes(estadoKey)) return

      const cfg = ESTADO_CONFIG[estadoKey] || ESTADO_CONFIG.prospecto
      const isBajaOrDescartada = ['baja', 'descartada'].includes(estadoKey)
      const motivoHtml = isBajaOrDescartada && point.motivoBaja 
        ? `<div style="margin-top:6px;padding:4px 6px;background:rgba(0,0,0,0.05);border-left:2px solid ${cfg.color};font-size:10px;color:#475569;font-style:italic;">Motivo: ${point.motivoBaja}</div>` 
        : ''

      let pinColor = cfg.color
      let svgDefs = ''
      let svgFill = `fill="${pinColor}"`
      let sellerInfo = ''

      // Dual-Color Pin logic when segmented
      if (isSegmented && point.vendedorAsignado) {
        const sellerIndex = vendedoresDisponibles.findIndex(v => v.alias === point.vendedorAsignado)
        const sColor = SELLER_PALETTE[Math.max(0, sellerIndex) % SELLER_PALETTE.length]
        
        svgDefs = `
          <defs>
            <linearGradient id="grad-${point.lat.toString().replace('.','')}-${point.lng.toString().replace('.','')}-${index}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="35%" stop-color="${cfg.color}" />
              <stop offset="35%" stop-color="${sColor}" stop-opacity="0.4" />
              <stop offset="100%" stop-color="${sColor}" stop-opacity="0.4" />
            </linearGradient>
          </defs>
        `
        svgFill = `fill="url(#grad-${point.lat.toString().replace('.','')}-${point.lng.toString().replace('.','')}-${index})"`
        pinColor = sColor // Update base color for border glow
        
        const sellerName = vendedoresDisponibles.find(v => v.alias === point.vendedorAsignado)?.nombre || point.vendedorAsignado
        const textColor = sColor === '#ffffff' ? '#475569' : sColor
        const bgColor = sColor === '#ffffff' ? '#f1f5f9' : sColor + '20'
        const borderColor = sColor === '#ffffff' ? '#cbd5e1' : sColor + '50'
        sellerInfo = `<div style="display:inline-block;margin-top:4px;margin-left:4px;background:${bgColor};color:${textColor};border:1px solid ${borderColor};padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px;">👤 ${sellerName}</div>`
      }

      const zoneSelectHtml = point.id && territories.length > 0 ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.1)">
          <label style="font-size:10px;color:#64748b;font-weight:700;display:block;margin-bottom:2px">ASIGNAR A ZONA:</label>
          <select 
            onchange="if(this.value && this.value !== '${point.zona || ''}') window.handleReassignZonaFromMap(${point.id}, this.value)" 
            style="width:100%;font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;"
          >
            <option value="">-- Seleccionar Zona --</option>
            ${territories.map(t => `<option value="${t.nombre}" ${t.nombre === point.zona ? 'selected' : ''}>${t.nombre}</option>`).join('')}
          </select>
        </div>
      ` : ''

      const icon = L.divIcon({
        html: `<div title="${point.nombre || ''}" style="position:relative;width:24px;height:36px;cursor:pointer;transition:transform 0.15s;filter:drop-shadow(0px 3px 4px rgba(0,0,0,0.4));">
          <svg viewBox="0 0 32 48" style="width:24px;height:36px;">
            ${svgDefs}
            <path ${svgFill} d="M16 0C7.16 0 0 7.16 0 16c0 12 16 32 16 32s16-20 16-32C32 7.16 24.84 0 16 0z" />
            <circle cx="16" cy="16" r="6" fill="white" />
          </svg>
        </div>`,
        className: '',
        iconSize: [24, 36],
        iconAnchor: [12, 36]
      })

      L.marker([point.lat, point.lng], { icon })
        .bindPopup(`
          <div style="font-family:Arial;font-size:12px;min-width:160px;line-height:1.6;padding:2px 0">
            <strong style="color:#0f172a;font-size:13px">${point.nombre || 'Empresa'}</strong><br/>
            <span style="color:#64748b;font-size:11px">${point.zona || ''}</span><br/>
            <span style="
              display:inline-block;margin-top:4px;
              background:${cfg.color}20;color:${cfg.color};
              border:1px solid ${cfg.color}50;
              padding:2px 8px;border-radius:12px;
              font-weight:700;font-size:11px;
            ">${cfg.emoji} ${cfg.label}</span>
            ${sellerInfo}
            ${motivoHtml}
            ${zoneSelectHtml}
          </div>
        `, { closeButton: false, maxWidth: 220 })
        .addTo(group)
    })

    group.addTo(map)
    companyMarkersRef.current = group
  }, [showCompanies, allPoints, visibleEstados])

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const { center, zoom } = getMapCenter()

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center, zoom,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19,
        minZoom: 6,
      }).addTo(map)

      map.zoomControl.setPosition('bottomright')
      mapInstanceRef.current = map

      if (typeof window !== 'undefined') {
        (window as any).handleReassignZonaFromMap = async (empresaId: number, nuevaZona: string) => {
          if (!nuevaZona) return
          if (!confirm(`¿Deseas reasignar manualmente esta empresa a la zona ${nuevaZona}?`)) return
          try {
            const res = await fetch(`/api/empresas/${empresaId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ zona: nuevaZona })
            })
            const data = await res.json()
            if (res.ok && data.success) {
              window.location.reload()
            } else {
              alert(data.error || 'Error al reasignar zona')
            }
          } catch (e: any) {
            alert(e.message || 'Error al reasignar zona')
          }
        }
      }

      setIsLoaded(true)
    })

    // Fetch territories
    fetch('/api/zonas').then(r=>r.json()).then(data => {
      if (Array.isArray(data)) setTerritories(data)
    }).catch(e => console.error(e))

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle map resize on fullscreen toggle
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize()
      }, 300)
    }
  }, [isFullscreen, isLoaded])

  // Update heat layer on mode/data change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return

    import('leaflet').then(async (L) => {
      const map = mapInstanceRef.current

      if (heatLayerRef.current) { heatLayerRef.current.remove(); heatLayerRef.current = null }
      if (markersLayerRef.current) { markersLayerRef.current.remove(); markersLayerRef.current = null }
      if (territoryLayerRef.current) { territoryLayerRef.current.remove(); territoryLayerRef.current = null }

      // Build territories
      if (territories.length > 0) {
        const tGroup = L.layerGroup()
        territories.forEach(zona => {
          if (zona.geojson) {
            L.geoJSON(zona.geojson, {
              style: {
                color: zona.color || '#3b82f6',
                weight: 2,
                opacity: 0.4,
                fillColor: zona.color || '#3b82f6',
                fillOpacity: 0.15
              }
            }).addTo(tGroup)
          }
        })
        tGroup.addTo(map)
        territoryLayerRef.current = tGroup
      }

      // Build company markers
      await buildCompanyMarkers(L, map)

      if (activeData.length === 0) return

      const Lany = L as any
      if (typeof window !== 'undefined') {
        (window as any).L = L
      }
      try { await import('leaflet.heat') } catch (e) { console.error('Error loading leaflet.heat', e) }

      const maxWeight = Math.max(...activeData.map(p => p.weight), 1)
      const heatPoints = activeData.map(p => [
        p.lat, p.lng, Math.min(p.weight / maxWeight, 1)
      ] as [number, number, number])

      const gradient = mode === 'visitas'
        ? { 0.2: '#1d4ed8', 0.5: '#38bdf8', 0.8: '#fbbf24', 1.0: '#ef4444' } // Blue to Red for visits
        : { 0.2: '#14532d', 0.5: '#22c55e', 0.8: '#fbbf24', 1.0: '#ef4444' } // Green to Red for sales

      if (Lany.heatLayer) {
        heatLayerRef.current = Lany.heatLayer(heatPoints, {
          radius: 35, blur: 15, maxZoom: 17, max: 1.0, gradient
        }).addTo(map)
      } else if ((window as any).L?.heatLayer) {
         heatLayerRef.current = (window as any).L.heatLayer(heatPoints, {
          radius: 35, blur: 15, maxZoom: 17, max: 1.0, gradient
        }).addTo(map)
      }

      // Activity markers (glowing dots on top of heat)
      const group = L.layerGroup()
      const dotColor = mode === 'visitas' ? '#60a5fa' : '#34d399'
      activeData.forEach(point => {
        const intensity = Math.min(point.weight / maxWeight, 1)
        const size = 10 + (intensity * 30) // from 10px to 40px based on weight
        const offset = size / 2

        const icon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${dotColor};border:2px solid white;border-radius:50%;box-shadow:0 0 8px ${dotColor};opacity:0.9"></div>`,
          className: '', iconSize: [size, size], iconAnchor: [offset, offset]
        })
        L.marker([point.lat, point.lng], { icon })
          .bindPopup(`
            <div style="font-family:Arial;font-size:12px;min-width:150px;line-height:1.5">
              <strong style="color:#0f172a">${point.nombre}</strong><br/>
              <span style="color:#64748b;font-size:11px">${point.zona || ''}</span><br/>
              <span style="color:${dotColor};font-weight:bold;font-size:14px">
                ${point.weight} ${mode === 'visitas' ? 'interacción(es)' : 'caja(s) vendida(s)'}
              </span>
            </div>
          `, { closeButton: false })
          .addTo(group)
      })
      group.addTo(map)
      markersLayerRef.current = group

      if (activeData.length > 1) {
        map.fitBounds(
          L.latLngBounds(activeData.map(p => [p.lat, p.lng] as [number, number])),
          { padding: [50, 50], maxZoom: 14 }
        )
      } else if (activeData.length === 1) {
        map.setView([activeData[0].lat, activeData[0].lng], 14)
      }
    })
  }, [mode, isLoaded, visitas, ventas, buildCompanyMarkers, territories])

  // Toggle company markers without rebuilding heat
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return
    import('leaflet').then((L) => buildCompanyMarkers(L, mapInstanceRef.current))
  }, [showCompanies, isLoaded, buildCompanyMarkers])

  // Leyenda de estados
  const estadoEntries = Object.entries(ESTADO_CONFIG)

  return (
    <div style={{
      width: isFullscreen ? '100vw' : '100%',
      height: isFullscreen ? '100vh' : 'auto',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 1,
      background: 'rgba(15,23,42,0.95)',
      borderRadius: isFullscreen ? '0px' : '16px',
      border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.1rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexWrap: 'wrap',
        justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem'
      }}>
        {/* Left: title + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: mode === 'visitas' ? '#3b82f6' : '#22c55e',
            boxShadow: `0 0 10px ${mode === 'visitas' ? '#3b82f6' : '#22c55e'}`
          }} />
          <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Mapa de Calor — {mode === 'visitas' ? 'Gestión de Visitas' : 'Gestión de Ventas'}
          </h4>
          <span style={{ fontSize: '0.68rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
            {activeData.length} activos / {totalEmpresas} geo
          </span>
          {userZona && userNivel === 3 && (
            <span style={{ fontSize: '0.68rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.2)' }}>
              📍 {userZona}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Companies toggle */}
          <button
            onClick={() => setShowCompanies(v => !v)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: `1px solid ${showCompanies ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: showCompanies ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: showCompanies ? '#a78bfa' : '#64748b',
              fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {showCompanies ? '🏢 Empresas ON' : '🏢 Empresas OFF'}
          </button>

          {/* Geocode button */}
          {hasPendingCoordinates && (
            <button onClick={handleGeocode} disabled={isGeocoding} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              border: '1px solid rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.1)', color: '#fbbf24',
              cursor: 'pointer', transition: 'all 0.2s'
            }} title="Cargar Coordenadas Faltantes">
              <RefreshCw size={16} className={isGeocoding ? 'animate-spin' : ''} />
            </button>
          )}

          {/* Mode toggle */}
          <div style={{
            display: 'flex', gap: '0.4rem',
            background: 'rgba(255,255,255,0.04)',
            padding: '3px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <button onClick={() => setMode('visitas')} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700,
              background: mode === 'visitas' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: mode === 'visitas' ? '#60a5fa' : '#64748b',
              transition: 'all 0.2s'
            }}>
              <Eye size={12} /> Visitas
            </button>
            <button onClick={() => setMode('ventas')} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700,
              background: mode === 'ventas' ? 'rgba(34,197,94,0.2)' : 'transparent',
              color: mode === 'ventas' ? '#34d399' : '#64748b',
              transition: 'all 0.2s'
            }}>
              <Flame size={12} /> Ventas
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
            }}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Estado legend */}
      <div style={{
        padding: '0.5rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtro Empresas:</span>
        {estadoEntries.map(([key, cfg]) => {
          const isActive = visibleEstados.includes(key)
          return (
            <button 
              key={key} 
              onClick={() => {
                if (isActive) {
                  setVisibleEstados(visibleEstados.filter(k => k !== key))
                } else {
                  setVisibleEstados([...visibleEstados, key])
                }
              }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '5px', 
                fontSize: '0.7rem', color: isActive ? cfg.color : '#475569',
                background: isActive ? `${cfg.color}15` : 'transparent',
                border: `1px solid ${isActive ? `${cfg.color}30` : 'rgba(255,255,255,0.05)'}`,
                padding: '4px 8px', borderRadius: '12px',
                cursor: 'pointer', transition: 'all 0.2s',
                textDecoration: isActive ? 'none' : 'line-through'
              }}
            >
              <span style={{ 
                width: '9px', height: '9px', borderRadius: '50%', 
                background: isActive ? cfg.color : '#475569', 
                display: 'inline-block', 
                boxShadow: isActive ? `0 0 5px ${cfg.glow}` : 'none' 
              }} />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Geocode message */}
      {geocodeMsg && (
        <div style={{
          padding: '0.5rem 1.5rem', fontSize: '0.75rem',
          color: geocodeMsg.startsWith('✓') ? '#34d399' : '#fbbf24',
          background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          {geocodeMsg}
        </div>
      )}

      {/* Map Container */}
      <div style={{ position: 'relative', width: '100%', height: isFullscreen ? '100%' : '480px', flex: isFullscreen ? 1 : 'none' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />



        {/* No coordinates overlay */}
        {isLoaded && noEmpresas && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.75)', gap: '0.75rem', zIndex: 500
          }}>
            <AlertCircle size={28} color="#f59e0b" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
              Ninguna empresa tiene coordenadas cargadas.<br />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Presioná "Cargar Coordenadas" para geocodificarlas automáticamente.
              </span>
            </p>
          </div>
        )}

        {/* Heat density legend */}
        {isLoaded && hasData && (
          <div style={{
            position: 'absolute', bottom: '50px', left: '12px',
            background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '7px 12px',
            display: 'flex', gap: '10px', alignItems: 'center',
            backdropFilter: 'blur(8px)', zIndex: 1000, fontSize: '0.65rem'
          }}>
            <span style={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Densidad</span>
            <span style={{ color: mode === 'visitas' ? '#1d4ed8' : '#14532d' }}>● Baja</span>
            <span style={{ color: '#38bdf8' }}>● Media</span>
            <span style={{ color: '#fbbf24' }}>● Alta</span>
            <span style={{ color: '#ef4444' }}>● Máxima</span>
          </div>
        )}
      </div>
    </div>
  )
}
