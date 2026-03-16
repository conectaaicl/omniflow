'use client'

import { useState, useEffect } from 'react'
import { tenantAPI } from '@/lib/api'
import {
  Phone, Instagram, Facebook, Globe, Tv2, Mail,
  CheckCircle2, AlertCircle, Save, RefreshCw, Eye, EyeOff, ExternalLink
} from 'lucide-react'

interface Settings {
  whatsapp_phone_number_id?: string
  whatsapp_access_token?: string
  whatsapp_verify_token?: string
  n8n_webhook_url?: string
  [key: string]: string | undefined
}

function FieldInput({
  label, value, onChange, placeholder, secret = false, mono = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; secret?: boolean; mono?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 ${secret ? 'pr-10' : 'pr-3'} py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all ${mono ? 'font-mono' : ''}`}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    tenantAPI.getSettings()
      .then((r) => setSettings(r.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await tenantAPI.updateSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const isWhatsAppConnected = !!(settings.whatsapp_phone_number_id && settings.whatsapp_access_token)

  const OTHER_CHANNELS = [
    { id: 'instagram', name: 'Instagram DMs', icon: Instagram, color: '#e1306c', desc: 'Conecta vía Meta Business API. Requiere cuenta Business verificada.' },
    { id: 'facebook', name: 'Facebook Messenger', icon: Facebook, color: '#1877f2', desc: 'Captura leads de Facebook Lead Ads y Messenger automáticamente.' },
    { id: 'tiktok', name: 'TikTok Lead Gen', icon: Tv2, color: '#ff0050', desc: 'Conecta formularios de Lead Generation de TikTok Ads.' },
    { id: 'web', name: 'Web Chat Widget', icon: Globe, color: '#7c3aed', desc: 'Widget embebible para tu sitio. Activo vía webhook integrado.' },
    { id: 'email', name: 'Email', icon: Mail, color: '#f59e0b', desc: 'Campañas y secuencias automáticas via SMTP o SendGrid.' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Canales e Integraciones</h1>
        <p className="text-slate-400 text-sm mt-0.5">Conecta tus canales para recibir mensajes en OmniFlow</p>
      </div>

      {/* WhatsApp - primary configurable channel */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#25d366]/10">
              <Phone size={20} style={{ color: '#25d366' }} />
            </div>
            <div>
              <h3 className="font-semibold text-white">WhatsApp Business API</h3>
              <p className="text-xs text-slate-500">Meta Cloud API · Mensajes en tiempo real</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isWhatsAppConnected ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}`}>
            {isWhatsAppConnected
              ? <><CheckCircle2 size={11} />Conectado</>
              : <><AlertCircle size={11} />Sin configurar</>
            }
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <FieldInput
              label="Phone Number ID"
              value={settings.whatsapp_phone_number_id || ''}
              onChange={(v) => setSettings({ ...settings, whatsapp_phone_number_id: v })}
              placeholder="123456789012345"
              mono
            />
            <FieldInput
              label="Access Token"
              value={settings.whatsapp_access_token || ''}
              onChange={(v) => setSettings({ ...settings, whatsapp_access_token: v })}
              placeholder="EAAxxxxx..."
              secret
              mono
            />
            <FieldInput
              label="Verify Token (para webhook)"
              value={settings.whatsapp_verify_token || ''}
              onChange={(v) => setSettings({ ...settings, whatsapp_verify_token: v })}
              placeholder="mi_token_secreto"
              mono
            />
            <div className="bg-white/3 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-slate-500 mb-1">URL del Webhook que debes configurar en Meta:</p>
              <code className="text-xs text-violet-300 font-mono break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/v1/webhooks/whatsapp` : '/api/v1/webhooks/whatsapp'}
              </code>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Documentación Meta <ExternalLink size={11} />
          </a>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-[#25d366]/10 hover:bg-[#25d366]/20 border border-[#25d366]/30 text-[#25d366] font-medium px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-40"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* n8n Webhook URL */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10">
            <Globe size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">n8n Webhook URL</h3>
            <p className="text-xs text-slate-500">URL base de tus flujos n8n para disparar automatizaciones</p>
          </div>
        </div>
        <FieldInput
          label="n8n Webhook base URL"
          value={settings.n8n_webhook_url || ''}
          onChange={(v) => setSettings({ ...settings, n8n_webhook_url: v })}
          placeholder="http://localhost:5678/webhook/"
          mono
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-40"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {saved ? '¡Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Other channels */}
      <div>
        <h3 className="font-semibold text-white mb-3 text-sm">Otros canales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OTHER_CHANNELS.map(({ id, name, icon: Icon, color, desc }) => (
            <div key={id} className="bg-[#0d0d1a] border border-white/5 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}15` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-600 shrink-0">Próximamente</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
