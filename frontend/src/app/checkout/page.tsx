'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

const PLANS: Record<string, { name: string; monthly: number; annual: number }> = {
  starter: { name: 'Starter', monthly: 29, annual: 23 },
  pro:     { name: 'Pro',     monthly: 79, annual: 63 },
  enterprise: { name: 'Enterprise', monthly: 199, annual: 159 },
}

// Bank transfer info — replace with your real bank account
const BANK_INFO = {
  bank: 'Banco de Chile',
  type: 'Cuenta Corriente',
  number: '000-1-234567-8',
  rut: '76.XXX.XXX-X',
  name: 'OmniFlow SpA',
  email: 'pagos@omniflow.app',
}

function CheckoutForm() {
  const router = useRouter()
  const params = useSearchParams()
  const plan = params.get('plan') || 'pro'
  const billing = params.get('billing') || 'monthly'
  const email = params.get('email') || ''
  const subdomain = params.get('subdomain') || ''

  const planData = PLANS[plan] || PLANS.pro
  const price = billing === 'annual' ? planData.annual : planData.monthly
  const period = billing === 'annual' ? 'mes · facturado anual' : 'mes'

  const [method, setMethod] = useState<'mercadopago' | 'transfer'>('mercadopago')
  const [mpLoading, setMpLoading] = useState(false)

  const handleMercadoPago = async () => {
    setMpLoading(true)
    try {
      const res = await fetch('/api/v1/billing/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing, email, subdomain }),
      })
      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      }
    } catch {
      alert('Error al iniciar pago. Intenta de nuevo.')
    } finally {
      setMpLoading(false)
    }
  }

  const handleTransferConfirm = () => {
    router.push(`/payment-pending?plan=${plan}&billing=${billing}&email=${encodeURIComponent(email)}&subdomain=${subdomain}&method=transfer`)
  }

  return (
    <div className="min-h-screen bg-[#080812] text-white flex flex-col">
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-lg">OmniFlow</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/></svg>
          Pago seguro
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold mb-1">Finalizar compra</h1>
          <p className="text-slate-400 text-sm mb-8">Paso 2 de 2 — Elige tu método de pago</p>

          {/* Order summary */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-6">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Resumen del pedido</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Plan {planData.name} · {billing === 'annual' ? 'Anual' : 'Mensual'}</span>
              <span className="font-semibold">${price} USD/{period}</span>
            </div>
            {billing === 'annual' && (
              <div className="flex items-center justify-between text-xs text-green-400">
                <span>Ahorro 20% facturado anual</span>
                <span>-${planData.monthly - price} USD/mes</span>
              </div>
            )}
            <div className="border-t border-white/5 mt-3 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Cuenta: {subdomain}</span>
              <span className="text-xs text-slate-500">{email}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setMethod('mercadopago')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                method === 'mercadopago'
                  ? 'border-violet-500/60 bg-violet-500/8'
                  : 'border-white/8 bg-white/3 hover:border-white/15'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                method === 'mercadopago' ? 'border-violet-500' : 'border-slate-600'
              }`}>
                {method === 'mercadopago' && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Mercado Pago</div>
                <div className="text-xs text-slate-400">Tarjeta crédito/débito, efectivo, cuotas</div>
              </div>
              <div className="bg-[#009EE3] text-white text-xs font-bold px-2 py-1 rounded">MP</div>
            </button>

            <button
              onClick={() => setMethod('transfer')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                method === 'transfer'
                  ? 'border-violet-500/60 bg-violet-500/8'
                  : 'border-white/8 bg-white/3 hover:border-white/15'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                method === 'transfer' ? 'border-violet-500' : 'border-slate-600'
              }`}>
                {method === 'transfer' && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Transferencia bancaria</div>
                <div className="text-xs text-slate-400">Pago manual · Activación en 1-2 horas</div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-400">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>

          {/* Transfer details */}
          {method === 'transfer' && (
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-5 mb-6">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-3">Datos para transferencia</p>
              <div className="space-y-2 text-sm">
                {[
                  ['Banco', BANK_INFO.bank],
                  ['Tipo', BANK_INFO.type],
                  ['N° Cuenta', BANK_INFO.number],
                  ['RUT', BANK_INFO.rut],
                  ['Titular', BANK_INFO.name],
                  ['Email', BANK_INFO.email],
                  ['Monto', `$${price} USD (cotizar en pesos del día)`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Envía el comprobante a <strong className="text-slate-400">{BANK_INFO.email}</strong> con el asunto <strong className="text-slate-400">&quot;OmniFlow {subdomain}&quot;</strong>
              </p>
            </div>
          )}

          {/* CTA */}
          {method === 'mercadopago' ? (
            <button
              onClick={handleMercadoPago}
              disabled={mpLoading}
              className="w-full py-4 rounded-2xl bg-[#009EE3] hover:bg-[#0080C4] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mpLoading ? 'Redirigiendo a Mercado Pago...' : `Pagar $${price} USD con Mercado Pago`}
            </button>
          ) : (
            <button
              onClick={handleTransferConfirm}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-bold text-sm transition-all"
            >
              Ya realicé la transferencia →
            </button>
          )}

          <p className="text-center text-xs text-slate-600 mt-4">
            Cancelación sin cargo en los primeros 7 días · Soporte: {BANK_INFO.email}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  )
}
