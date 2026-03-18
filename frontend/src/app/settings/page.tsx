'use client'

import { useState, useEffect } from 'react'
import { tenantAPI } from '@/lib/api'
import {
  Save, Palette, Globe, Mail, Phone, RefreshCw, CheckCircle2, Bot, Key, Cpu
} from 'lucide-react'

function Field({
  label, value, onChange, placeholder, type = 'text', mono = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all ${mono ? 'font-mono text-xs' : ''}`}
      />
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Branding
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportPhone, setSupportPhone] = useState('')

  // AI Sales Agent
  const [botName, setBotName] = useState('')
  const [greeting, setGreeting] = useState('')
  const [aiKey, setAiKey] = useState('')
  const [aiModel, setAiModel] = useState('llama-3.1-8b-instant')
  const [systemPrompt, setSystemPrompt] = useState('')

  useEffect(() => {
    tenantAPI.getSettings()
      .then((r) => {
        const s = r.data
        setLogoUrl(s.logo_url || '')
        setPrimaryColor(s.primary_color || '#7c3aed')
        setSupportEmail(s.support_email || '')
        setSupportPhone(s.support_phone || '')
        setBotName(s.webchat_bot_name || '')
        setGreeting(s.webchat_greeting || '')
        setAiModel(s.ai_model || 'llama-3.1-8b-instant')
        setSystemPrompt(s.webchat_system_prompt || '')
        // Never pre-fill the API key field for security
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        logo_url: logoUrl,
        primary_color: primaryColor,
        support_email: supportEmail,
        support_phone: supportPhone,
        webchat_bot_name: botName,
        webchat_greeting: greeting,
        ai_model: aiModel,
        webchat_system_prompt: systemPrompt,
      }
      // Only send key if user typed a new one
      if (aiKey.trim()) payload.openai_api_key = aiKey.trim()
      await tenantAPI.updateSettings(payload)
      setSaved(true)
      setAiKey('') // clear for security
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-40 bg-[#0d0d1a] border border-white/5 rounded-2xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Personaliza tu plataforma OmniFlow</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Branding */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <Palette size={16} className="text-violet-400" />
          <h3 className="font-semibold text-white">Identidad Visual</h3>
        </div>
        <div className="space-y-4">
          <Field label="URL del Logo" value={logoUrl} onChange={setLogoUrl} placeholder="https://tuempresa.com/logo.png" />
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Color Principal</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <code className="flex-1 text-sm font-mono bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-violet-300">
                {primaryColor}
              </code>
            </div>
          </div>
          {(logoUrl || primaryColor) && (
            <div className="mt-2 p-4 rounded-xl bg-white/3 border border-white/5 flex items-center gap-4">
              <Globe size={14} className="text-slate-500 shrink-0" />
              <span className="text-xs text-slate-500">Preview:</span>
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
                : <span className="text-sm font-bold" style={{ color: primaryColor }}>OmniFlow</span>}
              <button
                className="ml-auto text-xs font-medium px-3 py-1 rounded-lg text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Botón
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <Mail size={16} className="text-blue-400" />
          <h3 className="font-semibold text-white">Contacto y Soporte</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Field label="Email de Soporte" value={supportEmail} onChange={setSupportEmail} placeholder="soporte@tuempresa.com" type="email" />
          </div>
          <div className="relative">
            <Field label="WhatsApp de Soporte" value={supportPhone} onChange={setSupportPhone} placeholder="+56912345678" />
          </div>
        </div>
      </div>

      {/* AI Sales Agent */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <Bot size={16} className="text-green-400" />
          <h3 className="font-semibold text-white">AI Sales Agent</h3>
          <span className="ml-auto text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">Groq</span>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del Agente" value={botName} onChange={setBotName} placeholder="Asistente" />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Modelo IA</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-all"
              >
                <option value="llama-3.1-8b-instant">Llama 3.1 8B (rápido)</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (potente)</option>
                <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                <option value="gemma2-9b-it">Gemma 2 9B</option>
              </select>
            </div>
          </div>

          <Field
            label="Mensaje de Bienvenida"
            value={greeting}
            onChange={setGreeting}
            placeholder="¡Hola! ¿En qué puedo ayudarte hoy? 😊"
          />

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              System Prompt — Entrenamiento del Agente
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={`Eres el asistente virtual de [Tu Empresa]. Respondes de forma amable y profesional.\n\nPRODUCTOS: ...\nPRECIOS: ...\nINSTRUCCIONES: Responde máximo en 3-4 oraciones. En el primer mensaje pide nombre y contacto.`}
              rows={8}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all font-mono resize-y"
            />
            <p className="text-xs text-slate-600 mt-1">
              Define el comportamiento, productos, precios y personalidad del agente. Cuánto más detallado, mejor.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Key size={11} /> Groq API Key
            </label>
            <input
              type="password"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="gsk_... (déjalo vacío para mantener la clave actual)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all font-mono text-xs"
            />
            <p className="text-xs text-slate-600 mt-1">
              Obtén tu clave gratis en{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
                console.groq.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        {saved && (
          <div className="flex items-center gap-1.5 text-green-400 text-sm">
            <CheckCircle2 size={14} />
            Configuración guardada
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
