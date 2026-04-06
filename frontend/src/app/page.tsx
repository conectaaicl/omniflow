'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wifi, Zap, ArrowRight, Check, ChevronRight,
  Bot, BarChart3, Shield, MessageSquare, Star,
  Play, Users, TrendingUp, Clock
} from 'lucide-react'

// ── Social brand SVG logos ────────────────────────────────────────────────
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.15a8.16 8.16 0 004.77 1.52V7.23a4.85 4.85 0 01-1-.54z"/>
  </svg>
)

const ShopifyIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M15.337 23.979l7.216-1.561s-2.597-17.566-2.617-17.675c-.018-.108-.108-.18-.198-.18-.09 0-1.733-.126-1.733-.126s-1.156-1.138-1.282-1.264v-.018L15.337 23.979zM12.182 7.922s-.738-.198-1.624-.198c-1.336 0-1.399.838-1.399 1.048 0 1.147 2.993 1.589 2.993 4.277 0 2.112-1.345 3.476-3.151 3.476-2.166 0-3.277-1.355-3.277-1.355l.576-1.913s1.138.982 2.1.982c.63 0 .892-.495.892-.856 0-1.498-2.453-1.561-2.453-4.033 0-2.076 1.489-4.087 4.511-4.087 1.138 0 1.705.324 1.705.324L12.182 7.922zm-2.597-4.115c0-.036.018-.072.018-.108C9.909 1.742 11.156.5 12.6.5c.018 0 .036 0 .054.018-.018.018-.018.036-.018.054-.036.108-.072.216-.072.342 0 .612.486 1.008.486 1.008s-1.138-.18-1.453 1.885H9.585zm2.851-1.679c.198-.648.559-1.21 1.039-1.534.108.342.18.756.18 1.282 0 .486-.072.918-.18 1.282-.45-.162-.882-.54-1.039-1.03z"/>
  </svg>
)

const CHANNELS = [
  { Icon: WhatsAppIcon,  name: 'WhatsApp Business', color: '#25d366', bg: '#25d36620' },
  { Icon: InstagramIcon, name: 'Instagram DMs',     color: '#e1306c', bg: '#e1306c20' },
  { Icon: FacebookIcon,  name: 'Facebook Messenger',color: '#1877f2', bg: '#1877f220' },
  { Icon: TikTokIcon,    name: 'TikTok Leads',      color: '#ffffff', bg: '#ffffff15' },
  { Icon: ShopifyIcon,   name: 'Shopify',           color: '#96bf48', bg: '#96bf4820' },
  {
    Icon: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
    name: 'Email', color: '#f59e0b', bg: '#f59e0b20'
  },
  {
    Icon: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2" fill="none"/></svg>,
    name: 'Web Chat', color: '#7c3aed', bg: '#7c3aed20'
  },
]

const STATS = [
  { icon: Users,     value: '500+',   label: 'Empresas activas' },
  { icon: MessageSquare, value: '2M+', label: 'Mensajes/mes' },
  { icon: TrendingUp, value: '3.2x',  label: 'Más ventas promedio' },
  { icon: Clock,     value: '<2min',  label: 'Tiempo de respuesta' },
]

const TESTIMONIALS = [
  { name: 'Carlos M.', role: 'E-commerce', text: 'Pasamos de responder en horas a segundos. El bot de WhatsApp cerró 40 ventas la primera semana.', stars: 5 },
  { name: 'Ana R.',    role: 'Inmobiliaria', text: 'Los leads de Instagram ahora llegan directo al CRM con toda la info. Increíble.', stars: 5 },
  { name: 'Pedro L.',  role: 'Clínica dental', text: 'La agenda automática por WhatsApp redujo los no-show en un 60%.', stars: 5 },
]

// ── Chat Widget Demo ──────────────────────────────────────────────────────
const CHAT_DEMO = [
  { from: 'user', text: 'Hola, cuánto cuesta el plan Pro?' },
  { from: 'bot',  text: 'Hola! 👋 El plan Pro es $79/mes e incluye todos los canales (WhatsApp, Instagram, Facebook), n8n incluido, IA avanzada y soporte prioritario. ¿Quieres activarlo ahora?' },
  { from: 'user', text: 'Si, cómo empiezo?' },
  { from: 'bot',  text: 'Perfecto! 🚀 Haz clic en "Comenzar ahora", regístrate en 2 minutos y tendrás acceso inmediato. ¿Tienes alguna pregunta antes de empezar?' },
]

