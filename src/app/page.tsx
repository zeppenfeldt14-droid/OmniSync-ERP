'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  ShieldCheck, 
  Truck, 
  Laptop, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink, 
  Pill, 
  Hammer, 
  Banknote, 
  Radio, 
  Car, 
  Home, 
  Sun, 
  Sprout, 
  Shirt, 
  ShieldAlert, 
  Layers, 
  X, 
  ChevronRight,
  Clock,
  Send,
  Users,
  Lock
} from 'lucide-react'

interface ModeloItem {
  id: string
  titulo: string
  industria: string
  icono: React.ReactNode
  color: string
  badge: string
  descripcion: string
  caracteristicas: string[]
  moneda: string
}

export default function LobbyPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedModelForModal, setSelectedModelForModal] = useState<string>('')
  const [formData, setFormData] = useState({
    empresa: '',
    modelo: '',
    vendedores: '1 a 5',
    contacto: '',
    email: '',
    mensaje: ''
  })
  const [enviado, setEnviado] = useState(false)

  const modelosAdicionales: ModeloItem[] = [
    {
      id: 'farma',
      titulo: 'Farmacéutica, Laboratorios & Agentes APM',
      industria: 'Salud & Medicina',
      icono: <Pill size={24} className="text-rose-400" />,
      color: '#f43f5e',
      badge: 'Fuerza de Calle Especializada',
      descripcion: 'Gestión de visitas médicas de agentes de propaganda médica (APM) a consultorios, clínicas y farmacias con control de muestras y material científico.',
      caracteristicas: [
        'Ruteo por especialidad médica y centros de salud',
        'Entrega y trazabilidad de muestras médicas',
        'Catálogo farmacológico con presentaciones y vademécum',
        'Reportes de prescripción y cobertura por zona'
      ],
      moneda: 'ARS / USD'
    },
    {
      id: 'construccion',
      titulo: 'Materiales de Construcción & Ferretería Industrial',
      industria: 'Construcción & Corralones',
      icono: <Hammer size={24} className="text-amber-400" />,
      color: '#f59e0b',
      badge: 'Venta Técnica y Volumétrica',
      descripcion: 'Venta mayorista a obras, arquitectos y corralones. Manejo de fletes, bultos pesados, cuentas corrientes y cotizaciones dinámicas.',
      caracteristicas: [
        'Cotizador volumétrico por m², pallets y toneladas',
        'Gestión de fletes y logística de entrega en obra',
        'Límites de crédito y cheques diferidos',
        '4 zonas de despacho logístico georreferenciado'
      ],
      moneda: 'ARS'
    },
    {
      id: 'seguros',
      titulo: 'Seguros, Servicios Financieros & Inversiones',
      industria: 'Finanzas & Seguros',
      icono: <Banknote size={24} className="text-emerald-400" />,
      color: '#10b981',
      badge: 'Asesoría & Comisiones',
      descripcion: 'Plataforma para agencias de seguros patrimoniales, vida y carteras financieras con prospección comercial y cálculo automático de comisiones.',
      caracteristicas: [
        'Seguimiento de pólizas y alertas de renovación',
        'Pipeline de prospectos calificados por ejecutivo',
        'Comisiones escalonadas por cierre de contratos',
        'Gestión de cartera de clientes corporativos'
      ],
      moneda: 'USD / ARS'
    },
    {
      id: 'telecom',
      titulo: 'Telecomunicaciones, Fibra Óptica & Servicios IT',
      industria: 'Conectividad & B2B',
      icono: <Radio size={24} className="text-cyan-400" />,
      color: '#06b6d4',
      badge: 'Cuentas Corporativas B2B',
      descripcion: 'Equipos de ventas corporativas de enlaces dedicados, telefonía IP, fibra óptica comercial y contratos de servicios gestionados.',
      caracteristicas: [
        'Factibilidad técnica de cobertura por zona',
        'Contratos mensuales recurrentes (MRR) en USD',
        'Pipeline de venta consultiva para grandes empresas',
        'Gestión de órdenes de instalación y altas de servicio'
      ],
      moneda: 'USD'
    },
    {
      id: 'automotriz',
      titulo: 'Automotriz, Repuestos & Maquinaria Pesada',
      industria: 'Autopartes & Concesionarias',
      icono: <Car size={24} className="text-blue-400" />,
      color: '#3b82f6',
      badge: 'Flotas & Catálogo OEM',
      descripcion: 'Venta de repuestos, lubricantes y flotas corporativas. Atención de talleres, distribuidores zonales y servicios mecánicos con catálogo por código.',
      caracteristicas: [
        'Buscador por código de pieza y compatibilidad',
        'Venta preventiva para mantenimiento de flotas',
        'Listas de precios diferenciales por taller/distribuidor',
        'Ruta de cobranza y entrega programada'
      ],
      moneda: 'USD / ARS'
    },
    {
      id: 'realestate',
      titulo: 'Desarrollos Inmobiliarios & Bienes Raíces (Real Estate)',
      industria: 'Inmobiliaria & Loteos',
      icono: <Home size={24} className="text-indigo-400" />,
      color: '#6366f1',
      badge: 'Venta Alto Ticket',
      descripcion: 'Brokers y agentes comerciales de desarrollos en pozo, loteos y propiedades residenciales. CRM de compradores calificados y visitas guiadas.',
      caracteristicas: [
        'Ficha técnica interactiva de unidades y lotes',
        'Historial de visitas presenciales a desarrollos',
        'Simulador de planes de pago y cuotas en pozo',
        'Embudo de conversión de inversores'
      ],
      moneda: 'USD'
    },
    {
      id: 'solar',
      titulo: 'Energía Solar, Renovables & Climatización',
      industria: 'Energías Limpias',
      icono: <Sun size={24} className="text-yellow-400" />,
      color: '#eab308',
      badge: 'Consultoría en Terreno',
      descripcion: 'Asesores comerciales y técnicos que relevan techos residenciales e industriales para la instalación de sistemas solares y eficiencia energética.',
      caracteristicas: [
        'Relevamiento fotográfico y geolocalizado en sitio',
        'Cálculo de retorno de inversión (ROI) energético',
        'Venta de equipos (paneles/inversores) y mano de obra',
        'Seguimiento postventa y mantenimiento programado'
      ],
      moneda: 'USD'
    },
    {
      id: 'agro',
      titulo: 'Insumos Agrícolas, Semillas & Agroquímicos',
      industria: 'Agroindustria & Campo',
      icono: <Sprout size={24} className="text-emerald-500" />,
      color: '#059669',
      badge: 'Venta Estacional de Campo',
      descripcion: 'Fuerza de ventas técnica e ingenieros agrónomos que recorren campos, estancias y acopios ofreciendo insumos, fertilizantes y semillas.',
      caracteristicas: [
        'Mapeo de lotes y establecimientos agropecuarios',
        'Cotización en quintales, toneladas y por hectárea',
        'Venta contra cosecha y crédito cerealero',
        'Bitácora técnica de estado de cultivo y recomendaciones'
      ],
      moneda: 'USD'
    },
    {
      id: 'textil',
      titulo: 'Moda, Confección & Textil Mayorista',
      industria: 'Indumentaria & Calzado',
      icono: <Shirt size={24} className="text-purple-400" />,
      color: '#a855f7',
      badge: 'Preventa de Colección',
      descripcion: 'Viajantes comerciales y distribuidores de moda mayorista que visitan boutiques y tiendas comerciales levantando pedidos por curva de talles y colores.',
      caracteristicas: [
        'Catálogo visual de temporada y lookbooks',
        'Preventa por curvas de talle y bultos cerrados',
        'Sincronización de pedidos a talleres de confección',
        'Gestión de cuentas corrientes de locales minoristas'
      ],
      moneda: 'ARS / USD'
    },
    {
      id: 'seguridad',
      titulo: 'Seguridad Electrónica, Alarmas & Monitoreo 24/7',
      industria: 'Seguridad & Protección',
      icono: <ShieldAlert size={24} className="text-red-400" />,
      color: '#ef4444',
      badge: 'Abonos Recurrentes',
      descripcion: 'Fuerza de ventas y técnicos que realizan relevamientos de seguridad en hogares y empresas, cotizando la instalación y el abono mensual de monitoreo.',
      caracteristicas: [
        'Levantamiento de puntos vulnerables y sensores en plano',
        'Contratos con débito automático y abono mensual',
        'Comisión por alta de servicio y cuota de mantenimiento',
        'Ruta de visitas de auditoría y servicio técnico'
      ],
      moneda: 'Moneda Local'
    }
  ]

  const handleOpenModal = (modelName?: string) => {
    if (modelName) {
      setSelectedModelForModal(modelName)
      setFormData(prev => ({ ...prev, modelo: modelName }))
    }
    setModalOpen(true)
  }

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault()
    setEnviado(true)
    setTimeout(() => {
      setEnviado(false)
      setModalOpen(false)
      setFormData({
        empresa: '',
        modelo: '',
        vendedores: '1 a 5',
        contacto: '',
        email: '',
        mensaje: ''
      })
    }, 2500)
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* ── 1. PÓRTICO / HEADER SUPERIOR SEÑORIAL ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#07090e]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl transition">
        <div className="flex items-center gap-3.5">
          <img 
            src="/omnisync-logo.png" 
            alt="OmniSync ERP" 
            className="h-7 sm:h-8 object-contain filter brightness-125 drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]" 
          />
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-black tracking-widest text-amber-400 uppercase font-mono">
              OmniSync Cloud
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Ecosistema Multi-Inquilino • Edificio Corporativo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* BOTÓN CON ESCUDO DE SEGURIDAD PARA SUPER ADMIN */}
          <Link
            href="/super-admin"
            className="group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent hover:from-amber-500/30 hover:to-amber-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400 text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]"
            title="Portal de Gobernanza y Control Super Admin"
          >
            <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/50 group-hover:scale-110 transition">
              <ShieldCheck size={14} className="text-amber-400" />
            </div>
            <span className="hidden sm:inline font-mono uppercase tracking-wider text-[11px]">
              Portal Super Admin
            </span>
          </Link>

          {/* ACCESO / LOGIN GENERAL */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 text-xs font-semibold transition"
          >
            <Lock size={13} className="text-slate-400" />
            <span>Ingreso Operadores</span>
          </Link>
        </div>
      </header>

      {/* ── 2. HERO / EL GRAN LOBBY SEÑORIAL ── */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 border-b border-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#07090e] to-[#07090e]">
        {/* Glow ambient background */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-6xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono font-bold tracking-wide shadow-inner">
            <Building2 size={13} className="text-amber-400" />
            <span>HALL DE ENTRADA & DIRECTORIO CENTRAL DE NEGOCIOS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Bienvenido al <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">Lobby Corporativo</span> de OmniSync
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Plataforma cloud unificada de gestión comercial, logística y servicios profesionales. Seleccione la unidad de negocio a la que desea ingresar o explore los modelos de industria disponibles para el alta de nuevos inquilinos.
          </p>

          {/* Métricas rápidas del ecosistema */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Aislamiento Criptográfico Multi-Tenant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Soporte Multi-Moneda (USD / ARS / Local)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Geolocalización & Ruteo Activo</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. DIRECTORIO DEL EDIFICIO: INQUILINOS ACTIVOS ── */}
      <section className="py-12 px-4 sm:px-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
              Directorio de Unidades Operativas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-2.5">
              <Layers className="text-amber-500" size={24} />
              Inquilinos Activos en el Edificio
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-md text-left sm:text-right">
            Seleccione su empresa para ingresar directamente a su panel operativo aislado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* INQUILINO 1: GOLOCINAS */}
          <div className="group relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-blue-950/30 to-[#0c1322] border border-blue-500/30 hover:border-blue-400/60 shadow-xl hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center group-hover:scale-105 transition">
                  <Truck size={26} className="text-blue-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Físico / Terreno
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Operativa 100%" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-blue-300 transition">
                  Golocinas
                </h3>
                <p className="text-xs text-blue-300/80 font-mono mt-0.5">
                  Distribución Mayorista, Consumo Masivo & Preventa
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Unidad logística especializada en venta en calle, distribución masiva a comercios, ruteo georreferenciado en 4 zonas de Buenos Aires, listas de precios físicas y cobranzas.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-slate-300 border-t border-white/5">
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Cuentas Comerciales</span>
                  <strong className="text-white text-sm">363 Clientes</strong>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Zonas Logísticas</span>
                  <strong className="text-blue-300 text-sm">4 Zonas (Bs. As.)</strong>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Moneda Operativa</span>
                  <strong className="text-emerald-400 text-sm">ARS ($)</strong>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Ruta URL</span>
                  <strong className="text-amber-400 text-sm">/golocinas</strong>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/golocinas"
                className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 group-hover:shadow-blue-600/50"
              >
                <span>🚪 Entrar a Unidad Golocinas</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>

          {/* INQUILINO 2: VINNATY */}
          <div className="group relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-purple-950/30 to-[#120e22] border border-purple-500/30 hover:border-purple-400/60 shadow-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center group-hover:scale-105 transition">
                  <Laptop size={26} className="text-purple-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Servicios Digitales
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Operativa 100%" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-purple-300 transition">
                  Vinnaty
                </h3>
                <p className="text-xs text-purple-300/80 font-mono mt-0.5">
                  Agencia de Publicidad, Marketing Digital & Software
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Unidad de servicios estratégicos, desarrollos a medida, analítica de KPIs, pauta publicitaria y cotizador web para PyMEs con gestión de abonos recurrentes en dólares.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-slate-300 border-t border-white/5">
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Soluciones Catálogo</span>
                  <strong className="text-white text-sm">8 Servicios</strong>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Territorios Ventas</span>
                  <strong className="text-purple-300 text-sm">4 Zonas Estándar</strong>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Moneda Operativa</span>
                  <strong className="text-emerald-400 text-sm">USD ($)</strong>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase">Ruta URL</span>
                  <strong className="text-amber-400 text-sm">/vinnaty</strong>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/vinnaty"
                className="w-full py-3.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/30 group-hover:shadow-purple-600/50"
              >
                <span>🚪 Entrar a Unidad Vinnaty</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. MODELOS DE NEGOCIOS DISPONIBLES PARA ALTA DE INQUILINOS (10+ MODELOS) ── */}
      <section className="py-14 px-4 sm:px-8 border-t border-white/10 bg-[#06080d]">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-black uppercase tracking-wider mb-2">
                <Sparkles size={12} />
                <span>Expansión del Ecosistema SaaS</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Modelos de Industria Disponibles para Nuevos Inquilinos
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Cualquier organización con equipo comercial o de distribución puede incorporarse como inquilino independiente en OmniSync con su propia plantilla operativa y moneda configurada.
              </p>
            </div>

            <button
              onClick={() => handleOpenModal()}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/25 flex items-center gap-2 flex-shrink-0"
            >
              <span>Solicitar Aprovisionamiento</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* GRID DE LOS 10 MODELOS DE EQUIPOS DE VENTAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modelosAdicionales.map(modelo => (
              <div 
                key={modelo.id}
                className="rounded-2xl p-6 bg-[#0c101a] border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-lg hover:shadow-2xl"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {modelo.icono}
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-amber-300 border border-white/10">
                      {modelo.moneda}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
                      {modelo.industria}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-2">
                      {modelo.titulo}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {modelo.descripcion}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    {modelo.caracteristicas.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                        <CheckCircle2 size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-auto">
                  <button
                    onClick={() => handleOpenModal(modelo.titulo)}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-black text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-white/10 hover:border-amber-400"
                  >
                    <span>Aprovisionar este Modelo</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 5. FOOTER SEÑORIAL ── */}
      <footer className="mt-auto border-t border-white/10 bg-[#040609] py-8 px-4 sm:px-8 text-center sm:text-left">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/omnisync-logo.png" alt="Logo" className="h-5 opacity-60" />
            <span>OmniSync ERP • Edificio Corporativo & Gobernanza SaaS</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <Link href="/super-admin" className="hover:text-amber-400 transition flex items-center gap-1">
              <ShieldCheck size={12} />
              <span>Super Admin</span>
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-white transition">
              Iniciar Sesión
            </Link>
            <span>•</span>
            <span className="text-slate-500">© 2026 Todos los derechos reservados</span>
          </div>
        </div>
      </footer>

      {/* ── MODAL: SOLICITUD DE ALTA / APROVISIONAMIENTO DE INQUILINO ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e121e] border border-amber-500/30 p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-amber-400 font-black mb-1">
                <Building2 size={13} />
                <span>Solicitud de Incorporación</span>
              </div>
              <h3 className="text-xl font-bold text-white">
                Alta de Nueva Unidad de Negocio / Inquilino
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Complete los datos para configurar su entorno aislado con catálogo, usuarios y zonas.
              </p>
            </div>

            {enviado ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Solicitud Recibida</h4>
                <p className="text-xs text-slate-300">
                  El Super Admin revisará su solicitud para aprovisionar su subdominio o ruta dedicada en el edificio OmniSync.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitModal} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nombre de la Empresa o Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Distribuidora San Martín S.A."
                    value={formData.empresa}
                    onChange={e => setFormData({ ...prevFormData => ({ ...prevFormData, empresa: e.target.value }) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Modelo de Negocio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Farmacéutica / Distribución"
                      value={formData.modelo}
                      onChange={e => setFormData({ ...prevFormData => ({ ...prevFormData, modelo: e.target.value }) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Equipo Comercial Estimado</label>
                    <select
                      value={formData.vendedores}
                      onChange={e => setFormData({ ...prevFormData => ({ ...prevFormData, vendedores: e.target.value }) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c101a] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="1 a 5">1 a 5 Vendedores</option>
                      <option value="5 a 15">5 a 15 Vendedores</option>
                      <option value="15 a 50">15 a 50 Vendedores</option>
                      <option value="Más de 50">Más de 50 Vendedores</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Contacto / Responsable *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.contacto}
                      onChange={e => setFormData({ ...prevFormData => ({ ...prevFormData, contacto: e.target.value }) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="contacto@empresa.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...prevFormData => ({ ...prevFormData, email: e.target.value }) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Notas o Requisitos de Zona / Moneda</label>
                  <textarea
                    rows={2}
                    placeholder="Indique requerimientos específicos (zonas geográficas, moneda preferida, etc.)"
                    value={formData.mensaje}
                    onChange={e => setFormData({ ...prevFormData => ({ ...prevFormData, mensaje: e.target.value }) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-2 transition shadow-md shadow-amber-500/20"
                  >
                    <Send size={14} />
                    <span>Enviar Solicitud</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
