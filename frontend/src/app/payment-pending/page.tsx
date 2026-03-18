'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PaymentPendingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const subdomain = params.get('subdomain') || ''
  const email = params.get('email') || ''
  const method = params.get('method') || 'transfer'

  return (
    <div className="min-h-screen bg-[#080812] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-amber-400">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-3">
          {method === 'transfer' ? 'Transferencia registrada' : 'Pago en proceso'}
        </h1>

        <p className="text-slate-400 mb-6">
          {method === 'transfer'
            ? 'Recibimos tu aviso. Una vez confirmada la transferencia activaremos tu cuenta en 1-2 horas hábiles.'
            : 'Tu pago está siendo procesado. Te notificaremos cuando esté confirmado.'}
        </p>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-8 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Cuenta</span>
            <span className="font-medium">{subdomain}.omniflow.app</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Email de acceso</span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Estado</span>
            <span className="text-amber-400 font-medium">Pendiente de confirmación</span>
          </div>
        </div>

        {method === 'transfer' && (
          <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4 mb-6 text-sm text-slate-300">
            Recuerda enviar el comprobante a <strong className="text-white">pagos@omniflow.app</strong> con el asunto <strong className="text-white">&quot;OmniFlow {subdomain}&quot;</strong>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-semibold text-sm transition-all"
          >
            Ir al login (activo tras confirmación)
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/8 font-semibold text-sm transition-all text-slate-400"
          >
            Volver a planes
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPendingPage() {
  return (
    <Suspense>
      <PaymentPendingContent />
    </Suspense>
  )
}
