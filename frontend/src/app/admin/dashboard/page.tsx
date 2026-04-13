'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wifi, LogOut, Upload, Save, Image, Type,
  DollarSign, Star, RefreshCw, Check, AlertCircle
} from 'lucide-react'

const API = '/api/v1'

function useAdmin() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (!t) { router.push('/admin'); return }
    setToken(t)
  }, [router])

  const headers = { Authorization: `Bearer ${token}` }
  return { token, headers }
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d1a] border border-white/8 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
        <Icon size={16} className="text-violet-400" />
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
      {ok ? <Check size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const { token, headers } = useAdmin()
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  // Landing content state
  const [content, setContent] = useState({
    hero_headline: 'Tu negocio responde solo, las 24 horas',
    hero_subheadline: 'Conecta WhatsApp, Instagram, Facebook y más en un CRM con IA. El bot responde, califica leads y agenda — tú solo cierras ventas.',
    hero_cta: 'Empezar gratis 14 días',
    stat_empresas: '500+',
    stat_mensajes: '2M+',
    stat_ventas: '3.2x',
    stat_tiempo: '<2min',
    pricing_starter: '29',
    pricing_pro: '79',
    pricing_enterprise: '199',
  })

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Load existing content from API ──────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch(`${API}/internal/landing-content`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setContent(prev => ({ ...prev, ...data })) })
      .catch(() => {})
  }, [token])

  // ── Save content ─────────────────────────────────────────────────────
  const saveContent = async () => {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/internal/landing-content`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      })
      if (res.ok) showToast('Contenido guardado correctamente')
      else showToast('Error al guardar', false)
    } catch {
      showToast('Error de conexión', false)
    } finally {
      setSaving(false)
    }
  }

  // ── Upload image ─────────────────────────────────────────────────────
  const uploadImage = async (file: File, dest: string) => {
    if (!token) return
    const form = new FormData()
    form.append('file', file)
    form.append('dest', dest)
    try {
      const res = await fetch(`${API}/internal/upload-asset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (res.ok) showToast(`✅ ${dest} subido correctamente`)
      else showToast('Error al subir imagen', false)
    } catch {
      showToast('Error de conexión', false)
    }
  }

  const FileInput = ({ label, dest, accept = 'image/*' }: { label: string; dest: string; accept?: string }) => {
    const ref = useRef<HTMLInputElement>(null)
    return (
      <div>
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        <div
          onClick={() => ref.current?.click()}
          className="border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
        >
          <Upload size={18} className="text-slate-500" />
          <p className="text-xs text-slate-500">Clic para subir · {dest}</p>
        </div>
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, dest) }}
        />
      </div>
    )
  }

  const Field = ({ label, k, multiline = false }: { label: string; k: keyof typeof content; multiline?: boolean }) => (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={content[k]}
          onChange={e => setContent(prev => ({ ...prev, [k]: e.target.value }))}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
        />
      ) : (
        <input
          type="text"
          value={content[k]}
          onChange={e => setContent(prev => ({ ...prev, [k]: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      )}
    </div>
  )

  if (!token) return null

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-[#080812]/90 backdrop-blur-xl border-b border-white/5 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
            <Wifi size={13} className="text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">OmniFlow</span>
          <span className="text-slate-600 text-sm">/</span>
          <span className="text-slate-400 text-sm">Admin Landing</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://conectaai.cl" target="_blank" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
            <RefreshCw size={11} /> Ver landing
          </a>
          <button
            onClick={saveContent}
            disabled={saving}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Save size={12} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            onClick={() => { localStorage.removeItem('admin_token'); router.push('/admin') }}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Images */}
        <Section title="Imágenes" icon={Image}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileInput label="Imagen Hero (hero-automation.png)" dest="hero-automation.png" />
            <FileInput label="Logo WhatsApp (logos/whatsapp.svg)" dest="logos/whatsapp.svg" accept=".svg,.png" />
            <FileInput label="Logo Instagram (logos/instagram.svg)" dest="logos/instagram.svg" accept=".svg,.png" />
            <FileInput label="Logo Facebook (logos/facebook.svg)" dest="logos/facebook.svg" accept=".svg,.png" />
            <FileInput label="Logo TikTok (logos/tiktok.svg)" dest="logos/tiktok.svg" accept=".svg,.png" />
            <FileInput label="Logo n8n (logos/n8n.svg)" dest="logos/n8n.svg" accept=".svg,.png" />
            <FileInput label="Logo OpenAI (logos/openai.svg)" dest="logos/openai.svg" accept=".svg,.png" />
            <FileInput label="Logo Shopify (logos/shopify.svg)" dest="logos/shopify.svg" accept=".svg,.png" />
          </div>
        </Section>

        {/* Hero text */}
        <Section title="Texto del Hero" icon={Type}>
          <div className="space-y-4">
            <Field label="Título principal" k="hero_headline" />
            <Field label="Subtítulo" k="hero_subheadline" multiline />
            <Field label="Texto del botón CTA" k="hero_cta" />
          </div>
        </Section>

        {/* Stats */}
        <Section title="Estadísticas (barra de stats)" icon={Star}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Empresas activas" k="stat_empresas" />
            <Field label="Mensajes/mes" k="stat_mensajes" />
            <Field label="Más ventas" k="stat_ventas" />
            <Field label="Tiempo de respuesta" k="stat_tiempo" />
          </div>
        </Section>

        {/* Pricing */}
        <Section title="Precios (USD/mes)" icon={DollarSign}>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Starter" k="pricing_starter" />
            <Field label="Pro" k="pricing_pro" />
            <Field label="Enterprise" k="pricing_enterprise" />
          </div>
        </Section>

      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}
