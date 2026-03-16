'use client'

import { useState, useEffect } from 'react'
import { billingAPI } from '@/lib/api'
import { Check, ShieldCheck, ArrowRight, RefreshCw, CreditCard } from 'lucide-react'

const PLANS = [
  {
    id: 1,
    name: 'Starter',
    price: 29,
    desc: 'Para pequeñas empresas iniciando su automatización.',
    features: ['1,000 contactos', '5,000 mensajes/mes', 'IA básica', 'WhatsApp + Web', 'Soporte email'],
    color: '#2563eb',
  },
  {
    id: 2,
    name: 'Pro',
    price: 99,
    desc: 'Escala tus ventas con IA avanzada y mayores límites.',
    features: ['10,000 contactos', '50,000 mensajes/mes', 'Todos los canales', 'n8n incluido', 'IA avanzada', 'Soporte prioritario'],
    color: '#7c3aed',
    popular: true,
  },
  {
    id: 3,
    name: 'Enterprise',
    price: 299,
    desc: 'Orquestación total para operaciones a gran escala.',
    features: ['Ilimitado', 'Mensajes ilimitados', 'White-label total', 'Instancias dedicadas', 'SLA 99.9%', 'Manager dedicado'],
    color: '#059669',
  },
]

export default function BillingPage() {
  const [currentSub, setCurrentSub] = useState<{ plan?: string; current_period_end?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)

  useEffect(() => {
    billingAPI.getCurrent()
      .then((r) => setCurrentSub(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async (planId: number) => {
    setProcessing(planId)
    try {
      await billingAPI.subscribe(planId)
      const r = await billingAPI.getCurrent()
      setCurrentSub(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Planes y Suscripción</h1>
        <p className="text-slate-400 text-sm mt-0.5">Elige el plan que mejor se ajuste a tu operación</p>
      </div>

      {/* Current plan status */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-500/10">
            <ShieldCheck size={22} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Plan actual</p>
            {loading ? (
              <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{currentSub?.plan || 'Sin plan activo'}</span>
                {currentSub?.plan && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                    Activo
                  </span>
                )}
              </div>
            )}
            {currentSub?.current_period_end && (
              <p className="text-xs text-slate-600 mt-0.5">
                Renueva el {new Date(currentSub.current_period_end).toLocaleDateString('es')}
              </p>
            )}
          </div>
        </div>
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white px-4 py-2 rounded-lg transition-all text-sm">
          <CreditCard size={13} />
          Método de pago
        </button>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentSub?.plan === plan.name
          const isProcessing = processing === plan.id
          return (
            <div
              key={plan.id}
              className={`relative bg-[#0d0d1a] border rounded-2xl p-5 flex flex-col transition-all ${plan.popular ? 'border-violet-500/40 shadow-xl shadow-violet-500/10 scale-[1.02]' : 'border-white/5'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-bold px-4 py-1 rounded-full">
                  Más Popular
                </div>
              )}

              <div className="mb-4">
                <div
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3"
                  style={{ background: `${plan.color}20`, color: plan.color }}
                >
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-slate-500 text-sm">/mes</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{plan.desc}</p>
              </div>

              <ul className="flex-1 space-y-2.5 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check size={12} className="shrink-0" style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !isCurrent && handleSubscribe(plan.id)}
                disabled={isCurrent || isProcessing || processing !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:cursor-not-allowed"
                style={isCurrent
                  ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }
                  : { background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}40` }
                }
              >
                {isProcessing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : isCurrent ? (
                  'Plan actual'
                ) : (
                  <>Comenzar con {plan.name} <ArrowRight size={13} /></>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
