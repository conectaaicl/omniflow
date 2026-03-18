'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function PaymentSuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const subdomain = params.get('subdomain') || ''
  const email = params.get('email') || ''

  useEffect(() => {
    // Auto-redirect to login after 5s
    const t = setTimeout(() => router.push('/login'), 5000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen bg-[#080812] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-green-400">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-3">¡Pago confirmado!</h1>
        <p className="text-slate-400 mb-6">Tu cuenta está activa. Bienvenido a OmniFlow.</p>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-8 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Cuenta</span>
            <span className="font-medium">{subdomain}.omniflow.app</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Estado</span>
            <span className="text-green-400 font-medium">Activo</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-semibold text-sm transition-all"
        >
          Entrar a mi dashboard →
        </button>
        <p className="text-xs text-slate-600 mt-3">Redirigiendo automáticamente en 5 segundos...</p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  )
}
