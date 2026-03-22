'use client'

import { useState, useEffect } from 'react'
import { tenantAPI, authAPI } from '@/lib/api'
import { Save, Palette, Globe, Mail, RefreshCw, CheckCircle2, Bot, Key, Lock, ShieldCheck, MessageCircle, Send } from 'lucide-react'

function Field({ label, value, onChange, placeholder, type = 'text', mono = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all ${mono ? 'font-mono text-xs' : ''}`} />
    </div>
  )
}

const AI_PROVIDERS = [
  {
    key: 'anthropic', name: 'Anthropic', icon: '🟠',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', cost: '~$0.003/conv', tags: ['smart', 'vision'], badge: 'Recomendado' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', cost: '~$0.0003/conv', tags: ['fast', 'cheap'], badge: 'Económico' },
      { id: 'claude-opus-4', name: 'Claude Opus 4', cost: '~$0.015/conv', tags: ['smart'], badge: 'Potente' },
    ]
  },
  {
    key: 'openai', name: 'OpenAI', icon: '🟢',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', cost: '~$0.005/conv', tags: ['smart', 'vision'], badge: '' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', cost: '~$0.0004/conv', tags: ['fast', 'cheap'], badge: 'Económico' },
    ]
  },
  {
    key: 'google', name: 'Google', icon: '🔵',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', cost: '~$0.0001/conv', tags: ['fast', 'cheap'], badge: 'Más barato' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: '~$0.004/conv', tags: ['smart', 'vision'], badge: '' },
    ]
  },
  {
    key: 'groq', name: 'Groq / Meta', icon: '🟣',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', cost: '~$0.00006/conv', tags: ['fast', 'smart'], badge: '' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', cost: 'Casi gratis', tags: ['fast', 'cheap'], badge: '' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', cost: '~$0.0001/conv', tags: ['fast', 'smart'], badge: '' },
    ]
  },
  {
    key: 'mistral', name: 'Mistral AI', icon: '🔴',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', cost: '~$0.004/conv', tags: ['smart'], badge: '' },
      { id: 'mistral-small-latest', name: 'Mistral Small', cost: '~$0.0005/conv', tags: ['fast', 'cheap'], badge: '' },
    ]
  },
  {
    key: 'deepseek', name: 'DeepSeek', icon: '🔷',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', cost: '~$0.0003/conv', tags: ['smart', 'cheap'], badge: 'Nuevo' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', cost: '~$0.0008/conv', tags: ['smart'], badge: 'Nuevo' },
    ]
  },
]

const TAG_STYLE: Record<string, React.CSSProperties> = {
  smart:  { background: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
  fast:   { background: 'rgba(16,185,129,0.12)', color: '#34d399' },
  cheap:  { background: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  vision: { background: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
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

  // Password
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdError, setPwdError] = useState('')

  // WhatsApp Business
  const [waPhoneId, setWaPhoneId] = useState('')
  const [waToken, setWaToken] = useState('')
  const [waNumber, setWaNumber] = useState('')
  const [waAppId, setWaAppId] = useState('')
  const [waAppSecret, setWaAppSecret] = useState('')
  const [waTestTo, setWaTestTo] = useState('')
  const [waTesting, setWaTesting] = useState(false)
  const [waTestResult, setWaTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showWaToken, setShowWaToken] = useState(false)
  const [waRefreshing, setWaRefreshing] = useState(false)
  const [waRefreshResult, setWaRefreshResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // AI
  const [botName, setBotName] = useState('')
  const [greeting, setGreeting] = useState('')
  const [aiKey, setAiKey] = useState('')
  const [aiModel, setAiModel] = useState('claude-sonnet-4-20250514')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [modelFilter, setModelFilter] = useState('all')
  const [showKeyPlain, setShowKeyPlain] = useState(false)

  useEffect(() => {
    tenantAPI.getSettings()
      .then(r => {
        const s = r.data
        setLogoUrl(s.logo_url || '')
        setPrimaryColor(s.primary_color || '#7c3aed')
        setSupportEmail(s.support_email || '')
        setSupportPhone(s.support_phone || '')
        setBotName(s.webchat_bot_name || '')
        setGreeting(s.webchat_greeting || '')
        setAiModel(s.ai_model || 'claude-sonnet-4-20250514')
        setSystemPrompt(s.webchat_system_prompt || '')
        setWaPhoneId(s.whatsapp_phone_id || '')
        setWaNumber(s.whatsapp_number || '')
        // token not returned by API for security — only set if non-empty indicator
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError('')
    try {
      const payload: Record<string, unknown> = {
        logo_url: logoUrl, primary_color: primaryColor,
        support_email: supportEmail, support_phone: supportPhone,
        webchat_bot_name: botName, webchat_greeting: greeting,
        ai_model: aiModel, webchat_system_prompt: systemPrompt,
        whatsapp_phone_id: waPhoneId || null,
        whatsapp_number: waNumber || null,
      }
      if (aiKey.trim()) payload.openai_api_key = aiKey.trim()
      if (waToken.trim()) payload.whatsapp_access_token = waToken.trim()
      if (waAppId.trim()) payload.meta_app_id = waAppId.trim()
      if (waAppSecret.trim()) payload.meta_app_secret = waAppSecret.trim()
      await tenantAPI.updateSettings(payload)
      setSaved(true); setAiKey('')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { console.error(e); setError('Error al guardar. Intenta de nuevo.') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwdError('')
    if (newPwd.length < 8) { setPwdError('Mínimo 8 caracteres'); return }
    if (newPwd !== confirmPwd) { setPwdError('Las contraseñas no coinciden'); return }
    setPwdSaving(true)
    try {
      await authAPI.changePassword(currentPwd, newPwd)
      setPwdSaved(true); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setPwdSaved(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwdError(msg || 'Error al cambiar la contraseña')
    } finally { setPwdSaving(false) }
  }

  const handleRefreshWhatsappToken = async () => {
    setWaRefreshing(true); setWaRefreshResult(null)
    try {
      const r = await tenantAPI.refreshWhatsappToken()
      setWaRefreshResult({ ok: true, msg: `Token renovado — expira en ${r.data.expires_in_days} días` })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setWaRefreshResult({ ok: false, msg: msg || 'Error al renovar el token' })
    } finally { setWaRefreshing(false) }
  }

  const handleTestWhatsapp = async () => {
    if (!waTestTo.trim()) return
    setWaTesting(true); setWaTestResult(null)
    try {
      await tenantAPI.testWhatsapp(waTestTo.trim())
      setWaTestResult({ ok: true, msg: 'Mensaje enviado correctamente' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setWaTestResult({ ok: false, msg: msg || 'Error al enviar el mensaje' })
    } finally { setWaTesting(false) }
  }

  // Find current model info
  const allModels = AI_PROVIDERS.flatMap(p => p.models.map(m => ({ ...m, provider: p.name, providerIcon: p.icon, providerKey: p.key })))
  const currentModel = allModels.find(m => m.id === aiModel)

  // Filter models
  const filteredProviders = AI_PROVIDERS.map(p => ({
    ...p,
    models: p.models.filter(m => {
      const matchSearch = !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) || p.name.toLowerCase().includes(modelSearch.toLowerCase())
      const matchFilter = modelFilter === 'all' || m.tags.includes(modelFilter)
      return matchSearch && matchFilter
    })
  })).filter(p => p.models.length > 0)

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-[#0d0d1a] border border-white/5 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Personaliza tu plataforma OmniFlow</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Branding */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <Palette size={15} className="text-violet-400" />
          <h3 className="font-semibold text-white text-sm">Identidad Visual</h3>
        </div>
        <div className="space-y-4">
          <Field label="URL del Logo" value={logoUrl} onChange={setLogoUrl} placeholder="https://tuempresa.com/logo.png" />
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Color Principal</label>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <code className="flex-1 text-sm font-mono bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-violet-300">{primaryColor}</code>
            </div>
          </div>
          {(logoUrl || primaryColor) && (
            <div className="p-4 rounded-xl bg-white/3 border border-white/5 flex items-center gap-4">
              <Globe size={13} className="text-slate-500 shrink-0" />
              <span className="text-xs text-slate-500">Preview:</span>
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
                : <span className="text-sm font-bold" style={{ color: primaryColor }}>OmniFlow</span>
              }
              <button className="ml-auto text-xs font-medium px-3 py-1 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>Botón</button>
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <Mail size={15} className="text-blue-400" />
          <h3 className="font-semibold text-white text-sm">Contacto y Soporte</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email de Soporte" value={supportEmail} onChange={setSupportEmail} placeholder="soporte@tuempresa.com" type="email" />
          <Field label="WhatsApp de Soporte" value={supportPhone} onChange={setSupportPhone} placeholder="+56912345678" />
        </div>
      </div>

      {/* AI Sales Agent */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <Bot size={15} className="text-green-400" />
          <h3 className="font-semibold text-white text-sm">AI Sales Agent</h3>
          {currentModel && (
            <span className="ml-auto text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/8 flex items-center gap-1">
              <span>{currentModel.providerIcon}</span> {currentModel.provider}
            </span>
          )}
        </div>
        <div className="space-y-4">

          {/* Bot name + greeting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del Agente" value={botName} onChange={setBotName} placeholder="Asistente" />
            <Field label="Mensaje de Bienvenida" value={greeting} onChange={setGreeting} placeholder="¡Hola! ¿En qué puedo ayudarte?" />
          </div>

          {/* Model selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Modelo IA</label>

            {/* Selected model preview */}
            {currentModel && (
              <div className="flex items-center justify-between bg-violet-500/8 border border-violet-500/20 rounded-xl px-3 py-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{currentModel.providerIcon}</span>
                  <div>
                    <div className="text-xs font-semibold text-white">{currentModel.name}</div>
                    <div className="text-[10px] text-slate-500">{currentModel.provider}</div>
                  </div>
                </div>
                <div className="text-[10px] text-green-400 font-mono">{currentModel.cost}</div>
              </div>
            )}

            {/* Search + filter */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="Buscar modelo..."
                  className="w-full bg-white/5 border border-white/8 rounded-lg pl-7 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40" />
              </div>
              <div className="flex gap-1">
                {['all', 'smart', 'fast', 'cheap'].map(f => (
                  <button key={f} onClick={() => setModelFilter(f)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
                    style={{ background: modelFilter === f ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', color: modelFilter === f ? '#a78bfa' : '#475569', borderColor: modelFilter === f ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)' }}>
                    {f === 'all' ? 'Todos' : f === 'smart' ? '🧠' : f === 'fast' ? '⚡' : '💰'}
                  </button>
                ))}
              </div>
            </div>

            {/* Models grouped by provider */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-0.5">
              {filteredProviders.map(provider => (
                <div key={provider.key}>
                  <div className="flex items-center gap-2 mb-1.5 px-0.5">
                    <span className="text-sm">{provider.icon}</span>
                    <span className="text-[10px] font-medium text-slate-500">{provider.name}</span>
                    <div className="flex-1 h-px bg-white/4" />
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {provider.models.map(model => {
                      const isSelected = aiModel === model.id
                      return (
                        <button key={model.id} onClick={() => setAiModel(model.id)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                          style={{ background: isSelected ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)', borderColor: isSelected ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white">{model.name}</span>
                              {model.badge && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ background: model.badge === 'Recomendado' ? 'rgba(16,185,129,0.15)' : model.badge === 'Económico' ? 'rgba(245,158,11,0.12)' : model.badge === 'Potente' ? 'rgba(124,58,237,0.15)' : model.badge === 'Más barato' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                    color: model.badge === 'Recomendado' ? '#34d399' : model.badge === 'Económico' ? '#fbbf24' : model.badge === 'Potente' ? '#a78bfa' : model.badge === 'Más barato' ? '#34d399' : '#f87171' }}>
                                  {model.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {model.tags.map(t => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md font-medium" style={TAG_STYLE[t] ?? {}}>
                                  {t === 'smart' ? '🧠 Inteligente' : t === 'fast' ? '⚡ Rápido' : t === 'cheap' ? '💰 Económico' : t === 'vision' ? '👁 Visión' : t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-green-400 font-mono">{model.cost}</div>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#fff" strokeWidth="2"><polyline points="1 4 3 6 7 2"/></svg>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Key size={11} />
              API Key — {currentModel?.provider || 'Proveedor IA'}
            </label>
            <div className="flex gap-2">
              <input type={showKeyPlain ? 'text' : 'password'} value={aiKey} onChange={e => setAiKey(e.target.value)}
                placeholder={`${currentModel?.providerKey === 'anthropic' ? 'sk-ant-...' : currentModel?.providerKey === 'openai' ? 'sk-...' : currentModel?.providerKey === 'groq' ? 'gsk_...' : currentModel?.providerKey === 'google' ? 'AIza...' : 'API Key...'} (vacío = mantener actual)`}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 font-mono" />
              <button onClick={() => setShowKeyPlain(v => !v)}
                className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-white transition-colors">
                {showKeyPlain ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {currentModel?.providerKey === 'groq' && (
              <p className="text-xs text-slate-600 mt-1">Clave gratis en <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">console.groq.com</a></p>
            )}
            {currentModel?.providerKey === 'anthropic' && (
              <p className="text-xs text-slate-600 mt-1">Clave en <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">console.anthropic.com</a></p>
            )}
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">System Prompt — Entrenamiento del Agente</label>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
              placeholder={`Eres el asistente virtual de [Tu Empresa]. Respondes de forma amable y profesional.\n\nPRODUCTOS: ...\nPRECIOS: ...\nINSTRUCCIONES: Responde máximo en 3-4 oraciones. Cuando el cliente quiera comprar solicita nombre y email. Si no puedes resolver algo escribe: ESCALAR_HUMANO`}
              rows={8}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 font-mono text-xs resize-y" />
            <p className="text-xs text-slate-600 mt-1">{systemPrompt.length} / 2000 caracteres · Define comportamiento, productos, precios y personalidad.</p>
          </div>

        </div>
      </div>

      {/* WhatsApp Business API */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <MessageCircle size={15} className="text-emerald-400" />
          <h3 className="font-semibold text-white text-sm">WhatsApp Business API</h3>
          <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Meta Cloud API</span>
        </div>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Configura tu número oficial de WhatsApp Business para recibir y responder mensajes con IA.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number ID" value={waPhoneId} onChange={setWaPhoneId}
              placeholder="123456789012345" mono />
            <Field label="Número WhatsApp (con código de país)" value={waNumber} onChange={setWaNumber}
              placeholder="+56912345678" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Key size={11} />
              Access Token (Permanent System User Token)
            </label>
            <div className="flex gap-2">
              <input
                type={showWaToken ? 'text' : 'password'}
                value={waToken}
                onChange={e => setWaToken(e.target.value)}
                placeholder="EAAOxxxxxxxx... (vacío = mantener actual)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 font-mono"
              />
              <button onClick={() => setShowWaToken(v => !v)}
                className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-white transition-colors">
                {showWaToken ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Genera un token permanente en{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                Meta Business Manager
              </a>
              {' '}→ Usuarios del sistema → Generar token.
            </p>
          </div>

          {/* Meta App credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Meta App ID" value={waAppId} onChange={setWaAppId} placeholder="990865383365554" mono />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1"><Key size={11} />Meta App Secret</label>
              <input type="password" value={waAppSecret} onChange={e => setWaAppSecret(e.target.value)} placeholder="(vacío = mantener actual)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 font-mono" />
            </div>
          </div>

          {/* Renovar token */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-slate-400">Renovar Token (guarda App ID + Secret primero)</p>
              <button onClick={handleRefreshWhatsappToken} disabled={waRefreshing}
                className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-medium px-4 py-2 rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                {waRefreshing ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                {waRefreshing ? 'Renovando...' : 'Renovar 60 días'}
              </button>
            </div>
            {waRefreshResult && (
              <p className={`text-xs mt-2 ${waRefreshResult.ok ? 'text-blue-400' : 'text-red-400'}`}>
                {waRefreshResult.ok ? '✓' : '✗'} {waRefreshResult.msg}
              </p>
            )}
          </div>

          {/* Test */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-400 mb-3">Probar envío (guarda primero)</p>
            <div className="flex gap-2">
              <input
                value={waTestTo}
                onChange={e => setWaTestTo(e.target.value)}
                placeholder="+56912345678"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 font-mono"
              />
              <button onClick={handleTestWhatsapp} disabled={waTesting || !waTestTo.trim()}
                className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-medium px-4 py-2.5 rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                {waTesting ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                {waTesting ? 'Enviando...' : 'Enviar prueba'}
              </button>
            </div>
            {waTestResult && (
              <p className={`text-xs mt-2 ${waTestResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {waTestResult.ok ? '✓' : '✗'} {waTestResult.msg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
          <ShieldCheck size={15} className="text-amber-400" />
          <h3 className="font-semibold text-white text-sm">Seguridad</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <p className="text-xs text-slate-500">Cambia la contraseña de tu cuenta.</p>
          <Field label="Contraseña actual" value={currentPwd} onChange={setCurrentPwd} type="password" placeholder="Tu contraseña actual" />
          <Field label="Nueva contraseña" value={newPwd} onChange={setNewPwd} type="password" placeholder="Mínimo 8 caracteres" />
          <Field label="Confirmar nueva contraseña" value={confirmPwd} onChange={setConfirmPwd} type="password" placeholder="Repite la nueva contraseña" />
          {pwdError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{pwdError}</p>}
          <div className="flex items-center gap-3">
            {pwdSaved && <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle2 size={13} />Contraseña actualizada</div>}
            <button type="submit" disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
              className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium px-4 py-2 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {pwdSaving ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
              {pwdSaving ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        {saved && <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle2 size={13} />Configuración guardada</div>}
        <button onClick={handleSave} disabled={saving}
          className="ml-auto flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
