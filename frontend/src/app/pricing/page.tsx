'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceUSD: 29,
    channels: 2,
    contacts: 500,
    users: 2,
    features: [
      '2 canales (WhatsApp + 1)',
      '500 contactos',
      '2 usuarios',
      'CRM básico',
      'Bandeja omnicanal',
      'Soporte por email',
    ],
    color: 'from-slate-600 to-slate-700',
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    priceUSD: 79,
    channels: 5,
    contacts: 5000,
    users: 10,
    features: [
      'Todos los canales',
      '5,000 contactos',
      '10 usuarios',
      'CRM + Pipeline',
      'Automatizaciones n8n',
      'Widget web chat',
      'IA con Groq',
      'Soporte prioritario',
    ],
    color: 'from-violet-600 to-purple-700',
    badge: 'Más Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceUSD: 199,
    channels: -1,
    contacts: -1,
    users: -1,
    features: [
      'Canales ilimitados',
      'Contactos ilimitados',
      'Usuarios ilimitados',
      'Subdomain personalizado',
      'SLA garantizado',
      'Integración Shopify',
      'Onboarding dedicado',
      'Soporte 24/7',
    ],
    color: 'from-amber-500 to-orange-600',
    badge: 'Full Power',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const getPrice = (base: number) =>
    billing === 'annual' ? Math.round(base * 0.8) : base

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-lg">OmniFlow</span>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Ya tengo cuenta →
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Plataforma omnicanal profesional
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Elige tu plan y empieza hoy
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Conecta todos tus canales, automatiza tu negocio y crece sin límites.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billing === 'annual'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Anual
              <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${
                plan.badge === 'Más Popular'
                  ? 'border-violet-500/50 bg-violet-500/5'
                  : 'border-white/8 bg-white/3'
              } p-6 flex flex-col`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${plan.color} text-white`}>
                  {plan.badge}
                </div>
              )}

              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                <span className="text-white font-bold text-sm">{plan.name[0]}</span>
              </div>

              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>

              <div className="mb-4">
                <span className="text-4xl font-bold">${getPrice(plan.price)}</span>
                <span className="text-slate-400 text-sm ml-1">USD/{billing === 'annual' ? 'mes · facturado anual' : 'mes'}</span>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-400 flex-shrink-0">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push(`/register?plan=${plan.id}&billing=${billing}`)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.badge === 'Más Popular'
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                    : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                }`}
              >
                Comenzar con {plan.name}
              </button>
            </div>
          ))}
        </div>

        {/* Trust */}
        <div className="border-t border-white/5 pt-12 text-center">
          <p className="text-slate-500 text-sm mb-6">Pago seguro · Cancela cuando quieras · Sin contratos</p>
          <div className="flex flex-wrap justify-center gap-8 text-slate-600 text-xs">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/></svg>
              Datos seguros y cifrados
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2"/></svg>
              Mercado Pago y transferencia
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Activación inmediata
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
