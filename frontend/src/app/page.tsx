'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wifi, MessageSquare, Instagram, Facebook, Globe,
  Zap, ArrowRight, Check, Phone, ShoppingBag,
  Mail, Bot, BarChart3, Shield, ChevronRight, Tv2, Target
} from 'lucide-react'

const CHANNELS = [
  { icon: Phone,       name: 'WhatsApp Business', desc: 'Mensajes, respuestas automáticas, notificaciones en tiempo real.', color: '#25d366', bg: '#25d36615' },
  { icon: Instagram,   name: 'Instagram DMs',     desc: 'Responde comentarios y mensajes directos automáticamente.',       color: '#e1306c', bg: '#e1306c15' },
  { icon: Facebook,    name: 'Facebook Leads',    desc: 'Captura leads de formularios y Messenger al instante.',           color: '#1877f2', bg: '#1877f215' },
  { icon: Tv2,         name: 'TikTok Leads',      desc: 'Conecta con formularios de Lead Generation de TikTok.',          color: '#ff0050', bg: '#ff005015' },
  { icon: ShoppingBag, name: 'Shopify',           desc: 'Notifica ventas, abandono de carrito y estado de pedidos.',       color: '#96bf48', bg: '#96bf4815' },
  { icon: Mail,        name: 'Email',             desc: 'Campañas, secuencias y respuestas automáticas por correo.',       color: '#f59e0b', bg: '#f59e0b15' },
  { icon: Globe,       name: 'Web Chat',          desc: 'Widget embebible en tu sitio web con IA conversacional.',        color: '#7c3aed', bg: '#7c3aed15' },
]

