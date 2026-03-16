'use client'

import { useState } from 'react'
import { tenantAPI } from '@/lib/api'
import { Save, Palette, Globe, Mail, Phone, RefreshCw, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportPhone, setSupportPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await tenantAPI.updateSettings({
        logo_url: logoUrl,
        primary_color: primaryColor,
        support_email: supportEmail,
        support_phone: supportPhone,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Personaliza tu instancia de OmniFlow</p>
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
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">URL del Logo</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://tuempresa.com/logo.png"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>
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

          {/* Preview */}
          {(logoUrl || primaryColor) && (
            <div className="mt-2 p-4 rounded-xl bg-white/3 border border-white/5 flex items-center gap-4">
              <Globe size={14} className="text-slate-500 shrink-0" />
              <span className="text-xs text-slate-500">Vista previa:</span>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
              ) : (
                <span className="text-sm font-bold" style={{ color: primaryColor }}>OmniFlow</span>
              )}
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

      {/* Support contact */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <Mail size={16} className="text-blue-400" />
          <h3 className="font-semibold text-white">Contacto y Soporte</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email de Soporte</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="soporte@tuempresa.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">WhatsApp de Soporte</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="+56912345678"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all"
              />
            </div>
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
