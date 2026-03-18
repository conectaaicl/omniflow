'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { tenantAPI } from '@/lib/api'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter — $29 USD/mes',
  pro: 'Pro — $79 USD/mes',
  enterprise: 'Enterprise — $199 USD/mes',
}

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const plan = params.get('plan') || 'pro'
  const billing = params.get('billing') || 'monthly'

  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    admin_email: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => {
    setError('')
    if (k === 'name' && !form.subdomain) {
      setForm(f => ({
        ...f,
        name: v,
        subdomain: v.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20),
      }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!/^[a-z0-9]{3,20}$/.test(form.subdomain)) {
      setError('El subdominio solo puede tener letras minúsculas y números (3-20 caracteres)')
      return
    }

    setLoading(true)
    try {
      await tenantAPI.register({
        name: form.name,
        subdomain: form.subdomain,
        admin_email: form.admin_email,
        password: form.password,
      })
      // Redirect to checkout with pre-registration info
      router.push(`/checkout?plan=${plan}&billing=${billing}&email=${encodeURIComponent(form.admin_email)}&subdomain=${form.subdomain}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr?.response?.data?.detail || 'Error al crear la cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080812] text-white flex flex-col">
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
        <button onClick={() => router.push('/pricing')} className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Cambiar plan
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Plan badge */}
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2 mb-6 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-violet-400">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="text-slate-300">Plan seleccionado: <strong className="text-white">{PLAN_LABELS[plan]}</strong></span>
          </div>

          <h1 className="text-2xl font-bold mb-2">Crear tu cuenta</h1>
          <p className="text-slate-400 text-sm mb-8">Paso 1 de 2 — Datos de tu empresa</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de tu empresa</label>
              <input
                type="text"
                required
                placeholder="Ej: Ferretería García"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Subdominio</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-violet-500 transition-colors">
                <input
                  type="text"
                  required
                  placeholder="miempresa"
                  value={form.subdomain}
                  onChange={e => set('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none"
                />
                <span className="px-4 text-slate-500 text-sm border-l border-white/10 py-3 bg-white/3">.omniflow.app</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Tu panel estará en: {form.subdomain || 'miempresa'}.omniflow.app</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email del administrador</label>
              <input
                type="email"
                required
                placeholder="admin@tuempresa.cl"
                value={form.admin_email}
                onChange={e => set('admin_email', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                required
                placeholder="Repite la contraseña"
                value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Continuar al pago →'}
            </button>

            <p className="text-center text-xs text-slate-600">
              Al continuar aceptas nuestros{' '}
              <span className="text-slate-400 cursor-pointer hover:text-white">Términos de servicio</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
