'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Infinity,
  ShieldCheck, 
  Truck, 
  Laptop, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Pill, 
  Hammer, 
  Banknote, 
  Sprout,
  Layers, 
  X, 
  ChevronRight,
  Send,
  Lock,
  Server,
  Zap,
  Check,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ChevronDown
} from 'lucide-react'

// Helper to convert Google Drive sharing links into direct embed image URLs
function formatDriveUrl(url?: string | null, fallbackUrl?: string): string {
  if (!url) return fallbackUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80'
  
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/[-\w]{25,}/)
    if (fileIdMatch) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[0]}`
    }
  }
  return url
}

interface ModeloIndustria {
  id: string
  titulo: string
  subtitulo: string
  icono: React.ReactNode
  colorAccent: string
  caracteristicas: string[]
  moneda: string
  badge: string
}

export default function LobbyPage() {
  const router = useRouter()
  const [selectedTenantQuick, setSelectedTenantQuick] = useState<'golocinas' | 'vinnaty'>('golocinas')
  const [selectedModeloQuick, setSelectedModeloQuick] = useState('distribucion')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModeloIndustria | null>(null)
  const [formData, setFormData] = useState({
    empresa: '',
    contacto: '',
    email: '',
    vendedores: '1 a 5',
    mensaje: ''
  })
  const [enviado, setEnviado] = useState(false)

  // Default high-quality corporate images (customizable via Google Drive in Super Admin)
  const heroImage1 = formatDriveUrl(null, 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1000&q=80')
  const aboutImage = formatDriveUrl(null, 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80')

  const modelosIndustria: ModeloIndustria[] = [
    {
      id: 'distribucion',
      titulo: 'Distribución Mayorista & Preventa en Calle',
      subtitulo: 'Ruteo en 4 zonas georreferenciadas, control de pedidos offline y cobranzas en mano.',
      icono: <Truck className="w-5 h-5 text-orange-500" />,
      colorAccent: '#f97316',
      caracteristicas: [
        'Geolocalización y ruteo diario de preventistas',
        'Toma de pedidos sin conexión y sincro en la nube',
        'Gestión de cobranzas (Efectivo, Cheques, Transf.)',
        'Catálogo masivo con bultos y bonificaciones'
      ],
      moneda: 'ARS / USD',
      badge: 'Plantilla Lista'
    },
    {
      id: 'agencias',
      titulo: 'Agencias Digitales, Marketing & Software',
      subtitulo: 'Gestión de abonos recurrentes MRR, catálogo de servicios y cotizador dinámico.',
      icono: <Laptop className="w-5 h-5 text-orange-500" />,
      colorAccent: '#f97316',
      caracteristicas: [
        'Seguimiento de contratos mensuales y retainers',
        'Cotizador dinámico de servicios y paquetes',
        'Pipeline de conversión de leads y prospectos',
        'Facturación recurrente multimoneda (USD/ARS)'
      ],
      moneda: 'USD / ARS',
      badge: 'Plantilla Lista'
    },
    {
      id: 'salud',
      titulo: 'Salud, Laboratorios & Agentes APM',
      subtitulo: 'Auditoría de visitas médicas institucionales e inventario promocional de muestras.',
      icono: <Pill className="w-5 h-5 text-orange-500" />,
      colorAccent: '#f97316',
      caracteristicas: [
        'Fichero de médicos, especialistas y centros de salud',
        'Trazabilidad de muestras y vademécum científico',
        'Auditoría GPS de visitas a consultorios y clínicas',
        'Métricas de prescripción y cobertura territorial'
      ],
      moneda: 'ARS / USD',
      badge: 'Plantilla Lista'
    },
    {
      id: 'construccion',
      titulo: 'Materiales de Construcción & Corralones',
      subtitulo: 'Manejo de acopio, bultos pesados por m²/pallets y logística de entrega en obra.',
      icono: <Hammer className="w-5 h-5 text-orange-500" />,
      colorAccent: '#f97316',
      caracteristicas: [
        'Cotización volumétrica por toneladas y pallets',
        'Logística de fletes y despacho programado a obra',
        'Control de cuentas corrientes y cheques diferidos',
        'Gestión de acopios y retiros parciales'
      ],
      moneda: 'ARS',
      badge: 'Plantilla Lista'
    },
    {
      id: 'seguros',
      titulo: 'Seguros, Finanzas & Inversiones',
      subtitulo: 'Flujos de cotización, pólizas patrimoniales y liquidación de comisiones.',
      icono: <Banknote className="w-5 h-5 text-orange-500" />,
      colorAccent: '#f97316',
      caracteristicas: [
        'Control de pólizas vigentes y alertas de renovación',
        'Cálculo automatizado de comisiones por asesor',
        'Scoring de solvencia y registro de siniestros',
        'Seguimiento de carteras de inversión'
      ],
      moneda: 'ARS / USD',
      badge: 'Plantilla Lista'
    },
    {
      id: 'agro',
      titulo: 'Agroinsumos, Semillas & Veterinaria',
      subtitulo: 'Seguimiento técnico a campo, presupuestos grano/USD y visitas georreferenciadas.',
      icono: <Sprout className="w-5 h-5 text-orange-500" />,
      colorAccent: '#f97316',
      caracteristicas: [
        'Ruteo en zonas rurales y establecimientos agropecuarios',
        'Cotizaciones fijadas a precio de cereal o divisa extranjera',
        'Trazabilidad de lotes fitosanitarios y agroquímicos',
        'Reportes de monitoreo técnico de cultivos'
      ],
      moneda: 'USD / ARS',
      badge: 'Plantilla Lista'
    }
  ]

  const handleQuickEnter = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTenantQuick === 'golocinas') {
      router.push('/golocinas')
    } else {
      router.push('/vinnaty')
    }
  }

  const handleOpenProvisionModal = (modelo: ModeloIndustria) => {
    setSelectedModel(modelo)
    setFormData(prev => ({ ...prev, mensaje: `Interesado en implementar la plantilla de ${modelo.titulo}` }))
    setModalOpen(true)
    setEnviado(false)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEnviado(true)
    setTimeout(() => {
      setModalOpen(false)
      setEnviado(false)
    }, 2500)
  }

  return (
    <div className="min-h-screen bg-[#0C1017] text-slate-100 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      
      {/* Top Navbar */}
      <header className="w-full bg-[#0C1017] border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Navigation links left */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
            <a href="#workspaces" className="hover:text-white transition-colors">Unidades Operativas</a>
            <a href="#modelos-industria" className="hover:text-white transition-colors">Modelos de Negocio</a>
            <a href="#about" className="hover:text-white transition-colors">Plataforma</a>
            <a href="#infraestructura" className="hover:text-white transition-colors">Infraestructura</a>
          </nav>

          {/* Center Brand Logo: The Station / OmniSync style */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="font-serif italic text-2xl font-bold text-orange-500">The</span>
              <span className="font-extrabold text-2xl tracking-tight text-white ml-1.5">OmniSync</span>
            </div>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 ml-2">
              Cloud ERP
            </span>
          </Link>

          {/* Right Contact & Super Admin Access */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex flex-col text-right text-slate-400 font-mono text-[11px]">
              <span className="text-slate-300 font-medium">+54 (11) 5032-8800</span>
              <span className="text-slate-500 text-[10px]">soporte@omnisync.com</span>
            </div>

            <Link
              href="/super-admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Super Admin</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        
        {/* HERO SECTION: Organic Capsule Shapes (The Station Style) */}
        <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column: Diagonal Overlapping Capsule Masks */}
              <div className="lg:col-span-6 relative flex justify-center items-center order-2 lg:order-1">
                
                {/* Floating Orange Accent Bubbles */}
                <div className="absolute -top-4 left-6 w-7 h-7 rounded-full bg-orange-500/80 blur-[1px] animate-pulse" />
                <div className="absolute top-1/2 -left-6 w-12 h-12 rounded-full bg-orange-600/70 blur-[2px]" />
                <div className="absolute -bottom-6 right-16 w-5 h-5 rounded-full bg-orange-400/90" />
                <div className="absolute top-1/3 -right-4 w-6 h-6 rounded-full bg-orange-500/60" />

                {/* Main Composite Mask Container with Organic Angle */}
                <div className="relative w-full max-w-[480px] h-[400px] sm:h-[460px] flex items-center justify-center">
                  
                  {/* Capsule 1 (Left / Back) */}
                  <div className="absolute left-4 top-8 w-28 sm:w-32 h-[340px] sm:h-[380px] rounded-full overflow-hidden rotate-[-28deg] shadow-2xl border-4 border-[#0C1017] z-10">
                    <img 
                      src={heroImage1} 
                      alt="Fuerza de ventas comercial" 
                      className="w-full h-full object-cover scale-[1.7] rotate-[28deg]"
                    />
                  </div>

                  {/* Capsule 2 (Center / Main) */}
                  <div className="absolute left-32 sm:left-36 top-2 w-32 sm:w-36 h-[380px] sm:h-[430px] rounded-full overflow-hidden rotate-[-28deg] shadow-2xl border-4 border-[#0C1017] z-20">
                    <img 
                      src={heroImage1} 
                      alt="Reunión comercial de ruteo" 
                      className="w-full h-full object-cover scale-[1.7] rotate-[28deg]"
                    />
                  </div>

                  {/* Capsule 3 (Right / Accent) */}
                  <div className="absolute right-6 sm:right-10 top-12 w-28 sm:w-32 h-[320px] sm:h-[360px] rounded-full overflow-hidden rotate-[-28deg] shadow-2xl border-4 border-[#0C1017] z-10">
                    <img 
                      src={heroImage1} 
                      alt="Gestión en campo" 
                      className="w-full h-full object-cover scale-[1.7] rotate-[28deg]"
                    />
                  </div>

                  {/* Upper Right Solid Accent Pill */}
                  <div className="absolute -top-2 right-12 w-24 h-40 rounded-full bg-orange-500 rotate-[-28deg] -z-0 opacity-90" />
                </div>
              </div>

              {/* Right Column: High Hierarchy Value Proposition */}
              <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col justify-center">
                
                {/* Micro Price / Tech Tag */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3">
                  <span>desde</span>
                  <span className="text-orange-400 font-bold text-base font-serif">$49 USD</span>
                  <span className="text-slate-500">/ mes por inquilino</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-orange-400/90 uppercase tracking-widest font-mono font-semibold mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>4 ZONAS • GPS EN TIEMPO REAL • OFFLINE-FIRST</span>
                </div>

                {/* H1 Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white leading-[1.12] tracking-tight">
                  Tu <span className="text-orange-500 not-italic font-sans font-extrabold">Fuerza de Ventas</span> para Escalar en Terreno
                </h1>

                {/* Subtitle */}
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed mt-5 max-w-xl">
                  El ERP y CRM multi-tenant diseñado para coordinar preventistas en calle, automatizar toma de pedidos offline y auditar cobranzas con aislamiento total por empresa.
                </p>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a
                    href="#workspaces"
                    className="px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-150 hover:scale-[1.01]"
                  >
                    Ingresar a mi Unidad
                  </a>

                  <a
                    href="#modelos-industria"
                    className="px-6 py-3.5 rounded-xl bg-transparent hover:bg-slate-800/80 border border-slate-700 text-slate-200 text-sm font-semibold transition-all duration-150 flex items-center gap-2"
                  >
                    <span>Ver Modelos de Negocio</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* QUICK ACCESS BAR (Interactive Row Matching The Station Style) */}
        <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-4 mb-16">
          <form 
            onSubmit={handleQuickEnter}
            className="p-3 sm:p-4 rounded-2xl bg-[#151C28] border border-slate-800/90 shadow-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center"
          >
            {/* Input 1: Active Workspace */}
            <div className="flex flex-col px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidad Operativa</label>
              <select 
                value={selectedTenantQuick}
                onChange={e => setSelectedTenantQuick(e.target.value as any)}
                className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer mt-0.5"
              >
                <option value="golocinas" className="bg-slate-900 text-white">Golocinas (Consumo Masivo)</option>
                <option value="vinnaty" className="bg-slate-900 text-white">Vinnaty (Servicios Digitales)</option>
              </select>
            </div>

            {/* Input 2: Industry Model */}
            <div className="flex flex-col px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modelo Comercial</label>
              <select 
                value={selectedModeloQuick}
                onChange={e => setSelectedModeloQuick(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none cursor-pointer mt-0.5"
              >
                <option value="distribucion" className="bg-slate-900 text-white">Preventa & Logística 4 Zonas</option>
                <option value="agencias" className="bg-slate-900 text-white">Agencia Digital & Retainers</option>
                <option value="salud" className="bg-slate-900 text-white">Salud & Agentes APM</option>
                <option value="construccion" className="bg-slate-900 text-white">Materiales de Construcción</option>
              </select>
            </div>

            {/* Input 3: Security Status */}
            <div className="flex flex-col px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 justify-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aislamiento Criptográfico</label>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Base de Datos Dedicada</span>
              </span>
            </div>

            {/* Action CTA Button */}
            <div>
              <button
                type="submit"
                className="w-full h-full min-h-[50px] rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <span>Entrar al Panel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>

        {/* SECTION: CONOCE OMNISYNC (Split Layout Matching Reference) */}
        <section id="about" className="py-16 md:py-24 border-t border-slate-800/60 bg-[#0E131C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Text + Bullet points + Action Buttons */}
              <div className="lg:col-span-6">
                
                <div className="inline-block px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 text-[11px] font-bold uppercase tracking-widest border border-orange-500/20 mb-4">
                  SOBRE LA PLATAFORMA
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white leading-tight">
                  Bienvenido a <span className="font-sans font-extrabold text-orange-500 not-italic">OmniSync</span> Cloud!
                </h2>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-5 font-medium">
                  OmniSync es el núcleo operativo B2B para estructurar, auditar y escalar fuerzas de ventas de calle y distribución mayorista.
                </p>

                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-3">
                  Cada inquilino cuenta con una instancia completamente aislada con catálogo propio, listas de precios segmentadas, geolocalización de clientes y ruteo en 4 zonas operativas.
                </p>

                {/* Feature check list (orange checkmarks) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-8 pt-6 border-t border-slate-800/80 text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Ruteo GPS en 4 Zonas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Toma de Pedidos Offline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Conciliación de Cobranzas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Auditoría de Preventistas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Aislamiento Criptográfico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Soporte Multimoneda USD/ARS</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-9 flex items-center gap-4">
                  <Link
                    href="/golocinas"
                    className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all"
                  >
                    Entrar a Golocinas
                  </Link>

                  <Link
                    href="/vinnaty"
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition-all"
                  >
                    Entrar a Vinnaty
                  </Link>
                </div>

              </div>

              {/* Right Column: Crisp High-Resolution Workplace Photo */}
              <div className="lg:col-span-6 relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group">
                  <img 
                    src={aboutImage} 
                    alt="Equipo comercial trabajando en OmniSync ERP" 
                    className="w-full h-[420px] sm:h-[480px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C1017] via-transparent to-transparent opacity-60" />
                  
                  {/* Floating Micro Badge in Photo */}
                  <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-[#0C1017]/90 backdrop-blur-md border border-slate-800/90 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">Plataforma Lista para Producción</div>
                      <div className="text-xs text-slate-400">Sincronización transparente con Neon PostgreSQL</div>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION: 4 COUNTER STATS (Matching Reference 120+ / 15 / 98% / 24/7) */}
        <section className="py-16 bg-[#0A0D14] border-t border-slate-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              
              <div className="flex flex-col items-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight flex items-baseline">
                  <span>360</span>
                  <span className="text-orange-500 font-serif font-normal ml-1">+</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Clientes en Ruteo
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
                  <span>4</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Zonas Georreferenciadas
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight flex items-baseline">
                  <span>98</span>
                  <span className="text-orange-500 font-serif font-normal ml-0.5">%</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Cobranza Efectiva
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight flex items-baseline">
                  <span>24</span>
                  <span className="text-orange-500 font-serif font-normal mx-0.5">/</span>
                  <span>7</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Disponibilidad Cloud
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION: YOUR WORKSPACES / UNIDADES OPERATIVAS (Active Tenants Directory) */}
        <section id="workspaces" className="py-16 md:py-20 border-t border-slate-800/60 bg-[#0C1017]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center mb-10">
              <div className="inline-block px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 text-[11px] font-bold uppercase tracking-widest border border-orange-500/20 mb-3">
                YOUR WORKSPACES
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-white">
                Unidades Operativas Activas
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-2">
                Seleccione su espacio de trabajo para ingresar a su panel aislado.
              </p>
            </div>

            {/* Compact Cards (88px Height) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
              
              {/* Card 1: Golocinas */}
              <Link
                href="/golocinas"
                className="group flex items-center justify-between h-[88px] max-h-[90px] px-5 bg-[#151C28] hover:bg-[#1A2332] border border-slate-800 hover:border-orange-500/60 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/5 hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-lg tracking-tight group-hover:text-orange-300 transition-colors truncate">
                        Golocinas
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950/50 text-orange-300 border border-orange-800/40 shrink-0">
                        Consumo Masivo
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">
                      Preventa en calle, 4 zonas de ruteo y cobranzas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 group-hover:text-orange-300 shrink-0 pl-3">
                  <span className="hidden sm:inline">Entrar al Panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Card 2: Vinnaty */}
              <Link
                href="/vinnaty"
                className="group flex items-center justify-between h-[88px] max-h-[90px] px-5 bg-[#151C28] hover:bg-[#1A2332] border border-slate-800 hover:border-orange-500/60 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/5 hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-lg tracking-tight group-hover:text-orange-300 transition-colors truncate">
                        Vinnaty
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950/50 text-orange-300 border border-orange-800/40 shrink-0">
                        Servicios Digitales
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">
                      Agencia digital, retainers recurrentes y cotizador
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 group-hover:text-orange-300 shrink-0 pl-3">
                  <span className="hidden sm:inline">Entrar al Panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

            </div>

          </div>
        </section>

        {/* SECTION: MODELOS DE INDUSTRIA */}
        <section id="modelos-industria" className="py-16 md:py-20 border-t border-slate-800/60 bg-[#0E131C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <div className="inline-block px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 text-[11px] font-bold uppercase tracking-widest border border-orange-500/20 mb-3">
                  MODELOS DE INDUSTRIA
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif text-white">
                  Plantillas Pre-Configuradas
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-2xl">
                  Módulos y flujos de preventa adaptados a la dinámica operativa de cada sector comercial.
                </p>
              </div>

              <div className="mt-4 md:mt-0 text-xs text-slate-500 font-mono">
                Aprovisionamiento en &lt; 24h • Aislamiento Criptográfico
              </div>
            </div>

            {/* 3-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modelosIndustria.map((modelo) => (
                <div
                  key={modelo.id}
                  className="group relative flex flex-col justify-between bg-[#151C28] hover:bg-[#1A2332] border border-slate-800 hover:border-orange-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/5 hover:scale-[1.01]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                        {modelo.icono}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                        {modelo.moneda}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-orange-300 transition-colors">
                      {modelo.titulo}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed mt-2 line-clamp-2">
                      {modelo.subtitulo}
                    </p>

                    <ul className="mt-4 space-y-2 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
                      {modelo.caracteristicas.map((caract, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span>{caract}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-950/40 text-orange-400 border border-orange-800/30 text-[11px] font-semibold">
                      {modelo.badge}
                    </span>

                    <button
                      onClick={() => handleOpenProvisionModal(modelo)}
                      className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 group-hover:text-orange-400 transition-colors"
                    >
                      <span>Aprovisionar</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* SECTION: INFRAESTRUCTURA */}
        <section id="infraestructura" className="py-16 md:py-20 border-t border-slate-800/60 bg-[#0A0D14]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-block px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 text-[11px] font-bold uppercase tracking-widest border border-orange-500/20 mb-3">
                SEGURIDAD Y ESCALABILIDAD
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-white">
                Infraestructura Confiable y Segura
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-2">
                Arquitectura cloud distribuida con replicación activa, copias de seguridad continuas y cifrado de extremo a extremo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#151C28]/80 border border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base tracking-tight mb-2">
                  Aislamiento Criptográfico de Tenants
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Cada inquilino cuenta con aislamiento lógico estricto a nivel de base de datos. Ningún usuario de una empresa puede filtrar ni visualizar transacciones de otra.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#151C28]/80 border border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base tracking-tight mb-2">
                  Operación Offline-First en Campo
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Las fuerzas de ventas registran visitas, pedidos y cobranzas incluso en zonas sin cobertura celular. Los datos se concilian automáticamente al recuperar señal.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#151C28]/80 border border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base tracking-tight mb-2">
                  Alta Disponibilidad & SLA 99.9%
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Desplegado sobre infraestructura serverless cloud de alta concurrencia con replicación continua en Neon PostgreSQL y Render.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#080B10] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <span className="font-serif italic text-xl font-bold text-orange-500">The</span>
              <span className="font-extrabold text-xl tracking-tight text-white ml-1.5">OmniSync</span>
            </div>
            <div className="text-[11px] text-slate-500 pl-3 border-l border-slate-800">
              Cifrado de extremo a extremo • Multi-Tenant Enterprise Engine 2026
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/golocinas" className="hover:text-white transition-colors">
              Golocinas
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/vinnaty" className="hover:text-white transition-colors">
              Vinnaty
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/super-admin" className="hover:text-orange-400 transition-colors flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Portal Super Admin</span>
            </Link>
          </div>

        </div>
      </footer>

      {/* PROVISIONING MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#121722] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
            
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {enviado ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Solicitud Registrada
                </h3>
                <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto">
                  El equipo de arquitectura aprovisionará su instancia de {selectedModel?.titulo} y enviará las credenciales a su correo.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    {selectedModel?.icono}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Aprovisionar Nueva Unidad Operativa
                    </h3>
                    <p className="text-xs text-orange-400 font-medium">
                      {selectedModel?.titulo}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-5">
                  Complete los datos de la empresa para inicializar un tenant aislado con 4 zonas de preventa y catálogo base configurado.
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nombre de la Empresa o Unidad de Negocio *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Distribuidora del Norte S.A."
                      value={formData.empresa}
                      onChange={e => setFormData({ ...formData, empresa: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nombre del Administrador *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Juan Pérez"
                        value={formData.contacto}
                        onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Email Corporativo *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@empresa.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tamaño de la Fuerza de Ventas (Vendedores en Campo)
                    </label>
                    <select
                      value={formData.vendedores}
                      onChange={e => setFormData({ ...formData, vendedores: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                    >
                      <option value="1 a 5">1 a 5 vendedores (Starter)</option>
                      <option value="6 a 15">6 a 15 vendedores (Crecimiento)</option>
                      <option value="16 a 50">16 a 50 vendedores (Enterprise)</option>
                      <option value="Mas de 50">Más de 50 vendedores (Corporativo)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all duration-150 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Confirmar y Enviar Solicitud</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