function ChatWidget() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(v => (v < CHAT_DEMO.length ? v + 1 : v))
    }, 1400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/10 max-w-sm w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#080812]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
          <Bot size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">OmniFlow Bot</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            En línea
          </p>
        </div>
        <div className="ml-auto flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 py-4 space-y-3 min-h-[220px]">
        {CHAT_DEMO.slice(0, visible).map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              msg.from === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-white/8 text-slate-200 rounded-bl-sm border border-white/5'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {visible < CHAT_DEMO.length && (
          <div className="flex justify-start">
            <div className="bg-white/8 border border-white/5 px-3 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-500 flex-1">Escribe un mensaje...</span>
          <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
            <ArrowRight size={10} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('omniflow_token')) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#080812] text-white overflow-x-hidden">

      {/* Navbar */}
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
            <a href="#demo"      className="hover:text-white transition-colors">Demo</a>
            <a href="#pricing"   className="hover:text-white transition-colors">Precios</a>
            <a href="#testimonios" className="hover:text-white transition-colors">Clientes</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <button className="text-sm text-slate-400 hover:text-white px-3 py-1.5 transition-colors">Iniciar sesión</button>
            </Link>
            <Link href="/register">
              <button className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-violet-500/20">
                Prueba gratis <ChevronRight size={13} />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-0 px-6 relative overflow-hidden min-h-[90vh] flex flex-col">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full relative z-10 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[75vh]">

            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-6">
                <Zap size={11} className="fill-current" /> Automatización omnicanal con IA · Hecho para Chile
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-6 tracking-tight">
                Tu negocio<br />
                responde{' '}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  solo,
                </span><br />
                las 24 horas
              </h1>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
                Conecta WhatsApp, Instagram, Facebook y más en un CRM con IA.
                El bot responde, califica leads y agenda — tú solo cierras ventas.
              </p>

              {/* Channel logos row */}
              <div className="flex items-center gap-3 mb-8 flex-wrap">
                {CHANNELS.map(({ Icon, name, color, bg }) => (
                  <div
                    key={name}
                    title={name}
                    className="p-2.5 rounded-xl border border-white/8 hover:border-white/15 transition-all hover:scale-110 cursor-default"
                    style={{ background: bg }}
                  >
                    <div style={{ color }}><Icon /></div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-2xl shadow-violet-500/30 text-base">
                    Empezar gratis 14 días <ArrowRight size={16} />
                  </button>
                </Link>
                <a href="#demo">
                  <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 text-white font-medium px-6 py-3.5 rounded-xl transition-all text-base">
                    <Play size={14} className="fill-current" /> Ver demo
                  </button>
                </a>
              </div>
              <p className="text-xs text-slate-600 mt-3">Sin tarjeta de crédito · Cancela cuando quieras</p>
            </div>

            {/* Right — HERO IMAGE + chat widget overlay */}
            <div className="relative flex items-center justify-center">
              {/* ── HERO IMAGE ── Reemplaza /hero-automation.png con tu imagen ── */}
              <div className="relative w-full aspect-square max-w-lg">
                <div className="absolute inset-0 rounded-3xl overflow-hidden border border-white/8">
                  {/* Coloca tu imagen aquí: public/hero-automation.png */}
                  <img
                    src="/uploads/hero-automation.png"
                    alt="Automatización omnicanal OmniFlow"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback: gradient placeholder if image not found
                      const t = e.currentTarget
                      t.style.display = 'none'
                      if (t.nextElementSibling) (t.nextElementSibling as HTMLElement).style.display = 'flex'
                    }}
                  />
                  {/* Placeholder shown when image is missing */}
                  <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-violet-900/40 via-[#0d0d1a] to-purple-900/30">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                        <Zap size={32} className="text-violet-400" />
                      </div>
                      <p className="text-slate-500 text-sm">Coloca tu imagen en<br /><code className="text-violet-400 text-xs">public/hero-automation.png</code></p>
                    </div>
                  </div>
                </div>

                {/* Floating chat widget — bottom left */}
                <div className="absolute -bottom-6 -left-6 w-[260px] scale-90 origin-bottom-left">
                  <ChatWidget />
                </div>

                {/* Floating stat badge — top right */}
                <div className="absolute -top-4 -right-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <p className="text-2xl font-bold text-emerald-400">+3.2x</p>
                  <p className="text-xs text-slate-400">ventas con IA</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-6xl mx-auto w-full mt-16 relative z-10 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-[#0a0a14] px-6 py-5 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Icon size={16} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHANNELS ─────────────────────────────────────────────────── */}
      <section id="canales" className="py-24 px-6 bg-[#090910]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-3">Canales conectados</p>
            <h2 className="text-4xl font-bold mb-4">Todos tus mensajes,<br />un solo panel</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Sin cambiar de pestaña. Sin perder un lead. Cada mensaje llega al CRM con contexto completo.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CHANNELS.map(({ Icon, name, color, bg }) => (
              <div key={name} className="group bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 hover:border-white/15 hover:-translate-y-1 transition-all duration-200">
                <div className="p-3 rounded-xl w-fit mb-4 border border-white/5" style={{ background: bg }}>
                  <div style={{ color }}><Icon /></div>
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{name}</h3>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-500">Activo</span>
                </div>
              </div>
            ))}
            {/* Add your logo here card */}
            <div className="bg-[#0d0d1a] border border-dashed border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 opacity-50">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <Zap size={18} className="text-slate-500" />
              </div>
              <p className="text-xs text-slate-600 text-center">Próximamente</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO / CHAT WIDGET ───────────────────────────────────────── */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-3">Bot con IA</p>
              <h2 className="text-4xl font-bold mb-5 leading-tight">
                Tu asistente responde<br />
                <span className="text-violet-400">en segundos,</span> no en horas
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                El bot entiende el contexto, calcula precios al instante, agenda citas
                y escala al humano cuando es necesario. Todo en el idioma y tono de tu marca.
              </p>
              <div className="space-y-4">
                {[
                  { icon: '🎯', title: 'Califica leads automáticamente',  desc: 'Detecta intención de compra y prioriza contactos listos para cerrar.' },
                  { icon: '💬', title: 'Responde en WhatsApp, IG y FB',   desc: 'Un bot, todos los canales. Coherente y siempre disponible.' },
                  { icon: '📅', title: 'Agenda citas sin intervención',   desc: 'El bot revisa disponibilidad y confirma la visita solo.' },
                  { icon: '🤝', title: 'Escala a humano cuando se pide',  desc: 'Detecta "quiero hablar con una persona" y transfiere al instante.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="text-xl shrink-0 mt-0.5">{icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live chat widget demo */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-600/10 rounded-3xl blur-3xl" />
                <div className="relative">
                  <ChatWidget />
                  {/* Channel badges */}
                  <div className="absolute -top-3 -right-3 flex gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[#080812] flex items-center justify-center bg-[#25d36620]">
                      <div className="text-[#25d366]"><WhatsAppIcon /></div>
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-[#080812] flex items-center justify-center bg-[#e1306c20]">
                      <div className="text-[#e1306c]"><InstagramIcon /></div>
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-[#080812] flex items-center justify-center bg-[#1877f220]">
                      <div className="text-[#1877f2]"><FacebookIcon /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS / INTEGRACIONES ────────────────────────────────────── */}
      <section className="py-14 px-6 bg-[#090910] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-slate-600 font-semibold tracking-widest uppercase mb-8">Se integra con las herramientas que ya usas</p>
          {/* ── Coloca aquí los logos de tus partners / integraciones ── */}
          {/* Para agregar un logo: copia el archivo a public/logos/nombre.png y agrégalo al array */}
          <div className="flex items-center justify-center gap-8 flex-wrap opacity-40 grayscale hover:opacity-60 transition-opacity">
            {[
              { name: 'WhatsApp',  src: '/uploads/logos/whatsapp.svg'  },
              { name: 'Instagram', src: '/uploads/logos/instagram.svg' },
              { name: 'Facebook',  src: '/uploads/logos/facebook.svg'  },
              { name: 'TikTok',    src: '/uploads/logos/tiktok.svg'    },
              { name: 'Shopify',   src: '/uploads/logos/shopify.svg'   },
              { name: 'n8n',       src: '/uploads/logos/n8n.svg'       },
              { name: 'OpenAI',    src: '/uploads/logos/openai.svg'    },
              { name: 'Google',    src: '/uploads/logos/google.svg'    },
            ].map(({ name, src }) => (
              <img
                key={name}
                src={src}
                alt={name}
                className="h-7 w-auto object-contain filter brightness-200"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-700 mt-4">Sube los logos desde <a href="/admin/dashboard" className="text-violet-600 hover:underline">conectaai.cl/admin</a></p>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonios" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-3">Testimonios</p>
            <h2 className="text-4xl font-bold">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, stars }) => (
              <div key={name} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-5">"{text}"</p>
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="text-xs text-slate-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-[#090910]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-3">Precios</p>
            <h2 className="text-4xl font-bold mb-3">Planes simples y escalables</h2>
            <p className="text-slate-400">Comienza gratis 14 días. Sin tarjeta.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: '$29', period: '/mes', features: ['1,000 contactos', '5,000 mensajes/mes', 'WhatsApp + Web Chat', 'IA básica', 'CRM incluido', 'Soporte email'], popular: false, cta: 'Empezar gratis' },
              { name: 'Pro',     price: '$79', period: '/mes', features: ['10,000 contactos', '50,000 mensajes/mes', 'Todos los canales', 'n8n incluido', 'IA avanzada GPT-4', 'Soporte prioritario', 'Analytics avanzado'], popular: true,  cta: 'Empezar gratis' },
              { name: 'Enterprise', price: '$199', period: '/mes', features: ['Ilimitado', 'Mensajes ilimitados', 'White-label total', 'Instancias dedicadas', 'SLA 99.9%', 'Manager dedicado', 'API access'], popular: false, cta: 'Contactar ventas' },
            ].map(({ name, price, period, features, popular, cta }) => (
              <div key={name} className={`relative rounded-2xl p-7 border ${popular ? 'bg-gradient-to-b from-violet-900/30 to-[#0d0d1a] border-violet-500/40 shadow-xl shadow-violet-500/10' : 'bg-[#0d0d1a] border-white/5'}`}>
                {popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg">
                    ⭐ Más Popular
                  </div>
                )}
                <h3 className="font-bold text-xl text-white mb-1">{name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-white">{price}</span>
                  <span className="text-slate-500 mb-1.5">{period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Check size={14} className="text-violet-400 shrink-0" />
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
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-600/10 rounded-3xl blur-3xl" />
            <div className="relative bg-gradient-to-b from-violet-900/20 to-[#0d0d1a] border border-violet-500/20 rounded-3xl px-8 py-14">
              <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-4">Empieza hoy</p>
              <h2 className="text-4xl font-extrabold mb-4">¿Listo para automatizar<br />tu negocio?</h2>
              <p className="text-slate-400 mb-8">14 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.</p>
              <Link href="/register">
                <button className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-2xl shadow-violet-500/30">
                  Crear cuenta gratis <ArrowRight size={16} />
                </button>
              </Link>
              <p className="text-xs text-slate-600 mt-4">+500 empresas ya automatizan con OmniFlow</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
                  <Wifi size={12} className="text-white" />
                </div>
                <span className="font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">OmniFlow</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">CRM Omnicanal con IA para empresas en Chile y Latam.</p>
              {/* Social links */}
              <div className="flex gap-3 mt-4">
                {[
                  { Icon: WhatsAppIcon,  color: '#25d366', href: '#' },
                  { Icon: InstagramIcon, color: '#e1306c', href: '#' },
                  { Icon: FacebookIcon,  color: '#1877f2', href: '#' },
                ].map(({ Icon, color, href }, i) => (
                  <a key={i} href={href} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" style={{ color }}>
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Producto</p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                {['Canales', 'Automatización', 'CRM', 'Analytics', 'Precios'].map(l => (
                  <li key={l}><a href="#" className="hover:text-slate-300 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Empresa</p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                {['Sobre nosotros', 'Blog', 'Casos de éxito', 'Contacto'].map(l => (
                  <li key={l}><a href="#" className="hover:text-slate-300 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Legal</p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li><Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacidad</Link></li>
                <li><Link href="/terms"   className="hover:text-slate-300 transition-colors">Términos</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-700">© 2025 OmniFlow. Todos los derechos reservados.</p>
            <p className="text-xs text-slate-700">Hecho con ❤️ en Chile 🇨🇱</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
