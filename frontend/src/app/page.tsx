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
    <div className="border border-white/8 rounded-2xl overflow-hidden transition-all" style={{ background: open ? 'rgba(0,200,81,0.04)' : 'rgba(255,255,255,0.02)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/3 transition-colors"
      >
        <span className="font-semibold text-white text-sm leading-snug">{q}</span>
        <div className={`w-7 h-7 rounded-full border border-white/10 flex items-center justify-center shrink-0 ml-4 transition-all duration-200 ${open ? 'bg-[#00c851] border-[#00c851]' : ''}`}>
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180 text-white' : 'text-slate-400'}`} />
        </div>
      </button>
      {open && (
        <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4">
          {a}
        </div>
      )}
    </div>
  )
}

// ── Integration logos ─────────────────────────────────────────
const LOGOS = [
  { name: 'WhatsApp',  src: '/uploads/logos/whatsapp.svg'  },
  { name: 'Instagram', src: '/uploads/logos/instagram.svg' },
  { name: 'Facebook',  src: '/uploads/logos/facebook.svg'  },
  { name: 'TikTok',    src: '/uploads/logos/tiktok.svg'    },
  { name: 'Telegram',  src: '/uploads/logos/telegram.svg'  },
  { name: 'Shopify',   src: '/uploads/logos/shopify.svg'   },
  { name: 'OpenAI',    src: '/uploads/logos/openai.svg'    },
  { name: 'n8n',       src: '/uploads/logos/n8n.svg'       },
]

