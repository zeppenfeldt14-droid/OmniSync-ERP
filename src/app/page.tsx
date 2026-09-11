'use client'

import React, { useState } from 'react'
import Link from 'next/link'
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
  ShieldAlert
} from 'lucide-react'

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

  const modelosIndustria: ModeloIndustria[] = [
    {
      id: 'distribucion',
      titulo: 'Distribución Mayorista & Preventa en Calle',
      subtitulo: 'Ruteo en 4 zonas georreferenciadas, control de pedidos offline y cobranzas en mano.',
      icono: <Truck className="w-6 h-6 text-blue-400" />,
      colorAccent: '#3b82f6',
      caracteristicas: [
        'Geolocalización y ruteo diario de preventistas',
        'Toma de pedidos sin conexión y sincro en la nube',
        'Gestión de cobranzas (Efectivo, Cheques, Transf.)',
        'Catálogo masivo con bultos y bonificaciones'
      ],
      moneda: 'ARS / USD',
      badge: 'Plantilla Lista para Aprovisionamiento'
    },
    {
      id: 'agencias',
      titulo: 'Agencias Digitales, Marketing & Software',
      subtitulo: 'Gestión de abonos recurrentes MRR, catálogo de servicios y cotizador dinámico.',
      icono: <Laptop className="w-6 h-6 text-indigo-400" />,
      colorAccent: '#6366f1',
      caracteristicas: [
        'Seguimiento de contratos mensuales y retainers',
        'Cotizador dinámico de servicios y paquetes',
        'Pipeline de conversión de leads y prospectos',
        'Facturación recurrente multimoneda (USD/ARS)'
      ],
      moneda: 'USD / ARS',
      badge: 'Plantilla Lista para Aprovisionamiento'
    },
    {
      id: 'salud',
      titulo: 'Salud, Laboratorios & Agentes APM',
      subtitulo: 'Auditoría de visitas médicas institucionales e inventario promocional de muestras.',
      icono: <Pill className="w-6 h-6 text-rose-400" />,
      colorAccent: '#f43f5e',
      caracteristicas: [
        'Fichero de médicos, especialistas y centros de salud',
        'Trazabilidad de muestras y vademécum científico',
        'Auditoría GPS de visitas a consultorios y clínicas',
        'Métricas de prescripción y cobertura territorial'
      ],
      moneda: 'ARS / USD',
      badge: 'Plantilla Lista para Aprovisionamiento'
    },
    {
      id: 'construccion',
      titulo: 'Materiales de Construcción & Corralones',
      subtitulo: 'Manejo de acopio, bultos pesados por m²/pallets y logística de entrega en obra.',
      icono: <Hammer className="w-6 h-6 text-amber-400" />,
      colorAccent: '#f59e0b',
      caracteristicas: [
        'Cotización volumétrica por toneladas y pallets',
        'Logística de fletes y despacho programado a obra',
        'Control de cuentas corrientes y cheques diferidos',
        'Gestión de acopios y retiros parciales'
      ],
      moneda: 'ARS',
      badge: 'Plantilla Lista para Aprovisionamiento'
    },
    {
      id: 'seguros',
      titulo: 'Seguros, Finanzas & Inversiones',
      subtitulo: 'Flujos de cotización, pólizas patrimoniales y liquidación de comisiones.',
      icono: <Banknote className="w-6 h-6 text-emerald-400" />,
      colorAccent: '#10b981',
      caracteristicas: [
        'Control de pólizas vigentes y alertas de renovación',
        'Cálculo automatizado de comisiones por asesor',
        'Scoring de solvencia y registro de siniestros',
        'Seguimiento de carteras de inversión'
      ],
      moneda: 'ARS / USD',
      badge: 'Plantilla Lista para Aprovisionamiento'
    },
    {
      id: 'agro',
      titulo: 'Agroinsumos, Semillas & Veterinaria',
      subtitulo: 'Seguimiento técnico a campo, presupuestos grano/USD y visitas georreferenciadas.',
      icono: <Sprout className="w-6 h-6 text-teal-400" />,
      colorAccent: '#14b8a6',
      caracteristicas: [
        'Ruteo en zonas rurales y establecimientos agropecuarios',
        'Cotizaciones fijadas a precio de cereal o divisa extranjera',
        'Trazabilidad de lotes fitosanitarios y agroquímicos',
        'Reportes de monitoreo técnico de cultivos'
      ],
      moneda: 'USD / ARS',
      badge: 'Plantilla Lista para Aprovisionamiento'
    }
  ]

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
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 font-sans selection:bg-blue-600/30 selection:text-blue-200">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0B0F17]/85 border-b border-slate-800/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Multi-Tenant Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <Infinity className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  OmniSync <span className="font-light text-slate-400">Cloud</span>
                </span>
              </div>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider text-slate-300 bg-slate-800/90 border border-slate-700/60 ml-1">
              Multi-Tenant Enterprise
            </span>
          </div>

          {/* Right Navigation & CTAs */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <a 
              href="#modelos-industria" 
              className="hidden md:inline-flex text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5"
            >
              Modelos de Industria
            </a>
            <a 
              href="#infraestructura" 
              className="hidden lg:inline-flex text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5"
            >
              Infraestructura
            </a>

            {/* Portal Super Admin Button */}
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all duration-150"
              title="Acceso exclusivo para administradores de la plataforma global"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Portal Super Admin</span>
            </Link>

            {/* Acceso Operadores Pill Button */}
            <a
              href="#inquilinos-activos"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.99] transition-all duration-150"
            >
              <span>Acceso Operadores</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.18),rgba(11,15,23,0))] pointer-events-none blur-2xl" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            
            {/* Top Centered Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-slate-300 text-xs font-medium shadow-sm mb-6 animate-in fade-in duration-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Arquitectura Multi-Tenant Aislada • Soporte Multi-Moneda (USD / ARS)</span>
            </div>

            {/* Main Headline H1 */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
              El Sistema Nervioso Comercial para tus Fuerzas de Ventas B2B.
            </h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mt-5 font-normal">
              OmniSync unifica ruteo georreferenciado de preventa, gestión logística, cotizaciones inteligentes y CRM operativo en instancias dedicadas para cada unidad de negocio.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <a
                href="#modelos-industria"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-sm font-semibold transition-all duration-150 hover:scale-[1.01]"
              >
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Explorar Módulos de Industria</span>
              </a>

              <a
                href="#inquilinos-activos"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.01] transition-all duration-150"
              >
                <span>Ingresar a mi Unidad Operativa</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Sección Central: Directorio de Modelos de Industria (Módulos Disponibles) */}
        <section id="modelos-industria" className="py-16 md:py-20 border-t border-slate-800/60 bg-[#0B0F17]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-950/50 border border-blue-800/40 text-blue-400 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Catálogo de Soluciones Llave en Mano</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Modelos de Industria Pre-Configurados
                </h2>
                <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
                  Plantillas arquitectónicas optimizadas para despliegue inmediato según la dinámica comercial de cada vertical de negocio.
                </p>
              </div>

              <div className="mt-4 md:mt-0 text-xs text-slate-500 font-mono">
                Despliegues en &lt; 24h • Aislamiento Criptográfico
              </div>
            </div>

            {/* 3-Column Grid of Industry Models */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modelosIndustria.map((modelo) => (
                <div
                  key={modelo.id}
                  className="group relative flex flex-col justify-between bg-[#161B26] hover:bg-[#19202E] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/5 hover:scale-[1.01]"
                >
                  <div>
                    {/* Monochromatic Icon in Rounded Square Container */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-slate-700 transition-colors">
                        {modelo.icono}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                        {modelo.moneda}
                      </span>
                    </div>

                    {/* Title and Subtitle */}
                    <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-blue-300 transition-colors">
                      {modelo.titulo}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed mt-2 line-clamp-2">
                      {modelo.subtitulo}
                    </p>

                    {/* Features list */}
                    <ul className="mt-4 space-y-2 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
                      {modelo.caracteristicas.map((caract, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{caract}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Provisioning Badge & Trigger */}
                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-950/40 text-blue-400 border border-blue-800/30 text-[11px] font-semibold">
                      {modelo.badge}
                    </span>

                    <button
                      onClick={() => handleOpenProvisionModal(modelo)}
                      className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 group-hover:text-blue-400 transition-colors"
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

        {/* Sección Inferior: Directorio de Inquilinos Activos (Acceso Inmediato y Minimalista) */}
        <section id="inquilinos-activos" className="py-16 md:py-20 border-t border-slate-800/60 bg-[#0A0D14]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header: Clean & Direct */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium mb-3">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Acceso a Instancias Dedicadas</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Unidades Operativas Activas
              </h2>
              <p className="text-slate-400 text-sm mt-1.5">
                Seleccione su espacio de trabajo para ingresar a su panel aislado.
              </p>
            </div>

            {/* Grid of Compact Cards (Maximum 90px Height) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
              
              {/* Card 1: Golocinas */}
              <Link
                href="/golocinas"
                className="group flex items-center justify-between h-[88px] max-h-[90px] px-5 bg-[#161B26] hover:bg-[#19202E] border border-slate-800 hover:border-amber-500/50 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/5 hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Circle Logo */}
                  <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-base shrink-0 group-hover:scale-105 transition-transform">
                    <Truck className="w-5 h-5" />
                  </div>
                  
                  {/* Name & Micro-badge */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-lg tracking-tight group-hover:text-amber-300 transition-colors truncate">
                        Golocinas
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/50 text-amber-300 border border-amber-800/40 shrink-0">
                        Consumo Masivo
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">
                      Logística de preventa, 4 zonas de calle y cobranzas
                    </p>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:text-amber-300 shrink-0 pl-3">
                  <span className="hidden sm:inline">Entrar al Panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Card 2: Vinnaty */}
              <Link
                href="/vinnaty"
                className="group flex items-center justify-between h-[88px] max-h-[90px] px-5 bg-[#161B26] hover:bg-[#19202E] border border-slate-800 hover:border-blue-500/50 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/5 hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Circle Logo */}
                  <div className="w-11 h-11 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-base shrink-0 group-hover:scale-105 transition-transform">
                    <Laptop className="w-5 h-5" />
                  </div>
                  
                  {/* Name & Micro-badge */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-lg tracking-tight group-hover:text-blue-300 transition-colors truncate">
                        Vinnaty
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/50 text-blue-300 border border-blue-800/40 shrink-0">
                        Servicios Digitales
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">
                      Agencia digital, retainers recurrentes y cotizador
                    </p>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:text-blue-300 shrink-0 pl-3">
                  <span className="hidden sm:inline">Entrar al Panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

            </div>

            {/* Quick Access to Global Administration */}
            <div className="mt-8 text-center">
              <Link 
                href="/super-admin"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors group"
              >
                <ShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                <span>¿Eres Super Administrador? Gestiona inquilinos en el Portal Master →</span>
              </Link>
            </div>

          </div>
        </section>

        {/* Section: Infraestructura y Seguridad de Nivel Bancario */}
        <section id="infraestructura" className="py-16 md:py-20 border-t border-slate-800/60 bg-[#0B0F17]/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Estándares Bancarios & Logísticos</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Infraestructura Confiable y Segura
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Diseñado para operaciones de alta disponibilidad con total soberanía y resguardo de datos comerciales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#161B26]/60 border border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base tracking-tight mb-2">
                  Aislamiento Criptográfico de Tenants
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Cada inquilino cuenta con aislamiento lógico estricto a nivel de base de datos. Ningún usuario o vendedor de una unidad puede filtrar ni visualizar transacciones de otra.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#161B26]/60 border border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base tracking-tight mb-2">
                  Operación Offline-First en Campo
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Las fuerzas de ventas registran visitas, pedidos y cobranzas incluso en zonas sin cobertura celular. Los datos se concilian automáticamente al recuperar señal.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#161B26]/60 border border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base tracking-tight mb-2">
                  Alta Disponibilidad & SLA 99.9%
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Desplegado sobre arquitectura serverless cloud distribuida con replicación activa, copias de seguridad automáticas y auditoría transaccional continua.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer Institucional */}
      <footer className="border-t border-slate-800/80 bg-[#080B10] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Infinity className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">
                OmniSync <span className="font-light text-slate-400">Cloud</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Cifrado de extremo a extremo • Tenants con aislamiento criptográfico • OmniSync Core Engine 2026
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">
              Ingreso Operadores
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/super-admin" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Super Admin Master</span>
            </Link>
          </div>

        </div>
      </footer>

      {/* Provisioning Request Modal */}
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
                    <p className="text-xs text-blue-400 font-medium">
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
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                        className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                        className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all duration-150 flex items-center justify-center gap-2"
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
