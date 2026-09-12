'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ConfigZoneMap = dynamic(() => import('@/components/ConfigZoneMap'), { ssr: false })
import { Upload, Link2, Trash2, Save, Image as ImageIcon, Settings, Users, Power, Edit2, Building, MapPin, Copy } from 'lucide-react'
import { saveLogo, deleteLogo } from './actions'
import { useTenant } from '@/lib/tenantContext'
import { formatImageUrl } from '@/lib/imageUtils'

type Props = {
  currentLogo: string | null
}

export function ConfigPageClient({ currentLogo }: Props) {
  const { activeTenant, terminology } = useTenant()
  const [userNivel, setUserNivel] = useState<number | null>(null)
  const [userAlias, setUserAlias] = useState<string>('')
  const [userIsNivelTodo, setUserIsNivelTodo] = useState<boolean>(false)
  const isAdmin = userAlias === 'admin'
  
  const [logoUrl, setLogoUrl] = useState<string>(currentLogo || '')
  const [isSaving, setIsSaving] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Tariffs state
  const [listasTarifas, setListasTarifas] = useState<any[]>([])
  const [newTarifaName, setNewTarifaName] = useState('')
  const [newTarifaVigencia, setNewTarifaVigencia] = useState('')
  const [csvFileMin, setCsvFileMin] = useState<File | null>(null)
  const [csvFileMax, setCsvFileMax] = useState<File | null>(null)
  const [newListMinimoCajas, setNewListMinimoCajas] = useState('300')
  const [newListLimiteListaA, setNewListLimiteListaA] = useState('60')
  const [newUnidadNegocio, setNewUnidadNegocio] = useState('Gerencia Comercial')
  const [newSubUnidadNegocio, setNewSubUnidadNegocio] = useState('Comercial')
  const [isLoadingTarifas, setIsLoadingTarifas] = useState(false)
  
  // Accesos & Reglas Modals State
  const [showAccesosModal, setShowAccesosModal] = useState(false)
  const [selectedListForAccesos, setSelectedListForAccesos] = useState<any>(null)
  const [usuariosSistema, setUsuariosSistema] = useState<any[]>([])
  const [listUsuariosHabilitados, setListUsuariosHabilitados] = useState<number[]>([])

  const [showReglasModal, setShowReglasModal] = useState(false)
  const [selectedListForReglas, setSelectedListForReglas] = useState<any>(null)
  const [editMinimoCajas, setEditMinimoCajas] = useState('')
  const [editLimiteListaA, setEditLimiteListaA] = useState('')

  // Promotions state
  const [promociones, setPromociones] = useState<any[]>([])
  const [newPromoNombre, setNewPromoNombre] = useState('')
  const [newPromoDesc, setNewPromoDesc] = useState('')
  const [newPromoMin, setNewPromoMin] = useState('')
  const [newPromoBonus, setNewPromoBonus] = useState('')
  const [newPromoDesde, setNewPromoDesde] = useState('')
  const [newPromoHasta, setNewPromoHasta] = useState('')
  const [selectedPromoProductos, setSelectedPromoProductos] = useState<number[]>([])
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null)
  const [productos, setProductos] = useState<any[]>([])
  const [promoProductSearch, setPromoProductSearch] = useState('')
  const [isLoadingPromos, setIsLoadingPromos] = useState(false)

  // Tabs State
  const [activeTab, setActiveTab] = useState<'lista' | 'zonas' | 'promos' | 'config'>('lista')
  const [selectedUnidadFiltro, setSelectedUnidadFiltro] = useState<string | null>(null)

  // Zones management state
  const [zonas, setZonas] = useState<any[]>([])
  const [newZonaName, setNewZonaName] = useState('')
  const [editingZonaId, setEditingZonaId] = useState<number | null>(null)
  const [editingZonaName, setEditingZonaName] = useState('')
  const [editingZonaColor, setEditingZonaColor] = useState('#3b82f6')
  const [editingZonaBarrios, setEditingZonaBarrios] = useState<string[]>([])
  const [editingZonaGeojson, setEditingZonaGeojson] = useState<any>(null)
  const [newBarrioInput, setNewBarrioInput] = useState('')
  const [isFetchingTerritory, setIsFetchingTerritory] = useState(false)
  const [isLoadingZonas, setIsLoadingZonas] = useState(false)

  // Fetch current user level on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUserNivel(data.user.nivel)
          setUserAlias(data.user.alias)
          setUserIsNivelTodo(data.user.isNivelTodo)
        }
      })
      .catch(e => console.error('Error fetching auth me:', e))
    
    fetchZonas()
    fetchTarifas()
    fetchPromociones()
    fetchProductos()
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios')
      const data = await res.json()
      if (Array.isArray(data)) {
        // Only level 2 and 3 can be restricted via Listas (Level 1 sees everything)
        setUsuariosSistema(data.filter(u => u.nivel > 1 && u.activo))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchTarifas = async () => {
    setIsLoadingTarifas(true)
    try {
      const res = await fetch('/api/configuracion/tarifas')
      const data = await res.json()
      if (Array.isArray(data)) {
        setListasTarifas(data)
        const uniqueUnidades = Array.from(new Set(data.map((l: any) => l.unidadNegocio || 'Gerencia Comercial')))
        if (uniqueUnidades.length > 0) {
          setSelectedUnidadFiltro((prev) => prev && uniqueUnidades.includes(prev as string) ? prev : (uniqueUnidades[0] as string))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingTarifas(false)
    }
  }

  const fetchPromociones = async () => {
    setIsLoadingPromos(true)
    try {
      const res = await fetch('/api/configuracion/promociones')
      const data = await res.json()
      if (Array.isArray(data)) setPromociones(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingPromos(false)
    }
  }

  const fetchProductos = async () => {
    try {
      const res = await fetch('/api/productos')
      const data = await res.json()
      if (Array.isArray(data)) setProductos(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUploadTarifas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTarifaName.trim() || !newTarifaVigencia || !csvFileMin || !csvFileMax || !newListMinimoCajas || !newListLimiteListaA) {
      alert('Por favor completa todos los campos de la tarifa e ingresa ambos archivos CSV.')
      return
    }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('nombre', newTarifaName.trim())
      formData.append('vigenteDesde', newTarifaVigencia)
      formData.append('fileMin', csvFileMin)
      formData.append('fileMax', csvFileMax)
      formData.append('minimoCajas', newListMinimoCajas)
      formData.append('limiteListaA', newListLimiteListaA)
      formData.append('unidadNegocio', newUnidadNegocio.trim())
      formData.append('subUnidadNegocio', newSubUnidadNegocio.trim())

      const res = await fetch('/api/configuracion/tarifas', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir tarifas')
      
      alert('Tarifario importado y creado exitosamente.')
      setNewTarifaName('')
      setNewTarifaVigencia('')
      setCsvFileMin(null)
      setCsvFileMax(null)
      setNewListMinimoCajas('300')
      setNewListLimiteListaA('60')
      // reset file inputs
      const inputMin = document.getElementById('csv-min') as HTMLInputElement
      const inputMax = document.getElementById('csv-max') as HTMLInputElement
      if (inputMin) inputMin.value = ''
      if (inputMax) inputMax.value = ''

      fetchTarifas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActivaTarifa = async (listaId: number) => {
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_activa', listaId })
      })
      if (!res.ok) throw new Error('Error al cambiar estado')
      fetchTarifas()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleRenombrarUnidad = async (unidadOrigen: string) => {
    const nuevaUnidad = prompt(`Renombrar Unidad de Negocio "${unidadOrigen}". Ingrese el nuevo nombre:`, unidadOrigen);
    if (!nuevaUnidad || nuevaUnidad === unidadOrigen) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renombrar_unidad', unidadOrigen, nuevaUnidad: nuevaUnidad.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al renombrar unidad');
      alert(data.message || 'Unidad renombrada correctamente.');
      fetchTarifas();
    } catch(e:any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicarUnidad = async (unidadOrigen: string) => {
    const nuevaUnidad = prompt(`Duplicar Unidad de Negocio "${unidadOrigen}". Ingrese el nuevo nombre (Ej. Supermercados):`, unidadOrigen + ' Copia');
    if (!nuevaUnidad) return;
    setIsSaving(true)
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicar_unidad_negocio', unidadOrigen, nuevaUnidad: nuevaUnidad.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al duplicar unidad');
      alert(data.message || 'Unidad duplicada correctamente.');
      fetchTarifas();
    } catch(e:any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRenombrarSubUnidad = async (unidadOrigen: string, subUnidadOrigen: string) => {
    const nuevaSubUnidad = prompt(`Renombrar Sub-Unidad "${subUnidadOrigen}". Ingrese el nuevo nombre:`, subUnidadOrigen);
    if (!nuevaSubUnidad || nuevaSubUnidad === subUnidadOrigen) return;
    setIsSaving(true)
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renombrar_subunidad', unidadOrigen, subUnidadOrigen, nuevaSubUnidad: nuevaSubUnidad.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al renombrar sub-unidad');
      alert(data.message || 'Sub-Unidad renombrada correctamente.');
      fetchTarifas();
    } catch(e:any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicarSubUnidad = async (listaId: number, nombreBase: string) => {
    const nuevaSubUnidad = prompt(`Crear nueva sub-unidad a partir de "${nombreBase}". Ingrese el nombre (Ej. Tucumán):`);
    if (!nuevaSubUnidad) return;
    setIsSaving(true)
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicar_sub_unidad', listaId, nuevaSubUnidad: nuevaSubUnidad.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al duplicar sub-unidad');
      alert(data.message || 'Sub-Unidad creada correctamente.');
      fetchTarifas();
    } catch(e:any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRenombrarLista = async (listaId: number, nombreBase: string) => {
    const nombre = prompt(`Renombrar Lista de Precios "${nombreBase}". Ingrese el nuevo nombre:`, nombreBase);
    if (!nombre || nombre === nombreBase) return;
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar_lista', listaId, nombre: nombre.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al renombrar lista');
      fetchTarifas();
    } catch(e:any) {
      alert(e.message)
    }
  }

  const handleDeleteTarifa = async (listaId: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la lista '${nombre}'?`)) return
    try {
      const res = await fetch(`/api/configuracion/tarifas?id=${listaId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al eliminar')
      alert('Lista eliminada.')
      fetchTarifas()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleEditPromo = (p: any) => {
    setEditingPromoId(p.id)
    setNewPromoNombre(p.nombre)
    setNewPromoDesc(p.descripcion || '')
    setNewPromoMin(p.compraMinima ? p.compraMinima.toString() : '')
    setNewPromoBonus(p.bonificacion ? p.bonificacion.toString() : '')
    setNewPromoDesde(p.vigenciaDesde ? new Date(p.vigenciaDesde).toISOString().split('T')[0] : '')
    setNewPromoHasta(p.vigenciaHasta ? new Date(p.vigenciaHasta).toISOString().split('T')[0] : '')
    setSelectedPromoProductos(p.detallesPromocion ? p.detallesPromocion.map((d: any) => d.productoId) : [])
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const handleCancelEditPromo = () => {
    setEditingPromoId(null)
    setNewPromoNombre('')
    setNewPromoDesc('')
    setNewPromoMin('')
    setNewPromoBonus('')
    setNewPromoDesde('')
    setNewPromoHasta('')
    setSelectedPromoProductos([])
  }

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPromoNombre.trim() || !newPromoMin || !newPromoBonus) {
      alert('Por favor completa los campos requeridos de la promoción.')
      return
    }
    setIsSaving(true)
    try {
      const isEditing = editingPromoId !== null
      const res = await fetch('/api/configuracion/promociones', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isEditing ? editingPromoId : undefined,
          nombre: newPromoNombre.trim(),
          descripcion: newPromoDesc.trim() || null,
          compraMinima: parseInt(newPromoMin),
          bonificacion: parseInt(newPromoBonus),
          vigenciaDesdeStr: newPromoDesde || null,
          vigenciaHastaStr: newPromoHasta || null,
          productoIds: selectedPromoProductos
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar promo')
      alert(isEditing ? 'Promoción actualizada correctamente.' : 'Promoción creada correctamente.')
      handleCancelEditPromo()
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdatePromoDate = async (id: number, desdeStr: string, hastaStr: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/configuracion/promociones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          vigenciaDesdeStr: desdeStr || null,
          vigenciaHastaStr: hastaStr || null
        })
      })
      if (!res.ok) throw new Error('Error al guardar fecha')
      alert('Vigencia de la promoción guardada.')
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActivaPromo = async (id: number) => {
    try {
      const res = await fetch('/api/configuracion/promociones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_activa' })
      })
      if (!res.ok) throw new Error('Error al cambiar estado')
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeletePromo = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la promoción '${nombre}'?`)) return
    try {
      const res = await fetch(`/api/configuracion/promociones?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al eliminar')
      alert('Promoción eliminada.')
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const fetchZonas = async () => {
    setIsLoadingZonas(true)
    try {
      const res = await fetch('/api/zonas')
      const data = await res.json()
      if (Array.isArray(data)) {
        setZonas(data)
      }
    } catch (e) {
      console.error('Error fetching zones:', e)
    } finally {
      setIsLoadingZonas(false)
    }
  }

  const handleCreateZona = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newZonaName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/zonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newZonaName.trim().toUpperCase() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear zona')
      setNewZonaName('')
      alert('Zona creada correctamente.')
      fetchZonas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateZona = async (id: number) => {
    if (!editingZonaName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/zonas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nombre: editingZonaName.trim().toUpperCase() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar zona')
      alert('Zona actualizada correctamente.')
      setEditingZonaId(null)
      fetchZonas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateTerritorio = async (id: number, zonaName: string) => {
    setIsFetchingTerritory(true)
    try {
      const payload: any = { color: editingZonaColor, barrios: editingZonaBarrios }
      if (editingZonaGeojson !== undefined) {
        payload.customGeojson = editingZonaGeojson
      }
      const res = await fetch(`/api/zonas/${encodeURIComponent(zonaName)}/territorio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar territorio')
      alert('✅ Territorio actualizado. Los polígonos del mapa se regenerarán en segundo plano.')
      if (data.zona) {
        setEditingZonaBarrios(data.zona.barrios || [])
      }
      fetchZonas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsFetchingTerritory(false)
    }
  }

  const handleRegenerarGeojson = async (id: number, zonaName: string) => {
    if (!confirm(`¿Regenerar los polígonos del mapa para la zona "${zonaName}" con sus barrios actuales? El proceso corre en segundo plano y puede tardar unos minutos.`)) return
    setIsFetchingTerritory(true)
    try {
      const res = await fetch(`/api/zonas/${encodeURIComponent(zonaName)}/territorio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerarGeojson: true })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al regenerar polígonos')
      alert('✅ Regeneración de polígonos iniciada en segundo plano. El mapa se actualizará en unos minutos.')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsFetchingTerritory(false)
    }
  }

  const addBarrio = () => {
    if (!newBarrioInput.trim()) return
    const inputParts = newBarrioInput.split(',').map(b => b.trim()).filter(Boolean)
    const uniqueNew = inputParts.filter(b => !editingZonaBarrios.includes(b))
    
    if (uniqueNew.length > 0) {
      setEditingZonaBarrios([...editingZonaBarrios, ...uniqueNew])
    }
    setNewBarrioInput('')
  }
  
  const removeBarrio = (barrio: string) => {
    setEditingZonaBarrios(editingZonaBarrios.filter(b => b !== barrio))
  }

  const handleDeleteZona = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la zona '${name}'? Esto también borrará todas las sub-zonas asociadas.`)) {
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/zonas?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar zona')
      alert('Zona eliminada correctamente.')
      fetchZonas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle file select and convert to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setLogoUrl(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  // Save changes
  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (logoUrl.trim() === '') {
        await deleteLogo(activeTenant?.id)
      } else {
        const clean = formatImageUrl(logoUrl)
        await saveLogo(clean, activeTenant?.id)
        setLogoUrl(clean)
      }
      alert('Configuración guardada correctamente.')
    } catch (error) {
      console.error(error)
      alert('Error al guardar la configuración.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete logo
  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar el logo?')) {
      setIsSaving(true)
      try {
        await deleteLogo(activeTenant?.id)
        setLogoUrl('')
        alert('Logo eliminado correctamente.')
      } catch (error) {
        console.error(error)
        alert('Error al eliminar el logo.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleSaveAccesos = async () => {
    if (!selectedListForAccesos) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/configuracion/tarifas/${selectedListForAccesos.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_accesos', usuariosHabilitados: listUsuariosHabilitados })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar accesos')
      alert('Accesos actualizados correctamente.')
      setShowAccesosModal(false)
      fetchTarifas()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveReglas = async () => {
    if (!selectedListForReglas) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/configuracion/tarifas/${selectedListForReglas.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_rules', minimoCajas: editMinimoCajas, limiteListaA: editLimiteListaA })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar reglas')
      alert('Reglas actualizadas correctamente.')
      setShowReglasModal(false)
      fetchTarifas()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const unidadesAgrupadas = listasTarifas.reduce((acc: any, lista: any) => {
    const un = lista.unidadNegocio || 'Gerencia Comercial';
    const sub = lista.subUnidadNegocio || 'Comercial';
    if (!acc[un]) acc[un] = {};
    if (!acc[un][sub]) acc[un][sub] = [];
    acc[un][sub].push(lista);
    return acc;
  }, {})
  
  const nombresUnidades = Object.keys(unidadesAgrupadas)

  return (
    <div className="flex flex-col gap-6">
      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap justify-center gap-2 border-b border-white/10 pb-4 mb-6">
        <button
          onClick={() => setActiveTab('lista')}
          className={`btn-toggle ${activeTab === 'lista' ? 'active' : ''}`}
        >
          Unidades de Negocio
        </button>
        {userNivel === 1 && (
          <>
            <button
              onClick={() => setActiveTab('zonas')}
              className={`btn-toggle ${activeTab === 'zonas' ? 'active' : ''}`}
            >
              Zonas
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`btn-toggle ${activeTab === 'promos' ? 'active' : ''}`}
            >
              Promociones
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('config')}
          className={`btn-toggle ${activeTab === 'config' ? 'active' : ''}`}
        >
          Configuración Pag.
        </button>
      </div>

      {activeTab === 'config' && (
      <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
        <div className="glass-panel card md:col-span-2">
          <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
            Personalización Visual
          </h3>

          <div className="flex flex-col gap-6">
            {/* Opción 1: Subida Directa */}
            <div className="form-group mb-0">
              <label className="form-label flex items-center gap-2">
                <Upload size={16} className="text-primary" /> Subir Imagen de Logo (sin fondo)
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20'}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => setLogoUrl(reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }}
                onClick={() => document.getElementById('logo-file-input')?.click()}
                style={{ position: 'relative', minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              >
                <input 
                  id="logo-file-input" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <Upload size={24} className="text-secondary mb-2" />
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }} className="text-primary">Arrastra tu logo aquí o haz clic para buscar</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Soporta PNG, SVG, JPG, WEBP (recomendado sin fondo)</p>
              </div>
            </div>

            <div className="flex items-center text-center text-secondary gap-3" style={{ fontSize: '0.875rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></div>
              O
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></div>
            </div>

            {/* Opción 2: URL de Imagen */}
            <div className="form-group mb-0">
              <label className="form-label flex items-center gap-2">
                <Link2 size={16} className="text-primary" /> Enlace / URL de la Imagen
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="https://ejemplo.com/mi-logo.png" 
                value={logoUrl.startsWith('data:') ? '' : logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Puedes usar un link directo a la imagen o un enlace de Google Drive limpio.
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10" style={{ borderTop: '1px solid var(--border-light)' }}>
              {logoUrl && (
                <button onClick={handleDelete} className="btn btn-danger" disabled={isSaving}>
                  <Trash2 size={16} /> Eliminar Logo
                </button>
              )}
              <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
                <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Vista Previa */}
        <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '300px' }}>
          <div>
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Vista Previa
            </h3>
            <p className="card-subtitle mb-4">Así es como se lucirá en la barra lateral del sistema.</p>
          </div>

          <div className="flex-1 flex items-center justify-center bg-black/30 rounded-lg border border-white/5 p-6" style={{ minHeight: '120px' }}>
            {logoUrl ? (
              <img 
                src={formatImageUrl(logoUrl)} 
                alt="Logo Preview" 
                onError={(e) => {
                  // Fallback to Google thumbnail endpoint if direct CDN fails
                  const fileIdMatch = logoUrl.match(/[-\w]{25,}/)
                  if (fileIdMatch && !e.currentTarget.src.includes('thumbnail')) {
                    e.currentTarget.src = `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w1000`
                  }
                }}
                style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} 
              />
            ) : (
              <div className="text-center text-secondary flex flex-col items-center gap-2 opacity-50">
                <ImageIcon size={32} />
                <span style={{ fontSize: '0.875rem' }}>Logo por defecto ({activeTenant?.nombre || 'OmniSync'})</span>
              </div>
            )}
          </div>

          <div className="text-secondary text-center mt-4" style={{ fontSize: '0.75rem' }}>
            La imagen se adaptará automáticamente a la barra lateral izquierda.
          </div>
        </div>
      </div>
      )}

      {/* Dynamic Zones Management (Nivel 1 only) */}
      {activeTab === 'zonas' && userNivel === 1 && (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-panel card md:col-span-2">
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Gestión de Zonas Principales
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {isLoadingZonas ? (
                  <p className="text-secondary text-sm">Cargando zonas...</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {zonas.map(z => (
                      <div key={z.id} className="flex flex-col gap-2 p-3 rounded-lg border border-white/5 bg-black/10">
                        <div className="flex justify-between items-center">
                          {editingZonaId === z.id ? (
                            <div className="flex gap-2 flex-1 mr-4">
                              <input 
                                type="text" 
                                className="form-input !py-1" 
                                value={editingZonaName} 
                                onChange={(e) => setEditingZonaName(e.target.value)} 
                              />
                              <button onClick={() => handleUpdateZona(z.id)} className="btn btn-primary !py-1 text-xs">
                                Guardar Nombre
                              </button>
                              <button onClick={() => setEditingZonaId(null)} className="btn btn-secondary !py-1 text-xs">
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: z.color || '#3b82f6' }} />
                                <span className="text-white font-semibold text-sm">{z.nombre}</span>
                                {z.barrios && z.barrios.length > 0 && (
                                  <span className="text-xs text-secondary">({z.barrios.length} barrios delimitados)</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => { 
                                    setEditingZonaId(z.id); 
                                    setEditingZonaName(z.nombre);
                                    setEditingZonaColor(z.color || '#3b82f6');
                                    setEditingZonaBarrios(z.barrios || []);
                                    setEditingZonaGeojson(z.geojson || null);
                                  }} 
                                  className="btn btn-secondary !py-1 !px-2 text-xs"
                                >
                                  Editar / Territorio
                                </button>
                                <button 
                                  onClick={() => handleDeleteZona(z.id, z.nombre)} 
                                  className="btn btn-outline border-error text-error hover:bg-error hover:text-white !py-1 !px-2 text-xs"
                                >
                                  Borrar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {editingZonaId === z.id && (
                          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-4 animate-fade-in">
                            <h4 className="text-sm font-semibold text-primary">Delimitación Territorial</h4>
                            
                            <div className="form-group mb-0">
                              <label className="form-label">Color de la Zona (Mapa)</label>
                              <input 
                                type="color" 
                                className="w-12 h-8 bg-transparent border-0 cursor-pointer"
                                value={editingZonaColor} 
                                onChange={(e) => setEditingZonaColor(e.target.value)} 
                              />
                            </div>

                            <div className="form-group mb-0">
                              <label className="form-label">Barrios / Municipios</label>
                              <div className="flex gap-2 mb-2">
                                <input 
                                  type="text" 
                                  className="form-input flex-1" 
                                  placeholder="Ej. Lanús, CABA, Recoleta..."
                                  value={newBarrioInput}
                                  onChange={(e) => setNewBarrioInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBarrio())}
                                />
                                <button onClick={addBarrio} className="btn btn-secondary px-4 text-xs">Añadir</button>
                              </div>
                              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                                {editingZonaBarrios.map(b => (
                                  <span key={b} className="badge badge-primary flex items-center gap-1 mb-1">
                                    {b}
                                    <Trash2 size={12} className="cursor-pointer hover:text-error" onClick={() => removeBarrio(b)} />
                                  </span>
                                ))}
                                {editingZonaBarrios.length === 0 && (
                                  <span className="text-xs text-secondary">No hay barrios. La zona no se delimitará en el mapa.</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="form-group mb-0">
                              <label className="form-label flex justify-between">
                                <span>Mapa de Territorio (Dibujo Manual)</span>
                                <span className="text-xs text-secondary font-normal">Dibuja o edita polígonos</span>
                              </label>
                              <ConfigZoneMap 
                                initialGeojson={editingZonaGeojson} 
                                color={editingZonaColor} 
                                onChange={(geojson) => setEditingZonaGeojson(geojson)} 
                              />
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-2 flex-wrap">
                              <button 
                                onClick={() => handleRegenerarGeojson(z.id, z.nombre)} 
                                className="btn btn-secondary"
                                disabled={isFetchingTerritory}
                                title="Regenera los polígonos del mapa con los barrios ya guardados"
                              >
                                🗺️ Regenerar Mapa
                              </button>
                              <button 
                                onClick={() => handleUpdateTerritorio(z.id, z.nombre)} 
                                className="btn btn-primary"
                                disabled={isFetchingTerritory}
                              >
                                {isFetchingTerritory ? 'Guardando...' : 'Guardar Cambios'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {zonas.length === 0 && (
                      <p className="text-secondary text-sm">No hay zonas principales configuradas.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '200px' }}>
            <div>
              <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                Nueva Zona Principal
              </h3>
              <form onSubmit={handleCreateZona} className="flex flex-col gap-4">
                <div className="form-group mb-0">
                  <label className="form-label">Nombre de la Zona</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. TUCUMAN" 
                    value={newZonaName} 
                    onChange={(e) => setNewZonaName(e.target.value)} 
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
                  Crear Zona
                </button>
              </form>
            </div>
            <div className="text-secondary text-center mt-4" style={{ fontSize: '0.75rem' }}>
              Al crear una nueva zona principal, aparecerá de forma inmediata en el menú de navegación y en los formularios de alta/edición.
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Tariffs and Pricing Lists */}
      {activeTab === 'lista' && userNivel === 1 && (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-panel card md:col-span-2">
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Listas de Tarifas y Precios por Volumen
            </h3>

            <div className="flex flex-col gap-4">
              {isLoadingTarifas ? (
                <p className="text-secondary text-sm">Cargando tarifas...</p>
              ) : (
                <div className="flex flex-col gap-6">
                  {nombresUnidades.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {nombresUnidades.map(un => (
                        <button
                          key={un}
                          onClick={() => setSelectedUnidadFiltro(un)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                            selectedUnidadFiltro === un 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-500' 
                              : 'bg-white/5 text-secondary hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {un}
                        </button>
                      ))}
                    </div>
                  )}

                  {Object.entries(unidadesAgrupadas)
                    .filter(([un]) => selectedUnidadFiltro ? un === selectedUnidadFiltro : true)
                    .map(([un, subUnidades]: [string, any]) => (
                    <div key={un} className="border border-white/10 rounded-xl overflow-hidden bg-black/10 shadow-lg mb-6">
                      <div className="bg-gradient-to-r from-primary/20 to-transparent text-primary font-bold px-5 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-white/10 gap-3">
                        <div className="flex items-center gap-2">
                          <Building size={20} className="text-primary" />
                          <span className="text-lg tracking-wide">{un}</span>
                          {isAdmin && (
                            <button onClick={() => handleRenombrarUnidad(un)} className="text-secondary hover:text-white transition-colors ml-2 bg-black/20 p-1.5 rounded-md border border-white/5" title="Renombrar Unidad">
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button onClick={() => handleDuplicarUnidad(un)} className="btn btn-primary !py-1.5 flex items-center gap-1 shadow-primary/20 shadow-lg">
                              <Copy size={14} /> Duplicar Unidad
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-5 flex flex-col gap-6">
                        {Object.entries(subUnidades).map(([sub, listas]: [string, any]) => {
                          const listaVigente = listas.find((l:any) => l.activa);
                          return (
                            <div key={sub} className="border border-white/10 bg-black/40 rounded-xl overflow-hidden p-4 shadow-md">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/20">
                                    <MapPin size={16} className="text-primary" />
                                  </div>
                                  <h4 className="text-white font-bold text-md tracking-wide">Zona / Sub-Unidad: {sub}</h4>
                                  {isAdmin && (
                                    <button onClick={() => handleRenombrarSubUnidad(un, sub)} className="text-secondary hover:text-white transition-colors bg-white/5 p-1.5 rounded-md ml-1" title="Renombrar Sub-Unidad">
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                </div>
                                {listaVigente && (
                                  <button onClick={() => handleDuplicarSubUnidad(listaVigente.id, sub)} className="btn btn-secondary !py-1.5 text-xs flex items-center gap-1 border-white/10">
                                    <Copy size={12} /> Crear Nueva Zona (Duplicar)
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                {listas.map((l: any) => {
                                  const actDate = new Date(l.vigenteDesde).toLocaleDateString('es-AR')
                                  return (
                                    <div key={l.id} className="p-3 rounded-lg border border-white/5 bg-black/10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-bold text-sm flex items-center gap-2">
                                            {l.nombre}
                                            {isAdmin && (
                                              <button onClick={() => handleRenombrarLista(l.id, l.nombre)} className="text-secondary hover:text-white transition-colors" title="Renombrar Lista">
                                                <Edit2 size={14} />
                                              </button>
                                            )}
                                          </span>
                                          <span className={`badge ${!l.activa ? 'badge-neutral' : (new Date(l.vigenteDesde) > new Date() ? 'badge-info bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'badge-success')}`}>
                                            {!l.activa ? 'Cancelada (Historial)' : (new Date(l.vigenteDesde) > new Date() ? 'Próxima' : 'Vigente')}
                                          </span>
                                        </div>
                                        <div className="text-secondary text-xs mt-1">
                                          Vigente desde: {actDate} · {l.precios?.length || 0} productos
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => {
                                              setEditMinimoCajas(String(l.minimoCajas ?? 300))
                                              setEditLimiteListaA(String(l.limiteListaA ?? 60))
                                              setSelectedListForReglas(l)
                                              setShowReglasModal(true)
                                            }} 
                                            className="btn btn-secondary !py-1.5 !px-2.5 text-xs flex items-center gap-1"
                                            title="Editar Reglas de Venta para esta lista"
                                          >
                                            <Settings size={14} /> Reglas
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setListUsuariosHabilitados(l.usuariosHabilitados || [])
                                              setSelectedListForAccesos(l)
                                              setShowAccesosModal(true)
                                            }} 
                                            className="btn btn-secondary !py-1.5 !px-2.5 text-xs flex items-center gap-1"
                                            title="Configurar usuarios que pueden ver esta lista"
                                          >
                                            <Users size={14} /> Accesos
                                          </button>
                                        </div>

                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleToggleActivaTarifa(l.id)} 
                                            className="btn btn-secondary !py-1.5 !px-2.5 text-xs"
                                          >
                                            {l.activa ? 'Desactivar' : 'Activar'}
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteTarifa(l.id, l.nombre)} 
                                            className="btn btn-outline border-error text-error hover:bg-error hover:text-white !py-1.5 !px-2.5 text-xs"
                                          >
                                            Borrar
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {listasTarifas.length === 0 && (
                    <p className="text-secondary text-sm">No hay listas de tarifas importadas.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '300px' }}>
            <div>
              <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                Cargar Nuevo Tarifario / Lista de Precios (CSV)
              </h3>
              <form onSubmit={handleUploadTarifas} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group mb-0">
                    <label className="form-label">Unidad de Negocio</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. Gerencia Comercial" 
                      value={newUnidadNegocio} 
                      onChange={(e) => setNewUnidadNegocio(e.target.value)} 
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Sub-Unidad (Zona)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej. Comercial o Tucumán" 
                      value={newSubUnidadNegocio} 
                      onChange={(e) => setNewSubUnidadNegocio(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Nombre del Tarifario</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Tarifario Agosto 2026" 
                    value={newTarifaName} 
                    onChange={(e) => setNewTarifaName(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Vigente Desde</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newTarifaVigencia} 
                    onChange={(e) => setNewTarifaVigencia(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">CSV {terminology.tarifaMinLabel}</label>
                  <input 
                    id="csv-min"
                    type="file" 
                    accept=".csv"
                    className="form-input !py-1 text-xs"
                    onChange={(e) => setCsvFileMin(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">CSV {terminology.tarifaMaxLabel}</label>
                  <input 
                    id="csv-max"
                    type="file" 
                    accept=".csv"
                    className="form-input !py-1 text-xs"
                    onChange={(e) => setCsvFileMax(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="form-group mb-0 mt-2">
                  <label className="form-label text-xs text-primary">Reglas de Venta para la lista</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] text-secondary">Mínimo de {terminology.unidadMedida}</span>
                      <input 
                        type="number"
                        className="form-input !py-1 text-xs"
                        value={newListMinimoCajas}
                        onChange={e => setNewListMinimoCajas(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-secondary">Límite {terminology.tarifaMaxLabel} (%)</span>
                      <input 
                        type="number"
                        className="form-input !py-1 text-xs"
                        value={newListLimiteListaA}
                        onChange={e => setNewListLimiteListaA(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
                  Importar Tarifario
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Removed old global Reglas de Ventas panel */}

      {/* Dynamic Promotions */}
      {activeTab === 'promos' && userNivel === 1 && (

        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-panel card md:col-span-2">
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Gestión de Promociones Mensuales
            </h3>

            <div className="flex flex-col gap-4">
              {isLoadingPromos ? (
                <p className="text-secondary text-sm">Cargando promociones...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {promociones.map(p => {
                    const desdeVal = p.vigenciaDesde ? new Date(p.vigenciaDesde).toISOString().split('T')[0] : ''
                    const hastaVal = p.vigenciaHasta ? new Date(p.vigenciaHasta).toISOString().split('T')[0] : ''
                    return (
                      <div key={p.id} className="p-4 rounded-lg border border-white/5 bg-black/10 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm">{p.nombre}</span>
                              <span className={`badge ${p.activa ? 'badge-success' : 'badge-neutral'}`}>
                                {p.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                            {p.descripcion && <p className="text-secondary text-xs mt-0.5">{p.descripcion}</p>}
                            <p className="text-primary font-semibold text-xs mt-1">
                              Compra Mínima: {p.compraMinima} cajas ➔ Bonificación: {p.bonificacion} cajas de regalo
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleToggleActivaPromo(p.id)} 
                              className={`btn !py-1 !px-2 text-xs flex items-center justify-center ${p.activa ? 'btn-secondary text-white' : 'btn-primary'}`}
                              title={p.activa ? 'Desactivar' : 'Activar'}
                            >
                              <Power size={14} />
                            </button>
                            <button 
                              onClick={() => handleEditPromo(p)} 
                              className="btn btn-secondary !py-1 !px-2 text-xs flex items-center justify-center text-white"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeletePromo(p.id, p.nombre)} 
                              className="btn btn-outline border-error text-error hover:bg-error hover:text-white !py-1 !px-2 text-xs flex items-center justify-center"
                              title="Borrar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Extend Validity Form */}
                        <div className="flex items-center gap-3 bg-black/30 p-2.5 rounded-lg border border-white/5 flex-wrap">
                          <span className="text-secondary text-[11px] font-bold">Vigencia:</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="date" 
                              className="form-input !py-1 text-xs w-28 text-center" 
                              defaultValue={desdeVal}
                              id={`promo-desde-${p.id}`}
                            />
                            <span className="text-white/20 text-xs">a</span>
                            <input 
                              type="date" 
                              className="form-input !py-1 text-xs w-28 text-center" 
                              defaultValue={hastaVal}
                              id={`promo-hasta-${p.id}`}
                            />
                          </div>
                          <button 
                            onClick={() => {
                              const dVal = (document.getElementById(`promo-desde-${p.id}`) as HTMLInputElement).value
                              const hVal = (document.getElementById(`promo-hasta-${p.id}`) as HTMLInputElement).value
                              handleUpdatePromoDate(p.id, dVal, hVal)
                            }}
                            className="btn btn-primary !py-1 !px-2 text-xs flex items-center justify-center"
                            title="Guardar Vigencia"
                          >
                            <Save size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {promociones.length === 0 && (
                    <p className="text-secondary text-sm">No hay promociones registradas en el sistema.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '300px' }}>
            <div>
              <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                {editingPromoId ? 'Editar Promoción' : 'Nueva Promoción Mensual'}
              </h3>
              <form onSubmit={handleCreatePromo} className="flex flex-col gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Nombre de la Promo *</label>
                  <input 
                    type="text" 
                    className="form-input text-xs" 
                    placeholder="Ej. Promo 10x1 Belgrano" 
                    value={newPromoNombre} 
                    onChange={(e) => setNewPromoNombre(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Descripción</label>
                  <input 
                    type="text" 
                    className="form-input text-xs" 
                    placeholder="Ej. 1 caja de regalo por cada 10 compradas" 
                    value={newPromoDesc} 
                    onChange={(e) => setNewPromoDesc(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px]">Compra Mín. ({terminology.unidadMedida})</label>
                    <input 
                      type="number" 
                      className="form-input text-xs" 
                      placeholder="10" 
                      value={newPromoMin} 
                      onChange={(e) => setNewPromoMin(e.target.value)} 
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px]">Bonif. ({terminology.unidadMedida} de Regalo)</label>
                    <input 
                      type="number" 
                      className="form-input text-xs" 
                      placeholder="1" 
                      value={newPromoBonus} 
                      onChange={(e) => setNewPromoBonus(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Vigencia Desde</label>
                  <input 
                    type="date" 
                    className="form-input text-xs !py-1" 
                    value={newPromoDesde} 
                    onChange={(e) => setNewPromoDesde(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Vigencia Hasta</label>
                  <input 
                    type="date" 
                    className="form-input text-xs !py-1" 
                    value={newPromoHasta} 
                    onChange={(e) => setNewPromoHasta(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label text-[10px] mb-0">Productos que aplican</label>
                    <input
                      type="text"
                      className="form-input !py-0.5 !px-2 text-[10px] w-1/2 border-white/10"
                      placeholder="Buscar producto..."
                      value={promoProductSearch}
                      onChange={e => setPromoProductSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col gap-1">
                    {productos
                      .filter(prod => 
                        prod.nombre.toLowerCase().includes(promoProductSearch.toLowerCase()) || 
                        prod.codigoInterno.toLowerCase().includes(promoProductSearch.toLowerCase())
                      )
                      .map(prod => (
                      <label key={prod.id} className="flex items-start gap-2 text-[11px] text-white/80 cursor-pointer hover:text-white ml-0">
                        <input 
                          type="checkbox" 
                          className="shrink-0 mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-black/50 text-primary"
                          checked={selectedPromoProductos.includes(prod.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPromoProductos(prev => [...prev, prod.id])
                            else setSelectedPromoProductos(prev => prev.filter(id => id !== prod.id))
                          }}
                        />
                        {prod.nombre} <span className="text-secondary text-[9px]">({prod.codigoInterno})</span>
                      </label>
                    ))}
                    {productos.length === 0 && <span className="text-xs text-secondary">No hay productos cargados</span>}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="btn btn-primary flex-1" disabled={isSaving}>
                    {editingPromoId ? 'Actualizar Promoción' : 'Crear Promoción'}
                  </button>
                  {editingPromoId && (
                    <button type="button" onClick={handleCancelEditPromo} className="btn btn-secondary flex-1" disabled={isSaving}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


    {/* Modals for Reglas and Accesos */}
    {showReglasModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Settings size={18} /> Reglas: {selectedListForReglas?.nombre}
            </h3>
            <button onClick={() => setShowReglasModal(false)} className="text-secondary hover:text-white">&times;</button>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="form-label text-sm">{terminology.reglaVolumenMinimo}</label>
              <input
                type="number"
                min="1"
                className="form-input text-sm"
                value={editMinimoCajas}
                onChange={e => setEditMinimoCajas(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="form-label text-sm">Límite {terminology.tarifaMaxLabel} sin Volumen (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input text-sm"
                  value={editLimiteListaA}
                  onChange={e => setEditLimiteListaA(e.target.value)}
                />
                <span className="text-secondary font-bold text-sm">%</span>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
            <button onClick={() => setShowReglasModal(false)} className="btn btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSaveReglas} className="btn btn-primary text-sm" disabled={isSaving}>Guardar Reglas</button>
          </div>
        </div>
      </div>
    )}

    {showAccesosModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Users size={18} /> Accesos: {selectedListForAccesos?.nombre}
            </h3>
            <button onClick={() => setShowAccesosModal(false)} className="text-secondary hover:text-white">&times;</button>
          </div>
          <div className="p-5">
            <p className="text-xs text-secondary mb-4">
              Selecciona los usuarios (Nivel 2 y 3) que podrán utilizar esta lista. Si no seleccionas ninguno, todos tendrán acceso por defecto. Los usuarios Nivel 1 siempre tienen acceso a todas las listas.
            </p>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {usuariosSistema.length === 0 ? (
                <p className="text-xs text-secondary italic">No hay usuarios Nivel 2 o 3 activos.</p>
              ) : (
                usuariosSistema.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/5">
                    <input 
                      type="checkbox" 
                      className="form-checkbox shrink-0 h-4 w-4 rounded border-white/20 bg-black/50 text-primary focus:ring-primary focus:ring-offset-black"
                      checked={listUsuariosHabilitados.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setListUsuariosHabilitados(prev => [...prev, u.id])
                        } else {
                          setListUsuariosHabilitados(prev => prev.filter(id => id !== u.id))
                        }
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{u.nombreCompleto} <span className="text-secondary text-xs">({u.alias})</span></span>
                      <span className="text-[10px] text-secondary">Nivel {u.nivel} {u.zona ? `· Zona: ${u.zona}` : ''}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
            <button onClick={() => setShowAccesosModal(false)} className="btn btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSaveAccesos} className="btn btn-primary text-sm" disabled={isSaving}>Guardar Accesos</button>
          </div>
        </div>
      </div>
    )}

    </div>
  )
}