const CHANNELS = [
  { icon: Phone,       name: 'WhatsApp Business', desc: 'Mensajes, respuestas automáticas y notificaciones.', color: '#25d366' },
  { icon: '📷',        name: 'Instagram DMs',     desc: 'Responde comentarios y mensajes directos auto.', color: '#e1306c' },
  { icon: '👥',        name: 'Facebook Leads',    desc: 'Captura leads de formularios y Messenger.', color: '#1877f2' },
  { icon: '🎵',        name: 'TikTok Leads',      desc: 'Lead Generation de TikTok directo al CRM.', color: '#ff0050' },
  { icon: ShoppingBag, name: 'Shopify',           desc: 'Ventas, carrito abandonado, pedidos.', color: '#96bf48' },
  { icon: Mail,        name: 'Email',             desc: 'Campañas y secuencias automáticas.', color: '#f59e0b' },
  { icon: Globe,       name: 'Web Chat',          desc: 'Widget IA embebible en tu sitio.', color: '#00c851' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('omniflow_token')) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#06080f] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#06080f]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>
              <Wifi size={16} className="text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-tight">Omni<span style={{ color: '#00c851' }}>Flow</span></span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#canales" className="hover:text-white transition-colors">Canales</a>
            <a href="#como" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 font-medium">Entrar</Link>
            <Link href="/register">
              <button className="flex items-center gap-1.5 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>
                Empezar gratis <ChevronRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-0 px-6 relative overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(0,200,81,0.08) 0%,transparent 70%)' }} />
        <div className="absolute top-40 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(234,179,8,0.05) 0%,transparent 70%)' }} />
        <div className="absolute top-40 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(0,200,81,0.04) 0%,transparent 70%)' }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Left — text */}
            <div className="flex-1 text-center lg:text-left pt-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold mb-8 border" style={{ background: 'rgba(0,200,81,0.08)', borderColor: 'rgba(0,200,81,0.2)', color: '#00c851' }}>
                <Zap size={11} className="fill-current" />
                Nuevo: Broadcasts masivos · WhatsApp · Instagram · Facebook
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
                Automatiza tus
                <br />
                <span style={{ background: 'linear-gradient(90deg,#00c851,#eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  ventas y atención
                </span>
                <br />
                al cliente
              </h1>

              <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-10 leading-relaxed">
                Conecta WhatsApp, Instagram, Facebook y más en un CRM con IA.
                El bot responde 24/7, califica leads y agenda — tú solo cierras ventas.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-10">
                <Link href="/register">
                  <button className="flex items-center gap-2 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 text-base" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>
                    Empezar gratis 14 días <ArrowRight size={18} />
                  </button>
                </Link>
                <a href="#como">
                  <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base">
                    Ver cómo funciona
                  </button>
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Check size={12} className="text-[#00c851]" /> Sin tarjeta de crédito</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-[#00c851]" /> Setup en menos de 1 hora</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-[#00c851]" /> Cancela cuando quieras</span>
              </div>
            </div>

            {/* Right — Dashboard mockup */}
            <div className="flex-1 w-full lg:w-auto relative">
              {/* Glow behind mockup */}
              <div className="absolute -inset-4 rounded-3xl blur-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(0,200,81,0.15) 0%,transparent 70%)' }} />

              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: '#0d1117' }}>
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5" style={{ background: '#0a0e15' }}>
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#00c851', opacity: 0.7 }} />
                  <span className="text-[10px] text-slate-600 ml-2 flex-1 text-center">OmniFlow — Panel de Control</span>
                </div>

                {/* App UI */}
                <div className="flex h-72 md:h-96">
                  {/* Sidebar */}
                  <div className="w-12 md:w-48 border-r border-white/5 flex flex-col gap-0.5 p-2 md:p-3" style={{ background: '#090d14' }}>
                    <div className="hidden md:flex items-center gap-2 mb-3 px-2 pt-1">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#00c851' }}>
                        <Wifi size={11} className="text-white" />
                      </div>
                      <span className="text-xs font-black text-white">Omni<span style={{ color: '#00c851' }}>Flow</span></span>
                    </div>
                    {[
                      { label: 'Dashboard', icon: '◻' },
                      { label: 'Conversaciones', icon: '💬', active: true },
                      { label: 'CRM / Leads', icon: '👥' },
                      { label: 'Broadcasts', icon: '📢' },
                      { label: 'Automatizaciones', icon: '⚡' },
                      { label: 'Canales', icon: '🔗' },
                      { label: 'Analytics', icon: '📊' },
                    ].map(({ label, active, icon }) => (
                      <div key={label} className={`px-2 py-2 rounded-xl text-[10px] font-medium flex items-center gap-2 ${active ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
                        style={active ? { background: 'rgba(0,200,81,0.15)', color: '#00c851' } : {}}>
                        <span className="text-sm hidden md:block">{icon}</span>
                        <span className="hidden md:block">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Conversation list */}
                  <div className="w-36 md:w-56 border-r border-white/5 overflow-hidden" style={{ background: '#0d1117' }}>
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inbox</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#00c851' }}>24</span>
                    </div>
                    {[
                      { name: 'María González', msg: '¿Tienen stock del XL?', time: '2m', ch: '📱', unread: 2, color: '#25d366' },
                      { name: 'Carlos Ruiz',    msg: 'Quiero cotizar 50 und…',time: '5m', ch: '📷', unread: 1, color: '#e1306c' },
                      { name: 'Ana Martínez',   msg: 'Gracias por la info!', time: '12m', ch: '📱', unread: 0, color: '#25d366' },
                      { name: 'Pedro Silva',    msg: '¿Cuándo llega pedido?', time: '1h', ch: '👥', unread: 0, color: '#1877f2' },
                    ].map(({ name, msg, time, ch, unread, color }) => (
                      <div key={name} className="flex items-center gap-2 px-3 py-2.5 border-b border-white/3 cursor-pointer hover:bg-white/3 transition-colors">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ background: `${color}30`, border: `1.5px solid ${color}40` }}>
                          {name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-200 truncate">{name}</span>
                            <span className="text-[9px] text-slate-600 shrink-0 ml-1">{time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px]">{ch}</span>
                            <p className="text-[9px] text-slate-600 truncate">{msg}</p>
                          </div>
                        </div>
                        {unread > 0 && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0" style={{ background: '#00c851' }}>{unread}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Chat panel */}
                  <div className="flex-1 flex flex-col min-w-0" style={{ background: '#0d1117' }}>
                    {/* Chat header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5" style={{ background: '#090d14' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#25d36630', border: '1.5px solid #25d36640' }}>M</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-white">María González</div>
                        <div className="text-[8px] text-slate-600">WhatsApp Business</div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,200,81,0.15)', color: '#00c851' }}>● Bot activo</span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-3 space-y-2 overflow-hidden">
                      <div className="flex justify-start">
                        <div className="bg-white/8 border border-white/5 rounded-2xl rounded-tl-sm px-3 py-1.5 text-[10px] text-slate-300 max-w-[80%]">¿Tienen stock del modelo XL?</div>
                      </div>
                      <div className="flex justify-end">
                        <div className="rounded-2xl rounded-tr-sm px-3 py-1.5 text-[10px] text-white max-w-[80%]" style={{ background: 'rgba(0,200,81,0.25)', border: '1px solid rgba(0,200,81,0.2)' }}>
                          ¡Hola María! Sí tenemos XL en negro y blanco. ¿Te envío el catálogo? 😊
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-white/8 border border-white/5 rounded-2xl rounded-tl-sm px-3 py-1.5 text-[10px] text-slate-300 max-w-[80%]">Sí por favor, y el precio</div>
                      </div>
                      <div className="flex justify-end">
                        <div className="rounded-2xl rounded-tr-sm px-3 py-1.5 text-[10px] text-white max-w-[80%]" style={{ background: 'rgba(0,200,81,0.25)', border: '1px solid rgba(0,200,81,0.2)' }}>
                          XL está a $24.990. Te envío el link de pago directo 🛒
                        </div>
                      </div>
                    </div>

                    {/* Input bar */}
                    <div className="px-3 pb-3">
                      <div className="flex items-center gap-2 border border-white/8 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-[10px] text-slate-600 flex-1">Responder como humano…</span>
                        <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: '#00c851' }}>
                          <ArrowRight size={9} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating stats badges */}
              <div className="absolute -left-4 top-16 hidden lg:flex items-center gap-2 bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,200,81,0.15)' }}>
                  <MessageSquare size={13} style={{ color: '#00c851' }} />
                </div>
                <div>
                  <div className="text-xs font-black text-white">+2.4K</div>
                  <div className="text-[9px] text-slate-500">mensajes hoy</div>
                </div>
              </div>
              <div className="absolute -right-4 bottom-20 hidden lg:flex items-center gap-2 bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.15)' }}>
                  <Zap size={13} style={{ color: '#eab308' }} />
                </div>
                <div>
                  <div className="text-xs font-black text-white">94%</div>
                  <div className="text-[9px] text-slate-500">resuelto por IA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-14 px-6 mt-16" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { label: 'Empresas activas',   to: 500,  suffix: '+',   color: '#00c851' },
            { label: 'Mensajes/mes',        to: 2000, suffix: 'K+',  color: '#eab308' },
            { label: 'Más conversiones',    to: 3,    suffix: '.2x', color: '#00c851' },
            { label: 'Tiempo de respuesta', to: 200,  suffix: 'ms',  color: '#eab308' },
          ].map(({ label, to, suffix, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="text-4xl md:text-5xl font-black" style={{ color }}>
                <Counter to={to} suffix={suffix} />
              </div>
              <div className="text-xs text-slate-500 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Logos / integrations marquee ── */}
      <section className="py-14 px-6 overflow-hidden">
        <p className="text-center text-xs text-slate-500 uppercase tracking-widest mb-8 font-semibold">Integra con las plataformas que ya usas</p>
        <div className="flex gap-10 items-center justify-center flex-wrap">
          {LOGOS.map(({ name, src }) => (
            <div key={name} className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all duration-300 hover:scale-110">
              <img src={src} alt={name} width={120} height={120} className="object-contain" />
              <span className="text-[10px] text-slate-500 font-medium">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Channels ── */}
      <section id="canales" className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border" style={{ background: 'rgba(0,200,81,0.08)', borderColor: 'rgba(0,200,81,0.2)', color: '#00c851' }}>
              <MessageSquare size={11} /> Omnicanal real
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">Todos tus canales,<br />un solo lugar</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Sin copiar y pegar, sin cambiar de pestaña. Cada mensaje entra al mismo inbox en tiempo real.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CHANNELS.map(({ icon: Icon, name, desc, color }) => (
              <div key={name} className="group rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 cursor-default" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="text-3xl mb-4">
                  {typeof Icon === 'string' ? Icon : (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                      <Icon size={20} style={{ color }} />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{name}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                <div className="w-8 h-0.5 mt-4 rounded-full group-hover:w-16 transition-all duration-300" style={{ background: color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border" style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.2)', color: '#eab308' }}>
              <Zap size={11} /> Motor de automatización
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">De lead a venta en 3 pasos</h2>
            <p className="text-slate-400">Powered by n8n + IA. Sin código. Sin fricción.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[calc(33.33%-1rem)] right-[calc(33.33%-1rem)] h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(0,200,81,0.3),rgba(234,179,8,0.3),transparent)' }} />
            {[
              {
                step: '01', color: '#00c851', bg: 'rgba(0,200,81,0.08)', title: 'Llega el mensaje',
                desc: 'WhatsApp, Instagram, Facebook o web. Todo entra al mismo inbox en tiempo real.',
                detail: 'WhatsApp → IA → CRM',
              },
              {
                step: '02', color: '#eab308', bg: 'rgba(234,179,8,0.08)', title: 'La IA lo analiza',
                desc: 'Detecta intención, califica el lead, responde automáticamente y actualiza el CRM.',
                detail: 'Score · Intención · Respuesta',
              },
              {
                step: '03', color: '#00c851', bg: 'rgba(0,200,81,0.08)', title: 'Tú cierras la venta',
                desc: 'Solo ves los leads calificados. El resto lo maneja el bot 24/7.',
                detail: 'Hot leads · Pipeline · $$$',
              },
            ].map(({ step, color, bg, title, desc, detail }) => (
              <div key={step} className="relative border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-300 hover:-translate-y-1" style={{ background: bg }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white mb-6" style={{ background: color }}>
                  {step}
                </div>
                <h3 className="font-black text-white text-xl mb-3">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">{desc}</p>
                <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg w-fit" style={{ background: `${color}20`, color }}>
                  {detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Todo lo que necesitas,<br />nada que no</h2>
            <p className="text-slate-400">Sin apps de terceros. Sin integraciones frágiles. Todo en uno.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Bot,       color: '#00c851', title: 'IA Integrada',         desc: 'Calificación automática, detección de intención, respuestas sugeridas y análisis de sentimiento en tiempo real.' },
              { icon: Shield,    color: '#eab308', title: 'Multi-Tenant Seguro',  desc: 'Cada empresa tiene su propia BD aislada. Datos encriptados en reposo y en tránsito. Servidores en Europa.' },
              { icon: BarChart3, color: '#00c851', title: 'Analytics Tiempo Real',desc: 'Conversión por canal, fuentes de leads, tiempo de respuesta y rendimiento del bot en vivo.' },
              { icon: Users,     color: '#eab308', title: 'Equipo Colaborativo',  desc: 'Asigna conversaciones, roles por agente, notas internas y handoff bot→humano con un click.' },
              { icon: Zap,       color: '#00c851', title: 'n8n Sin Límites',      desc: 'Editor visual de flujos incluido. 400+ integraciones. Crea automatizaciones sin código.' },
              { icon: Globe,     color: '#eab308', title: 'White-Label Total',    desc: 'Tu logo, tu dominio, tus colores. Ofrece la plataforma como servicio a tus propios clientes.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="group border border-white/5 rounded-2xl p-7 hover:border-white/10 transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110" style={{ background: `${color}15` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="font-black text-white mb-2 text-lg">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border" style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.2)', color: '#eab308' }}>
              <Star size={11} className="fill-current" /> Historias de éxito
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-slate-400">Empresas reales, resultados reales.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, stars, avatar }) => (
              <div key={name} className="border border-white/5 rounded-2xl p-7 flex flex-col gap-5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex gap-1">
                  {Array(stars).fill(0).map((_, i) => (
                    <Star key={i} size={14} className="fill-current" style={{ color: '#eab308' }} />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1">"{text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>
                    {avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{name}</div>
                    <div className="text-xs text-slate-500">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border" style={{ background: 'rgba(0,200,81,0.08)', borderColor: 'rgba(0,200,81,0.2)', color: '#00c851' }}>
              <Check size={11} /> Precios transparentes
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">Planes simples, escalables</h2>
            <p className="text-slate-400">Comienza gratis. Crece sin sorpresas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map(({ name, price, per, desc, features, cta, popular }) => (
              <div key={name} className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 ${popular ? 'scale-105 border-2' : 'border border-white/5 hover:border-white/10 hover:-translate-y-1'}`}
                style={popular
                  ? { background: 'rgba(0,200,81,0.06)', borderColor: '#00c851', boxShadow: '0 0 40px rgba(0,200,81,0.15)' }
                  : { background: 'rgba(255,255,255,0.02)' }
                }>
                {popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[11px] font-black px-5 py-1.5 rounded-full whitespace-nowrap shadow-lg" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>
                    ⭐ Más popular
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="font-black text-white text-xl mb-1">{name}</h3>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <div className="flex items-end gap-1 mb-7">
                  <span className="text-5xl font-black text-white">${price}</span>
                  <span className="text-slate-500 text-sm mb-1.5">{per}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,81,0.15)' }}>
                        <Check size={11} style={{ color: '#00c851' }} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <button className="w-full py-3.5 rounded-xl text-sm font-black transition-all duration-200 hover:scale-[1.02]"
                    style={popular
                      ? { background: 'linear-gradient(135deg,#00c851,#22c55e)', color: '#fff', boxShadow: '0 4px 20px rgba(0,200,81,0.3)' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }
                    }>
                    {cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-600 mt-8">
            Todos los planes incluyen 14 días de prueba · Sin tarjeta de crédito
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Preguntas frecuentes</h2>
            <p className="text-slate-400 text-sm">¿Tienes dudas? Te respondemos.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center,rgba(0,200,81,0.08) 0%,transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(0,200,81,0.3),rgba(234,179,8,0.3),transparent)' }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Big stat */}
          <div className="inline-flex items-center gap-3 mb-8 px-5 py-3 rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex -space-x-2">
              {['CT','RM','SH'].map((av) => (
                <div key={av} className="w-8 h-8 rounded-full border-2 border-[#06080f] flex items-center justify-center text-[10px] font-black text-white" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>{av}</div>
              ))}
            </div>
            <span className="text-sm text-slate-400">Más de <span className="text-white font-black">500 empresas</span> ya confían en OmniFlow</span>
          </div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Empieza hoy,
            <br />
            <span style={{ background: 'linear-gradient(90deg,#00c851,#eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              resultados esta semana
            </span>
          </h2>
          <p className="text-slate-400 mb-10 text-xl">
            14 días gratis. Sin tarjeta. Sin trucos.
            <br />Setup completo en menos de una hora.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <button className="flex items-center gap-2 text-white font-black px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 text-lg" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>
                Crear cuenta gratis <ArrowRight size={20} />
              </button>
            </Link>
            <a href="https://wa.me/56943449232" target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base">
                <Phone size={16} style={{ color: '#00c851' }} /> Hablar con ventas
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20" style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)' }}>
                  <Wifi size={14} className="text-white" />
                </div>
                <span className="font-black text-lg text-white">Omni<span style={{ color: '#00c851' }}>Flow</span></span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Automatización omnicanal para empresas chilenas que quieren crecer sin contratar más equipo.
              </p>
              <a href="https://wa.me/56943449232" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(0,200,81,0.12)', color: '#00c851', border: '1px solid rgba(0,200,81,0.2)' }}>
                <Phone size={12} /> +56 9 4344 9232
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-xs text-slate-500">
              <div>
                <div className="font-black text-slate-300 mb-4 text-sm">Producto</div>
                <div className="space-y-3">
                  <a href="#canales" className="block hover:text-white transition-colors">Canales</a>
                  <a href="#como" className="block hover:text-white transition-colors">Automatización</a>
                  <a href="#precios" className="block hover:text-white transition-colors">Precios</a>
                </div>
              </div>
              <div>
                <div className="font-black text-slate-300 mb-4 text-sm">Legal</div>
                <div className="space-y-3">
                  <Link href="/privacy" className="block hover:text-white transition-colors">Privacidad</Link>
                  <Link href="/terms" className="block hover:text-white transition-colors">Términos</Link>
                </div>
              </div>
              <div>
                <div className="font-black text-slate-300 mb-4 text-sm">Cuenta</div>
                <div className="space-y-3">
                  <Link href="/login" className="block hover:text-white transition-colors">Iniciar sesión</Link>
                  <Link href="/register" className="block hover:text-white transition-colors">Registrarse</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>© 2025 OmniFlow · Todos los derechos reservados</span>
            <span>Hecho con ❤️ en Chile 🇨🇱</span>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp floating button ── */}
      <a
        href="https://wa.me/56943449232"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-green-500/50 group"
        style={{ background: 'linear-gradient(135deg,#00c851,#22c55e)', boxShadow: '0 8px 32px rgba(0,200,81,0.4)' }}
      >
        {/* WhatsApp icon via SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="hidden sm:block">¿Hablamos?</span>
        {/* Pulse ring */}
        <span className="absolute -inset-0.5 rounded-2xl animate-ping opacity-20 pointer-events-none" style={{ background: '#00c851' }} />
      </a>

    </div>
  )
}
