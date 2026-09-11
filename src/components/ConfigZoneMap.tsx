'use client'
import React, { useEffect, useRef, useState } from 'react'

interface ConfigZoneMapProps {
  initialGeojson?: any
  color: string
  onChange: (geojson: any) => void
}

export default function ConfigZoneMap({ initialGeojson, color, onChange }: ConfigZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layerGroupRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    Promise.all([
      import('leaflet'),
      import('@geoman-io/leaflet-geoman-free')
    ]).then(([L]) => {
      // Import CSS
      const linkLeaflet = document.createElement('link')
      linkLeaflet.rel = 'stylesheet'
      linkLeaflet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(linkLeaflet)

      const linkGeoman = document.createElement('link')
      linkGeoman.rel = 'stylesheet'
      linkGeoman.href = 'https://unpkg.com/@geoman-io/leaflet-geoman-free@2.14.2/dist/leaflet-geoman.css'
      document.head.appendChild(linkGeoman)

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([-34.6037, -58.3816], 10)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19,
      }).addTo(map)

      map.pm.addControls({
        position: 'topleft',
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: true,
        drawPolygon: true,
        drawCircle: false,
        drawText: false,
        editMode: true,
        dragMode: true,
        cutPolygon: true,
        removalMode: true,
      })

      map.pm.setPathOptions({
        color: color,
        fillColor: color,
        fillOpacity: 0.4,
      })

      layerGroupRef.current = L.featureGroup().addTo(map)

      let hasFeatures = false

      if (initialGeojson) {
        const geoLayer = L.geoJSON(initialGeojson, {
          style: {
            color: color,
            weight: 2,
            opacity: 0.8,
            fillColor: color,
            fillOpacity: 0.4
          }
        })
        geoLayer.eachLayer(layer => {
          layerGroupRef.current.addLayer(layer)
          hasFeatures = true
        })
      }

      if (hasFeatures) {
        try {
          map.fitBounds(layerGroupRef.current.getBounds())
        } catch (e) {
          // ignore
        }
      }

      const updateGeoJSON = () => {
        const layers = layerGroupRef.current.getLayers()
        if (layers.length === 0) {
          onChange(null)
          return
        }
        
        const features = layers.map((layer: any) => layer.toGeoJSON())
        
        const featureCollection = {
          type: 'FeatureCollection',
          features: features
        }
        onChange(featureCollection)
      }

      map.on('pm:create', (e: any) => {
        layerGroupRef.current.addLayer(e.layer)
        
        // Listen for edits on the newly created layer
        e.layer.on('pm:edit', updateGeoJSON)
        e.layer.on('pm:dragend', updateGeoJSON)
        e.layer.on('pm:cut', updateGeoJSON)
        
        updateGeoJSON()
      })

      map.on('pm:remove', (e: any) => {
        layerGroupRef.current.removeLayer(e.layer)
        updateGeoJSON()
      })

      layerGroupRef.current.eachLayer((layer: any) => {
        layer.on('pm:edit', updateGeoJSON)
        layer.on('pm:dragend', updateGeoJSON)
        layer.on('pm:cut', updateGeoJSON)
      })

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update color dynamically
  useEffect(() => {
    if (mapInstanceRef.current && layerGroupRef.current) {
      mapInstanceRef.current.pm.setPathOptions({
        color: color,
        fillColor: color,
        fillOpacity: 0.4,
      })
      layerGroupRef.current.eachLayer((layer: any) => {
        if (layer.setStyle) {
          layer.setStyle({ color: color, fillColor: color })
        }
      })
    }
  }, [color])

  return (
    <div className="w-full relative rounded-lg overflow-hidden border border-border">
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '400px' }}
      />
    </div>
  )
}