const PLANS = [
  { name: 'Starter',    price: '$29',  features: ['1,000 contactos', '5,000 mensajes/mes', 'WhatsApp + Web', 'IA básica', 'Soporte email'],                                       popular: false },
  { name: 'Pro',        price: '$99',  features: ['10,000 contactos', '50,000 mensajes/mes', 'Todos los canales', 'n8n incluido', 'IA avanzada', 'Soporte prioritario'],          popular: true  },
  { name: 'Enterprise', price: '$299', features: ['Ilimitado', 'Mensajes ilimitados', 'White-label total', 'Instancias dedicadas', 'SLA 99.9%', 'Manager dedicado'],              popular: false },
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
            <a href="#canales"  className="hover:text-white transition-colors">Canales</a>
            <a href="#n8n"      className="hover:text-white transition-colors">Automatización</a>
            <a href="#pricing"  className="hover:text-white transition-colors">Precios</a>
          </div>
          <Link href="/login">
            <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Acceder <ChevronRight size={14} />
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-6">
            <Zap size={12} /> Impulsado por n8n + IA
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Automatiza todas tus{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ventas omnicanal
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Conecta WhatsApp, Instagram, Facebook, TikTok, Shopify y Email en un solo panel.
            Automatiza respuestas, califica leads con IA y cierra más ventas con n8n.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login">
              <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-2xl shadow-violet-500/30">
                Comenzar ahora <ArrowRight size={16} />
              </button>
            </Link>
            <a href="#n8n">
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-6 py-3 rounded-xl transition-all">
                Ver cómo funciona
              </button>
            </a>
          </div>
          <div className="flex items-center justify-center gap-5 mt-12 flex-wrap">
            {CHANNELS.map(({ icon: Icon, name, color }) => (
              <div key={name} title={name} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <Icon size={20} style={{ color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Channels */}
      <section id="canales" className="py-20 px-6 bg-[#0a0a16]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Todos tus canales, un solo lugar</h2>
            <p className="text-slate-400">Gestiona cada conversación sin cambiar de pestaña.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CHANNELS.map(({ icon: Icon, name, desc, color, bg }) => (
              <div key={name} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                <div className="p-2.5 rounded-xl w-fit mb-4" style={{ background: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* n8n */}
      <section id="n8n" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs text-amber-300 mb-6">
                <Zap size={12} /> Motor de Automatización
              </div>
              <h2 className="text-3xl font-bold mb-5">
                Potenciado por <span className="text-amber-400">n8n</span> —<br />
                automatización sin límites
              </h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                n8n es el corazón de OmniFlow. Cada mensaje entrante puede disparar un flujo
                de trabajo personalizado: calificar al lead con IA, notificar a tu equipo,
                actualizar tu CRM y enviar respuestas automáticas.
              </p>
              <div className="space-y-3">
                {[
                  'WhatsApp → IA analiza intención → CRM actualizado automáticamente',
                  'Lead de Facebook → n8n lo enruta al agente correcto en segundos',
                  'Abandono de carrito Shopify → secuencia de WhatsApp activada',
                  'Formulario web → email de bienvenida + lead en pipeline',
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="p-0.5 rounded-full bg-amber-500/20 mt-1 shrink-0">
                      <Check size={10} className="text-amber-400" />
                    </div>
                    <span className="text-sm text-slate-300">{text}</span>
                  </div>
                ))}
              </div>
              <Link href="/login">
                <button className="mt-8 flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium px-5 py-2.5 rounded-xl transition-all text-sm">
                  Abrir editor n8n <ArrowRight size={14} />
                </button>
              </Link>
            </div>
            <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-6 font-mono text-xs">
              <div className="text-slate-500 mb-4">// Flujo: WhatsApp → IA → CRM</div>
              {[
                { step: '1', label: 'Webhook WhatsApp', color: '#25d366', icon: Phone },
                { step: '2', label: 'Análisis de IA',   color: '#7c3aed', icon: Bot },
                { step: '3', label: 'Score del lead',   color: '#f59e0b', icon: BarChart3 },
                { step: '4', label: 'Actualizar CRM',   color: '#e1306c', icon: Target },
                { step: '5', label: 'Respuesta auto',   color: '#25d366', icon: MessageSquare },
              ].map(({ step, label, color, icon: Icon }, i) => (
                <div key={step}>
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: `${color}25`, color }}>
                      {step}
                    </div>
                    <Icon size={13} style={{ color }} />
                    <span style={{ color }} className="font-medium">{label}</span>
                  </div>
                  {i < 4 && <div className="ml-3 border-l border-dashed border-white/10 h-3" />}
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-white/5 text-slate-600 text-xs">Tiempo total: ~200ms ⚡</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-[#0a0a16]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Bot,       color: '#7c3aed', title: 'IA Integrada',             desc: 'Calificación automática de leads, detección de intención y respuestas sugeridas.' },
              { icon: Shield,    color: '#25d366', title: 'Multi-Tenant Seguro',      desc: 'Cada empresa tiene su propia base de datos aislada. Datos 100% separados.' },
              { icon: BarChart3, color: '#f59e0b', title: 'Analytics Tiempo Real',    desc: 'Métricas de conversión, fuentes de leads y rendimiento por canal en vivo.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-6">
                <div className="p-3 rounded-xl w-fit mb-4" style={{ background: `${color}15` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Planes simples y escalables</h2>
            <p className="text-slate-400">Comienza gratis y escala cuando lo necesites.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, features, popular }) => (
              <div key={name} className={`relative bg-[#0d0d1a] border rounded-2xl p-6 ${popular ? 'border-violet-500/50 shadow-xl shadow-violet-500/10' : 'border-white/5'}`}>
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Más Popular
                  </div>
                )}
                <h3 className="font-bold text-lg text-white mb-2">{name}</h3>
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-3xl font-bold text-white">{price}</span>
                  <span className="text-slate-500 text-sm mb-1">/mes</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Check size={13} className="text-violet-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <button className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${popular ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
                    Comenzar con {name}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
              <Wifi size={11} className="text-white" />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">OmniFlow</span>
          </div>
          <p className="text-xs text-slate-600">© 2024 OmniFlow. Todos los derechos reservados.</p>
          <div className="flex gap-4 text-xs text-slate-600">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
