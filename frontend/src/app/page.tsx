'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wifi, MessageSquare, Zap, ArrowRight, Check, ChevronRight,
  Bot, BarChart3, Shield, Users, Star, ChevronDown, Globe,
  Phone, ShoppingBag, Mail
} from 'lucide-react'

// ── Animated counter ──────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      let start = 0
      const step = to / 60
      const t = setInterval(() => {
        start += step
        if (start >= to) { setVal(to); clearInterval(t) } else setVal(Math.floor(start))
      }, 16)
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to])
  return <span ref={ref}>{val.toLocaleString('es-CL')}{suffix}</span>
}

// ── FAQ item ──────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/3 transition-colors"
      >
        <span className="font-medium text-white text-sm">{q}</span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 shrink-0 ml-4 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4">
          {a}
        </div>
      )}
    </div>
  )
}

// ── Integration logos ─────────────────────────────────────────
const LOGOS = [
  { name: 'WhatsApp',  color: '#25d366', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.523 5.855L.057 23.5l5.775-1.507A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z' },
  { name: 'Instagram', color: '#e1306c', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
  { name: 'Facebook',  color: '#1877f2', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  { name: 'TikTok',    color: '#ff0050', path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  { name: 'Telegram',  color: '#2AABEE', path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' },
  { name: 'Shopify',   color: '#96bf48', path: 'M15.337 2.294C15.285 1.967 14.97 1.8 14.72 1.8c-.011 0-2.013.049-2.013.049S11.34.512 11.177.352a.428.428 0 00-.302-.13l-.854 17.547 5.44-1.178-1.124-14.297zm-3.59-.47s-.694.213-.98.3c-.16-.52-.435-1.256-.934-1.256-.03 0-.059.003-.086.008C9.534.577 9.397.832 9.27 1.226c-1.134.351-1.922.594-2.012.622C6.49 2.143 6.463 2.17 6.449 2.439L5.55 18.568l7.697 1.665.854-17.547c-.128-.23-.246-.362-.354-.362z' },
  { name: 'OpenAI',    color: '#74aa9c', path: 'M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.33 14.073a4.505 4.505 0 0 1-1.99-6.177zm16.55 3.867l-5.843-3.37 2.02-1.164a.08.08 0 0 1 .071 0l4.488 2.589a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.38-.682zm2.01-3.065l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.483-2.585a4.5 4.5 0 0 1 6.664 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z' },
  { name: 'n8n',       color: '#ea4b71', path: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.5 14.5v-9l7 4.5-7 4.5z' },
]

const CHANNELS = [
  { icon: Phone,       name: 'WhatsApp Business', desc: 'Mensajes, respuestas automáticas y notificaciones.', color: '#25d366' },
  { icon: '📷',        name: 'Instagram DMs',     desc: 'Responde comentarios y mensajes directos auto.', color: '#e1306c' },
  { icon: '👥',        name: 'Facebook Leads',    desc: 'Captura leads de formularios y Messenger.', color: '#1877f2' },
  { icon: '🎵',        name: 'TikTok Leads',      desc: 'Lead Generation de TikTok directo al CRM.', color: '#ff0050' },
  { icon: ShoppingBag, name: 'Shopify',           desc: 'Ventas, carrito abandonado, pedidos.', color: '#96bf48' },
  { icon: Mail,        name: 'Email',             desc: 'Campañas y secuencias automáticas.', color: '#f59e0b' },
  { icon: Globe,       name: 'Web Chat',          desc: 'Widget IA embebible en tu sitio.', color: '#7c3aed' },
  { icon: '✈️',        name: 'Telegram',          desc: 'Bot conversacional con IA en Telegram.', color: '#2AABEE' },
]

const PLANS = [
  {
    name: 'Starter', price: '29', per: '/mes',
    desc: 'Para negocios que están empezando',
    features: ['1,000 contactos', '5,000 mensajes/mes', 'WhatsApp + Web Chat', 'IA básica', 'Soporte email'],
    cta: 'Comenzar gratis', popular: false,
  },
  {
    name: 'Pro', price: '79', per: '/mes',
    desc: 'El favorito de equipos en crecimiento',
    features: ['10,000 contactos', '50,000 mensajes/mes', 'Todos los canales', 'n8n incluido', 'IA avanzada', 'Soporte prioritario'],
    cta: 'Empezar con Pro', popular: true,
  },
  {
    name: 'Enterprise', price: '199', per: '/mes',
    desc: 'Para empresas que no aceptan límites',
    features: ['Contactos ilimitados', 'Mensajes ilimitados', 'White-label total', 'Instancias dedicadas', 'SLA 99.9%', 'Manager dedicado'],
    cta: 'Hablar con ventas', popular: false,
  },
]

const TESTIMONIALS = [
  { name: 'Camila Torres', role: 'Dueña, TerraBlinds', text: 'OmniFlow transformó cómo atendemos clientes. Nuestro bot responde 24/7 y el equipo solo interviene para cerrar ventas.', stars: 5, avatar: 'CT' },
  { name: 'Rodrigo Méndez', role: 'CEO, ClinicaVet', text: 'Conectamos WhatsApp e Instagram en un día. Los leads que antes se perdían ahora llegan al CRM solos.', stars: 5, avatar: 'RM' },
  { name: 'Sofía Herrera', role: 'Marketing, ModaXpress', text: 'Las campañas de broadcast por WhatsApp tienen 85% de apertura. Nunca volvemos al email marketing tradicional.', stars: 5, avatar: 'SH' },
]

const FAQS = [
  { q: '¿Necesito saber programar para usar OmniFlow?', a: 'No. El 90% de la plataforma es punto y click. Para automatizaciones avanzadas con n8n ofrecemos plantillas listas y soporte dedicado.' },
  { q: '¿Cuánto tiempo tarda en estar funcionando?', a: 'Menos de una hora. Conectas tu WhatsApp Business, configuras el bot y listo. Los canales de Instagram y Facebook tardan 10 minutos adicionales.' },
  { q: '¿Los datos de mis clientes están seguros?', a: 'Sí. Cada empresa tiene su propia base de datos aislada (multi-tenant). Datos encriptados en reposo y en tránsito. Servidores en Europa.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, sin penalizaciones ni contratos de permanencia. Cancelas cuando quieras desde el panel y no se te cobra el siguiente mes.' },
  { q: '¿Qué pasa si supero el límite de mensajes?', a: 'Te avisamos antes de llegar al límite. Puedes subir de plan con un click o comprar mensajes adicionales por $5 cada 10,000.' },
]

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('omniflow_token')) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#080812] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080812]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Wifi size={15} className="text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">OmniFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#canales"   className="hover:text-white transition-colors">Canales</a>
            <a href="#como"      className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#precios"   className="hover:text-white transition-colors">Precios</a>
            <a href="#faq"       className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">Entrar</Link>
            <Link href="/register">
              <button className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Empezar gratis <ChevronRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-7">
            <Zap size={11} className="fill-violet-400 text-violet-400" />
            Nuevo: Broadcasts masivos por WhatsApp · Instagram · Facebook
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
            Tu negocio responde solo,{' '}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              las 24 horas
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Conecta WhatsApp, Instagram, Facebook y más en un CRM con IA.
            El bot responde, califica leads y agenda — tú solo cierras ventas.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link href="/register">
              <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-2xl shadow-violet-500/25 text-sm">
                Empezar gratis 14 días <ArrowRight size={16} />
              </button>
            </Link>
            <a href="#como">
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-7 py-3.5 rounded-xl transition-all text-sm">
                Ver cómo funciona
              </button>
            </a>
          </div>

          {/* Trust line */}
          <p className="text-xs text-slate-600 mb-10">Sin tarjeta de crédito · Cancela cuando quieras · Setup en menos de 1 hora</p>

          {/* ── Dashboard mockup ── */}
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-2xl blur-xl" />
            <div className="relative bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0a0a16]">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-xs text-slate-600 ml-2">osw.conectaai.cl</span>
              </div>
              {/* Mock UI */}
              <div className="flex h-64 md:h-80">
                {/* Sidebar */}
                <div className="w-14 md:w-44 border-r border-white/5 flex flex-col gap-1 p-2 md:p-3">
                  {[
                    { label: 'Dashboard', active: false },
                    { label: 'Conversaciones', active: true },
                    { label: 'CRM', active: false },
                    { label: 'Broadcasts', active: false },
                    { label: 'Canales', active: false },
                  ].map(({ label, active }) => (
                    <div key={label} className={`px-2 py-1.5 rounded-lg text-xs hidden md:block ${active ? 'bg-violet-600/20 text-violet-300' : 'text-slate-600'}`}>
                      {label}
                    </div>
                  ))}
                </div>
                {/* Conversation list */}
                <div className="w-40 md:w-56 border-r border-white/5 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-white/5">Conversaciones · 24</div>
                  {[
                    { name: 'María González', msg: '¿Tienen stock del producto?', time: '2m', ch: '💬', unread: 2 },
                    { name: 'Carlos Ruiz',     msg: 'Quiero cotizar 50 unidades', time: '5m', ch: '📷', unread: 1 },
                    { name: 'Ana Martínez',    msg: 'Gracias por la info!',       time: '12m', ch: '💬', unread: 0 },
                    { name: 'Pedro Silva',     msg: '¿Cuándo llega el pedido?',   time: '1h', ch: '👥', unread: 0 },
                  ].map(({ name, msg, time, ch, unread }) => (
                    <div key={name} className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/3 cursor-pointer border-b border-white/3">
                      <div className="w-7 h-7 rounded-full bg-violet-600/30 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                        {name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-300 truncate">{name}</span>
                          <span className="text-[10px] text-slate-600 shrink-0 ml-1">{time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">{ch}</span>
                          <p className="text-[10px] text-slate-600 truncate">{msg}</p>
                        </div>
                      </div>
                      {unread > 0 && (
                        <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-bold shrink-0">{unread}</div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Chat */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
                    <div className="w-6 h-6 rounded-full bg-violet-600/30 flex items-center justify-center text-xs font-bold text-violet-300">M</div>
                    <span className="text-xs font-medium text-white">María González</span>
                    <span className="text-[10px] text-green-400 ml-auto">● Bot activo</span>
                  </div>
                  <div className="flex-1 p-3 space-y-2 overflow-hidden">
                    <div className="flex justify-start">
                      <div className="bg-white/8 rounded-xl rounded-tl-sm px-3 py-1.5 text-xs text-slate-300 max-w-[75%]">¿Tienen stock del modelo XL?</div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-violet-600/40 rounded-xl rounded-tr-sm px-3 py-1.5 text-xs text-violet-100 max-w-[75%]">¡Hola María! Sí tenemos stock XL en negro y blanco. ¿Te envío el catálogo? 😊</div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white/8 rounded-xl rounded-tl-sm px-3 py-1.5 text-xs text-slate-300 max-w-[75%]">Sí por favor, y el precio</div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-violet-600/40 rounded-xl rounded-tr-sm px-3 py-1.5 text-xs text-violet-100 max-w-[75%]">Claro! XL está a $24.990. Te envío el link de pago directo 🛒</div>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      <span className="text-xs text-slate-600 flex-1">Responder como humano…</span>
                      <div className="w-5 h-5 rounded-md bg-violet-600/40 flex items-center justify-center">
                        <ArrowRight size={10} className="text-violet-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-12 px-6 border-y border-white/5 bg-[#0a0a16]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Empresas activas',   to: 500,  suffix: '+' },
            { label: 'Mensajes/mes',        to: 2000, suffix: 'K+' },
            { label: 'Más conversiones',    to: 3,    suffix: '.2x' },
            { label: 'Tiempo de respuesta', to: 200,  suffix: 'ms' },
          ].map(({ label, to, suffix }) => (
            <div key={label}>
              <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent mb-1">
                <Counter to={to} suffix={suffix} />
              </div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Logos marquee ── */}
      <section className="py-10 px-6 overflow-hidden">
        <p className="text-center text-xs text-slate-600 uppercase tracking-widest mb-6">Integra con las plataformas que ya usas</p>
        <div className="flex gap-8 items-center justify-center flex-wrap">
          {LOGOS.map(({ name, color, path }) => (
            <div key={name} className="flex flex-col items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
              <svg width="24" height="24" viewBox="0 0 24 24" fill={color}>
                <path d={path} />
              </svg>
              <span className="text-[10px] text-slate-600">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Channels ── */}
      <section id="canales" className="py-20 px-6 bg-[#0a0a16]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-xs text-blue-300 mb-5">
              <MessageSquare size={11} /> Omnicanal real
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Todos tus canales, un solo lugar</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Sin copiar y pegar, sin cambiar de pestaña. Cada mensaje en un solo inbox.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CHANNELS.map(({ icon: Icon, name, desc, color }) => (
              <div key={name} className="group bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 hover:border-white/10 hover:bg-[#0f0f22] transition-all cursor-default">
                <div className="text-2xl mb-3">
                  {typeof Icon === 'string' ? Icon : <Icon size={22} style={{ color }} />}
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{name}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs text-amber-300 mb-5">
              <Zap size={11} /> Motor de automatización
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">De lead a venta en 3 pasos</h2>
            <p className="text-slate-400">Powered by n8n + IA. Sin código. Sin fricción.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01', color: '#25d366', title: 'Llega el mensaje',
                desc: 'WhatsApp, Instagram, Facebook o web. Todo entra al mismo inbox en tiempo real.',
                detail: 'WhatsApp → IA → CRM',
              },
              {
                step: '02', color: '#7c3aed', title: 'La IA lo analiza',
                desc: 'Detecta intención, califica el lead, responde automáticamente y actualiza el CRM.',
                detail: 'Score · Intención · Respuesta',
              },
              {
                step: '03', color: '#f59e0b', title: 'Tú cierras la venta',
                desc: 'Solo ves los leads calificados. El resto lo maneja el bot 24/7.',
                detail: 'Hot leads · Pipeline · $$$',
              },
            ].map(({ step, color, title, desc, detail }) => (
              <div key={step} className="relative bg-[#0d0d1a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                <div className="text-4xl font-black mb-4 opacity-10" style={{ color }}>{step}</div>
                <div className="w-2 h-2 rounded-full mb-4" style={{ background: color }} />
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{desc}</p>
                <div className="text-xs font-mono px-3 py-1.5 rounded-lg w-fit" style={{ background: `${color}15`, color }}>
                  {detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-6 bg-[#0a0a16]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Todo lo que necesitas</h2>
            <p className="text-slate-400">Sin apps de terceros. Sin integraciones frágiles.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Bot,       color: '#7c3aed', title: 'IA Integrada',        desc: 'Calificación automática, detección de intención, respuestas sugeridas y análisis de sentimiento.' },
              { icon: Shield,    color: '#25d366', title: 'Multi-Tenant Seguro', desc: 'Cada empresa tiene su propia BD aislada. Datos encriptados en reposo y en tránsito.' },
              { icon: BarChart3, color: '#f59e0b', title: 'Analytics Tiempo Real', desc: 'Conversión por canal, fuentes de leads, tiempo de respuesta y rendimiento del bot en vivo.' },
              { icon: Users,     color: '#e1306c', title: 'Equipo Colaborativo', desc: 'Asigna conversaciones, roles por agente, notas internas y handoff bot→humano con un click.' },
              { icon: Zap,       color: '#2AABEE', title: 'n8n Sin Límites',     desc: 'Editor visual de flujos incluido. 400+ integraciones. Crea automatizaciones sin código.' },
              { icon: Globe,     color: '#96bf48', title: 'White-Label Total',   desc: 'Tu logo, tu dominio, tus colores. Ofrece la plataforma como servicio a tus propios clientes.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                <div className="p-3 rounded-xl w-fit mb-4" style={{ background: `${color}15` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Lo que dicen nuestros clientes</h2>
            <p className="text-slate-400">Empresas reales, resultados reales.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, stars, avatar }) => (
              <div key={name} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array(stars).fill(0).map((_, i) => (
                    <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1">"{text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {avatar}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{name}</div>
                    <div className="text-[10px] text-slate-500">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="py-20 px-6 bg-[#0a0a16]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Planes simples, escalables</h2>
            <p className="text-slate-400">Comienza gratis. Crece sin sorpresas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, per, desc, features, cta, popular }) => (
              <div key={name} className={`relative flex flex-col bg-[#0d0d1a] border rounded-2xl p-6 transition-all ${popular ? 'border-violet-500/40 shadow-2xl shadow-violet-500/10 scale-[1.02]' : 'border-white/5 hover:border-white/10'}`}>
                {popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    ⭐ Más popular
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="font-bold text-white text-lg mb-1">{name}</h3>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-black text-white">${price}</span>
                  <span className="text-slate-500 text-sm mb-1">{per}</span>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Check size={13} className="text-violet-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <button className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${popular ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
                    {cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-600 mt-6">
            Todos los planes incluyen 14 días de prueba · Sin tarjeta de crédito
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Preguntas frecuentes</h2>
            <p className="text-slate-400 text-sm">¿Tienes dudas? Te respondemos.</p>
          </div>
          <div className="space-y-2">
            {FAQS.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-purple-900/10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Empieza hoy,
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              resultados esta semana
            </span>
          </h2>
          <p className="text-slate-400 mb-9 text-lg">
            14 días gratis. Sin tarjeta. Sin trucos.
            Setup completo en menos de una hora.
          </p>
          <Link href="/register">
            <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-2xl shadow-violet-500/30 text-base mx-auto">
              Crear cuenta gratis <ArrowRight size={18} />
            </button>
          </Link>
          <p className="mt-4 text-xs text-slate-600">Más de 500 empresas ya automatizaron sus ventas con OmniFlow</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
                  <Wifi size={13} className="text-white" />
                </div>
                <span className="font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">OmniFlow</span>
              </div>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                Automatización omnicanal para empresas que quieren crecer sin contratar más equipo.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-xs text-slate-500">
              <div>
                <div className="font-semibold text-slate-400 mb-3">Producto</div>
                <div className="space-y-2">
                  <a href="#canales" className="block hover:text-slate-300 transition-colors">Canales</a>
                  <a href="#como" className="block hover:text-slate-300 transition-colors">Automatización</a>
                  <a href="#precios" className="block hover:text-slate-300 transition-colors">Precios</a>
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-400 mb-3">Legal</div>
                <div className="space-y-2">
                  <Link href="/privacy" className="block hover:text-slate-300 transition-colors">Privacidad</Link>
                  <Link href="/terms" className="block hover:text-slate-300 transition-colors">Términos</Link>
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-400 mb-3">Cuenta</div>
                <div className="space-y-2">
                  <Link href="/login" className="block hover:text-slate-300 transition-colors">Iniciar sesión</Link>
                  <Link href="/register" className="block hover:text-slate-300 transition-colors">Registrarse</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>© 2025 OmniFlow · Todos los derechos reservados</span>
            <span>Hecho con ❤️ en Chile 🇨🇱</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
