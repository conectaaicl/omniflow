'use client'

import { useState, useEffect } from 'react'
import { tenantAPI } from '@/lib/api'
import {
  Phone, Instagram, Facebook, Globe, Tv2, Mail, ShoppingBag,
  CheckCircle2, AlertCircle, Save, RefreshCw, Eye, EyeOff,
  ExternalLink, Copy, Bot, Zap, MessageSquare
} from 'lucide-react'

interface Settings { [key: string]: string | number | boolean | undefined }

function Field({ label, value, onChange, placeholder, secret = false, mono = false, readonly = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; secret?: boolean; mono?: boolean; readonly?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          readOnly={readonly}
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 ${secret ? 'pr-10' : 'pr-3'} py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all ${mono ? 'font-mono text-xs' : ''} ${readonly ? 'opacity-60 cursor-default' : ''}`}
        />
        {secret && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-violet-300 truncate">{value}</code>
        <button onClick={copy} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0">
          {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${connected ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-500'}`}>
      {connected ? <><CheckCircle2 size={11} />Conectado</> : <><AlertCircle size={11} />Sin configurar</>}
    </div>
  )
}

type SectionProps = { title: string; icon: React.ElementType; color: string; connected: boolean; children: React.ReactNode; onSave: () => void; saving: boolean; saved: boolean }
function Section({ title, icon: Icon, color, connected, children, onSave, saving, saved }: SectionProps) {
  return (
    <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
            <Icon size={20} style={{ color }} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>
      <div className="space-y-4">{children}</div>
      <div className="mt-5 flex justify-end">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 font-medium px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-40"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [s, setS] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://osw.conectaai.cl'

  useEffect(() => {
    tenantAPI.getSettings()
      .then((r) => {
        setS(r.data || {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const set = (key: string, val: string | boolean) => setS(p => ({ ...p, [key]: val }))

  const save = async (section: string, fields: string[]) => {
    setSaving(section)
    setSaved(null)
    try {
      const data: Settings = {}
      fields.forEach(f => { if (s[f] !== undefined) data[f] = s[f] })
      await tenantAPI.updateSettings(data)
      setSaved(section)
      setTimeout(() => setSaved(null), 3000)
    } catch (e) { console.error(e) }
    finally { setSaving(null) }
  }

  const str = (k: string) => String(s[k] || '')
  const bool = (k: string) => Boolean(s[k])

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-40 bg-[#0d0d1a] border border-white/5 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Canales e Integraciones</h1>
        <p className="text-slate-400 text-sm mt-0.5">Conecta todos tus canales para recibir mensajes en OmniFlow</p>
      </div>

      {/* WhatsApp */}
      <Section title="WhatsApp Business API" icon={Phone} color="#25d366"
        connected={bool('has_whatsapp')}
        onSave={() => save('wa', ['whatsapp_phone_id','whatsapp_access_token','whatsapp_verify_token','whatsapp_number'])}
        saving={saving === 'wa'} saved={saved === 'wa'}>
        <Field label="Phone Number ID" value={str('whatsapp_phone_id')} onChange={v => set('whatsapp_phone_id', v)} placeholder="123456789012345" mono />
        <Field label="Access Token" value={str('whatsapp_access_token')} onChange={v => set('whatsapp_access_token', v)} placeholder="EAAxxxxx..." secret mono />
        <Field label="Verify Token (para webhook)" value={str('whatsapp_verify_token')} onChange={v => set('whatsapp_verify_token', v)} placeholder="mi_token_secreto" mono />
        <CopyField label="URL Webhook → configurar en Meta" value={`${origin}/api/v1/webhooks/whatsapp`} />
        <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          Documentación Meta API <ExternalLink size={10} />
        </a>
      </Section>

      {/* Instagram */}
      <Section title="Instagram DMs" icon={Instagram} color="#e1306c"
        connected={bool('has_instagram')}
        onSave={() => save('ig', ['instagram_page_id','instagram_access_token','instagram_verify_token'])}
        saving={saving === 'ig'} saved={saved === 'ig'}>
        <Field label="Instagram Page / Business Account ID" value={str('instagram_page_id')} onChange={v => set('instagram_page_id', v)} placeholder="123456789" mono />
        <Field label="Page Access Token" value={str('instagram_access_token')} onChange={v => set('instagram_access_token', v)} placeholder="EAAxxxxx..." secret mono />
        <Field label="Verify Token" value={str('instagram_verify_token')} onChange={v => set('instagram_verify_token', v)} placeholder="mi_verify_token_ig" mono />
        <CopyField label="URL Webhook → configurar en Meta App" value={`${origin}/api/v1/webhooks/meta`} />
        <p className="text-xs text-slate-600">Suscribirse a eventos: <code className="text-slate-400">messages, messaging_seen</code></p>
      </Section>

      {/* Facebook */}
      <Section title="Facebook Messenger + Lead Ads" icon={Facebook} color="#1877f2"
        connected={bool('has_facebook')}
        onSave={() => save('fb', ['facebook_page_id','facebook_access_token','facebook_verify_token'])}
        saving={saving === 'fb'} saved={saved === 'fb'}>
        <Field label="Facebook Page ID" value={str('facebook_page_id')} onChange={v => set('facebook_page_id', v)} placeholder="123456789" mono />
        <Field label="Page Access Token" value={str('facebook_access_token')} onChange={v => set('facebook_access_token', v)} placeholder="EAAxxxxx..." secret mono />
        <Field label="Verify Token" value={str('facebook_verify_token')} onChange={v => set('facebook_verify_token', v)} placeholder="mi_verify_token_fb" mono />
        <CopyField label="URL Webhook → configurar en Meta App" value={`${origin}/api/v1/webhooks/meta`} />
        <p className="text-xs text-slate-600">Suscribirse a: <code className="text-slate-400">messages, leadgen, messaging_postbacks</code></p>
      </Section>

      {/* TikTok */}
      <Section title="TikTok Lead Generation" icon={Tv2} color="#ff0050"
        connected={bool('has_tiktok')}
        onSave={() => save('tt', ['tiktok_app_id','tiktok_app_secret','tiktok_access_token'])}
        saving={saving === 'tt'} saved={saved === 'tt'}>
        <Field label="TikTok App ID" value={str('tiktok_app_id')} onChange={v => set('tiktok_app_id', v)} placeholder="7xxxxxxxxxxxxx" mono />
        <Field label="App Secret" value={str('tiktok_app_secret')} onChange={v => set('tiktok_app_secret', v)} placeholder="xxxxxxxxxxxxxxxx" secret mono />
        <Field label="Access Token (Lead Ads)" value={str('tiktok_access_token')} onChange={v => set('tiktok_access_token', v)} placeholder="act.xxxxx" secret mono />
        <CopyField label="URL Webhook → TikTok for Business" value={`${origin}/api/v1/webhooks/tiktok`} />
        <a href="https://business-api.tiktok.com/portal/docs" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          TikTok Business API Docs <ExternalLink size={10} />
        </a>
      </Section>

      {/* Shopify */}
      <Section title="Shopify" icon={ShoppingBag} color="#96bf48"
        connected={bool('has_shopify')}
        onSave={() => save('sh', ['shopify_shop_domain','shopify_access_token','shopify_webhook_secret'])}
        saving={saving === 'sh'} saved={saved === 'sh'}>
        <Field label="Shop Domain" value={str('shopify_shop_domain')} onChange={v => set('shopify_shop_domain', v)} placeholder="tutienda.myshopify.com" mono />
        <Field label="Admin API Access Token" value={str('shopify_access_token')} onChange={v => set('shopify_access_token', v)} placeholder="shpat_xxxxx" secret mono />
        <Field label="Webhook Secret (para verificación HMAC)" value={str('shopify_webhook_secret')} onChange={v => set('shopify_webhook_secret', v)} placeholder="shpss_xxxxx" secret mono />
        <div className="bg-white/3 border border-white/5 rounded-lg p-3 space-y-1.5">
          <p className="text-xs text-slate-500 font-medium mb-2">Registrar en Shopify Admin → Notificaciones → Webhooks:</p>
          {[
            ['Pedidos creados', 'orders/create'],
            ['Clientes creados', 'customers/create'],
            ['Carritos abandonados', 'checkouts/create'],
          ].map(([label, topic]) => (
            <div key={topic} className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{label}:</span>
              <code className="text-xs text-violet-300 font-mono">{origin}/api/v1/webhooks/shopify</code>
            </div>
          ))}
        </div>
      </Section>

      {/* Email */}
      <Section title="Email" icon={Mail} color="#f59e0b"
        connected={bool('has_email')}
        onSave={() => save('em', ['email_provider','smtp_host','smtp_port','smtp_user','smtp_password','smtp_from_address','sendgrid_api_key','mailgun_api_key','mailgun_domain'])}
        saving={saving === 'em'} saved={saved === 'em'}>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Proveedor</label>
          <select value={str('email_provider')} onChange={e => set('email_provider', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-all">
            <option value="">Seleccionar...</option>
            <option value="smtp">SMTP (Gmail, Outlook, etc.)</option>
            <option value="sendgrid">SendGrid</option>
            <option value="mailgun">Mailgun</option>
          </select>
        </div>
        {str('email_provider') === 'smtp' && <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SMTP Host" value={str('smtp_host')} onChange={v => set('smtp_host', v)} placeholder="smtp.gmail.com" />
            <Field label="Puerto" value={str('smtp_port')} onChange={v => set('smtp_port', v)} placeholder="587" />
          </div>
          <Field label="Usuario SMTP" value={str('smtp_user')} onChange={v => set('smtp_user', v)} placeholder="tu@gmail.com" />
          <Field label="Contraseña SMTP" value={str('smtp_password')} onChange={v => set('smtp_password', v)} placeholder="App password" secret />
          <Field label="Email remitente" value={str('smtp_from_address')} onChange={v => set('smtp_from_address', v)} placeholder="hola@tuempresa.com" />
        </>}
        {str('email_provider') === 'sendgrid' && <>
          <Field label="SendGrid API Key" value={str('sendgrid_api_key')} onChange={v => set('sendgrid_api_key', v)} placeholder="SG.xxxxx" secret mono />
          <Field label="Email remitente" value={str('smtp_from_address')} onChange={v => set('smtp_from_address', v)} placeholder="hola@tuempresa.com" />
          <CopyField label="Webhook inbound (SendGrid Parse)" value={`${origin}/api/v1/webhooks/email`} />
        </>}
        {str('email_provider') === 'mailgun' && <>
          <Field label="Mailgun API Key" value={str('mailgun_api_key')} onChange={v => set('mailgun_api_key', v)} placeholder="key-xxxxx" secret mono />
          <Field label="Mailgun Domain" value={str('mailgun_domain')} onChange={v => set('mailgun_domain', v)} placeholder="mg.tuempresa.com" />
          <Field label="Email remitente" value={str('smtp_from_address')} onChange={v => set('smtp_from_address', v)} placeholder="hola@tuempresa.com" />
          <CopyField label="Webhook inbound (Mailgun Routes)" value={`${origin}/api/v1/webhooks/email`} />
        </>}
      </Section>

      {/* Web Chat */}
      <Section title="Web Chat Widget + AI Agent" icon={Globe} color="#7c3aed"
        connected={bool('webchat_enabled')}
        onSave={() => save('wc', ['webchat_enabled','webchat_greeting','webchat_bot_name','webchat_color'])}
        saving={saving === 'wc'} saved={saved === 'wc'}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Widget habilitado</span>
          <button onClick={() => set('webchat_enabled', !bool('webchat_enabled'))}
            className={`relative w-10 h-5.5 rounded-full transition-all ${bool('webchat_enabled') ? 'bg-violet-600' : 'bg-white/10'}`}
            style={{ height: '22px', width: '40px' }}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${bool('webchat_enabled') ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <Field label="Mensaje de bienvenida" value={str('webchat_greeting') || '¡Hola! ¿En qué puedo ayudarte?'} onChange={v => set('webchat_greeting', v)} placeholder="¡Hola! ¿En qué puedo ayudarte?" />
        <Field label="Nombre del asistente" value={str('webchat_bot_name') || 'Asistente'} onChange={v => set('webchat_bot_name', v)} placeholder="Asistente" />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Color del widget</label>
          <div className="flex items-center gap-3">
            <input type="color" value={str('webchat_color') || '#7c3aed'} onChange={e => set('webchat_color', e.target.value)}
              className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            <code className="flex-1 text-sm font-mono bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-violet-300">
              {str('webchat_color') || '#7c3aed'}
            </code>
          </div>
        </div>
        <div className="mt-2 bg-white/3 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-2 font-medium">Código para pegar antes de <code>&lt;/body&gt;</code>:</p>
          <pre className="text-xs text-violet-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {`<script src="${origin}/widget.js" data-tenant="${str('tenant_subdomain') || 'osw'}"></script>`}
          </pre>
        </div>
        <div className="flex items-center gap-3">
          <a href={`${origin}/webchat-preview`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Ver preview del widget <ExternalLink size={10} />
          </a>
          {bool('has_ai') && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
              <Bot size={10} /> AI Agent activo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600">
          Para entrenar el AI Agent ve a{' '}
          <a href="/settings" className="text-violet-400 hover:text-violet-300">Configuración → AI Sales Agent</a>
        </p>
      </Section>

      {/* n8n */}
      <Section title="n8n Automatización" icon={Zap} color="#f59e0b"
        connected={bool('n8n_url') as boolean}
        onSave={() => save('n8n', ['n8n_url','n8n_webhook_path'])}
        saving={saving === 'n8n'} saved={saved === 'n8n'}>
        <Field label="n8n URL base" value={str('n8n_url')} onChange={v => set('n8n_url', v)} placeholder="https://osw.conectaai.cl/n8n" mono />
        <Field label="Webhook path (ruta del nodo Webhook en n8n)" value={str('n8n_webhook_path')} onChange={v => set('n8n_webhook_path', v)} placeholder="webhook/omniflow-leads" mono />
        <p className="text-xs text-slate-600">Cada mensaje entrante disparará este webhook. El payload incluye contact, message y canal.</p>
      </Section>
    </div>
  )
}
