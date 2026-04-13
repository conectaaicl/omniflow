'use client'

import { useState } from 'react'
import api from '@/lib/api'

const C = {
  base: '#0a0b0d', card: '#161a22', surface: '#111318',
  border: 'rgba(255,255,255,0.07)', accent: '#00e5a0',
  text: '#e2e8f0', muted: '#64748b',
  blue: '#60a5fa', purple: '#a78bfa', red: '#f87171',
}

function Field({
  label, value, onChange, placeholder, mono, rows, hint
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; rows?: number; hint?: string
}) {
  const base: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: mono ? 'monospace' : 'inherit',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</label>
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={rows} style={{ ...base, resize: 'vertical' as const }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />
      )}
      {hint && <div style={{ fontSize: 11, color: C.muted }}>{hint}</div>}
    </div>
  )
}

// Live widget preview
function WidgetPreview({ botName, color, greeting, logo }: { botName: string; color: string; greeting: string; logo: string }) {
  const [open, setOpen] = useState(true)
  const c = color || '#00e5a0'
  return (
    <div style={{ position: 'relative', height: 380, background: '#1a1f2e', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}>
      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        {open && (
          <div style={{ width: 260, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: c, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {logo ? (
                <img src={logo} alt="logo" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#fff' }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{botName || 'Asistente'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>En l\u00ednea</div>
              </div>
            </div>
            {/* Messages */}
            <div style={{ padding: 14, background: '#f9fafb', minHeight: 120 }}>
              <div style={{ background: c + '22', borderRadius: '12px 12px 12px 4px', padding: '8px 12px', fontSize: 12, color: '#1f2937', maxWidth: '85%', marginBottom: 8 }}>
                {greeting || '\u00a1Hola! \u00bfEn qu\u00e9 puedo ayudarte?'}
              </div>
            </div>
            {/* Input */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 20, padding: '7px 12px', fontSize: 11, color: '#9ca3af' }}>Escribe un mensaje...</div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>↑</div>
            </div>
          </div>
        )}
        {/* Bubble button */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: 52, height: 52, borderRadius: '50%', background: c,
            border: 'none', cursor: 'pointer', fontSize: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${c}60`,
          }}
        >
          {open ? '✕' : '💬'}
        </button>
      </div>
    </div>
  )
}

// ─── Install Guide ────────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'gtm', label: 'Google Tag Manager', icon: '🏷️',
    steps: [
      'Entra a tagmanager.google.com con la cuenta del cliente',
      'Selecciona el contenedor del sitio web',
      'Haz clic en "Nueva etiqueta" → Configuración → HTML personalizado',
      'Pega el código del widget en el campo HTML',
      'En "Activación" selecciona "All Pages" (todas las páginas)',
      'Guarda y haz clic en "Enviar" para publicar',
    ],
  },
  {
    id: 'wordpress', label: 'WordPress', icon: '🔵',
    steps: [
      'Instala el plugin gratuito "Insert Headers and Footers" (WPCode)',
      'En el menú de WordPress ve a Código → Fragmentos de código',
      'Haz clic en "+ Agregar fragmento" → HTML snippet',
      'Pega el código del widget',
      'En "Ubicación" selecciona "Footer del sitio"',
      'Activa y guarda — listo, sin tocar archivos',
    ],
  },
  {
    id: 'shopify', label: 'Shopify', icon: '🛍️',
    steps: [
      'En el panel de Shopify ve a "Tienda online" → "Temas"',
      'Haz clic en los tres puntos del tema activo → "Editar código"',
      'En el panel izquierdo busca el archivo "theme.liquid"',
      'Busca la etiqueta </body> al final del archivo',
      'Pega el código del widget justo antes de </body>',
      'Haz clic en "Guardar" — el widget aparece al instante',
    ],
  },
  {
    id: 'wix', label: 'Wix', icon: '⬛',
    steps: [
      'En el editor de Wix ve a "Configuración" del sitio',
      'Haz clic en "Avanzado" → "Código personalizado"',
      'Haz clic en "+ Agregar código personalizado"',
      'Pega el código del widget en el campo',
      'En "Agregar código a" selecciona "Todas las páginas"',
      'En "Lugar en el código" selecciona "Body - fin"',
      'Guarda y publica el sitio',
    ],
  },
  {
    id: 'squarespace', label: 'Squarespace', icon: '⬜',
    steps: [
      'En el panel de Squarespace ve a "Configuración"',
      'Haz clic en "Avanzado" → "Inyección de código"',
      'Busca la sección "Pie de página" (Footer)',
      'Pega el código del widget en ese campo',
      'Haz clic en "Guardar" — aparece en todo el sitio',
    ],
  },
  {
    id: 'html', label: 'HTML / Otro', icon: '📄',
    steps: [
      'Abre el archivo index.html (o el archivo principal) de tu sitio',
      'Busca la etiqueta </body> al final del archivo',
      'Pega el código del widget justo antes de </body>',
      'Guarda el archivo y sube los cambios a tu hosting (FTP o panel)',
    ],
  },
]

function InstallGuide({ snippet }: { snippet: string }) {
  const [platform, setPlatform] = useState('gtm')
  const [copied, setCopied] = useState(false)
  const [copiedStep, setCopiedStep] = useState(false)
  const selected = PLATFORMS.find(p => p.id === platform)!

  function copy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => { setter(true); setTimeout(() => setter(false), 2000) })
  }

  const gtmSnippet = `<script>
  // Pega esto como HTML personalizado en GTM
  ${snippet}
</script>`

  return (
    <div style={{ padding: '40px 28px', maxWidth: 760, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: C.text, minHeight: '100vh', background: C.base }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, color: C.accent }}>¡Widget listo!</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Ahora instálalo en el sitio web del cliente. Elige la plataforma:</p>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: platform === p.id ? C.accent : C.card,
              color: platform === p.id ? '#000' : C.muted,
              outline: platform === p.id ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Steps card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{selected.icon}</span> Instalar en {selected.label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selected.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: C.accent + '20', border: `1px solid ${C.accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: C.accent,
              }}>{i + 1}</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, paddingTop: 4 }}>{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Code snippet */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Código a pegar {platform === 'gtm' ? '(en el campo HTML de GTM)' : '(antes del </body>)'}
        </div>
        <div style={{ background: C.surface, borderRadius: 10, padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: C.accent, wordBreak: 'break-all', marginBottom: 14, lineHeight: 1.7 }}>
          {platform === 'gtm' ? gtmSnippet : snippet}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => copy(platform === 'gtm' ? gtmSnippet : snippet, setCopied)}
            style={{
              background: copied ? C.accent : C.surface, color: copied ? '#000' : C.text,
              border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 18px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copiado!' : 'Copiar código'}
          </button>
          {platform === 'wordpress' && (
            <button
              onClick={() => copy('https://wordpress.org/plugins/insert-headers-and-footers/', setCopiedStep)}
              style={{
                background: C.surface, color: C.blue, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {copiedStep ? '✓ Copiado!' : 'Copiar link del plugin'}
            </button>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <a href="/conversations" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, background: C.accent, color: '#000', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
          Ver conversaciones →
        </a>
        <a href="/channels" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, background: C.surface, color: C.text, fontWeight: 700, fontSize: 13, textDecoration: 'none', border: `1px solid ${C.border}` }}>
          Configurar más canales
        </a>
        <a href="/setup" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, background: C.surface, color: C.muted, fontWeight: 700, fontSize: 13, textDecoration: 'none', border: `1px solid ${C.border}` }}>
          + Nuevo cliente
        </a>
      </div>
    </div>
  )
}

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [snippet, setSnippet] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    company_name: '',
    logo_url: '',
    custom_domain: '',
    bot_name: '',
    color: '#00e5a0',
    greeting: '\u00a1Hola! \u00bfEn qu\u00e9 puedo ayudarte?',
    system_prompt: '',
    telegram_bot_token: '',
  })

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true); setError('')
    try {
      const r = await api.post('/channels/setup', form)
      setSnippet(r.data.snippet || '')
      setDone(true)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar')
    }
    finally { setSaving(false) }
  }

  function copySnippet() {
    navigator.clipboard.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const stepDot = (n: number) => ({
    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: step >= n ? C.accent : C.surface,
    color: step >= n ? '#000' : C.muted,
    fontSize: 13, fontWeight: 700,
    border: `1px solid ${step >= n ? C.accent : C.border}`,
    cursor: 'pointer' as const,
  })

  if (done) {
    return <InstallGuide snippet={snippet} />
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 960, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: C.text, minHeight: '100vh', background: C.base }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Configuraci\u00f3n r\u00e1pida</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Configura tu widget con IA en menos de 2 minutos</p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map((n, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={() => setStep(n)} style={stepDot(n)}>{n}</div>
            <span style={{ fontSize: 12, color: step === n ? C.text : C.muted, fontWeight: step === n ? 600 : 400 }}>
              {n === 1 ? 'Tu empresa' : n === 2 ? 'Widget IA' : 'Notificaciones'}
            </span>
            {i < 2 && <div style={{ width: 40, height: 1, background: step > n ? C.accent : C.border, margin: '0 4px' }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Left: form */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Tu empresa</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Estos datos aparecen en el widget de chat</p>
              </div>
              <Field label="Nombre de la empresa *" value={form.company_name} onChange={set('company_name')} placeholder="TerraBlinds SpA" />
              <Field label="URL del logo" value={form.logo_url} onChange={set('logo_url')} placeholder="https://tuempresa.cl/logo.png" hint="Logo circular, PNG o JPG recomendado" />
              <Field label="Dominio de tu web" value={form.custom_domain} onChange={set('custom_domain')} placeholder="terrablinds.cl" hint="El dominio donde instalar\u00e1s el widget (sin https://)" />
              <Field label="Color del widget" value={form.color} onChange={set('color')} placeholder="#00e5a0" hint="Color hexadecimal para el bot\u00f3n y encabezado" />
              <button
                onClick={() => setStep(2)}
                disabled={!form.company_name.trim()}
                style={{
                  background: C.accent, color: '#000', border: 'none', borderRadius: 10,
                  padding: '12px 20px', fontSize: 13, fontWeight: 700,
                  cursor: form.company_name.trim() ? 'pointer' : 'not-allowed',
                  opacity: form.company_name.trim() ? 1 : 0.5,
                }}
              >
                Siguiente: Widget IA →
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Configura la IA</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Entr\u00e9na la IA con info de tus productos y servicios</p>
              </div>
              <Field label="Nombre del asistente" value={form.bot_name} onChange={set('bot_name')} placeholder="Asistente de TerraBlinds" />
              <Field label="Mensaje de bienvenida" value={form.greeting} onChange={set('greeting')} placeholder="\u00a1Hola! \u00bfEn qu\u00e9 puedo ayudarte?" />
              <Field
                label="Instrucciones para la IA *"
                value={form.system_prompt}
                onChange={set('system_prompt')}
                placeholder={`Ejemplo:\nEres el asistente virtual de TerraBlinds. Vendemos cortinas roller, persianas, toldos y cierres de terraza para casas y oficinas en Chile.\n\nProductos destacados:\n- Roller Blackout desde $25.000\n- Roller Screen para luz filtrada\n- Toldos a medida\n\nAl primer mensaje pide el nombre del cliente y su número de WhatsApp para cotizar.`}
                rows={8}
                hint="Describe tus productos, precios, proceso de venta y c\u00f3mo atender al cliente"
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  ← Atr\u00e1s
                </button>
                <button
                  onClick={() => setStep(3)}
                  style={{ flex: 1, background: C.accent, color: '#000', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Siguiente: Notificaciones →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Notificaciones a Telegram</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Recibe una alerta en Telegram cada vez que llega un nuevo lead</p>
              </div>

              <div style={{ background: C.surface, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>C\u00f3mo obtener el token:</div>
                {[
                  ['1\ufe0f\u20e3', 'Abre Telegram y busca @BotFather'],
                  ['2\ufe0f\u20e3', 'Escribe /newbot — ponle nombre y username'],
                  ['3\ufe0f\u20e3', 'Copia el token que te da BotFather'],
                ].map(([n, txt]) => (
                  <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 16 }}>{n}</span>
                    <span style={{ fontSize: 12, color: C.text }}>{txt}</span>
                  </div>
                ))}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', textAlign: 'center', padding: '9px', borderRadius: 8,
                    background: '#229ED9', color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none', marginTop: 6,
                  }}
                >
                  Abrir @BotFather →
                </a>
              </div>

              <Field
                label="Token del Bot de Telegram (opcional)"
                value={form.telegram_bot_token}
                onChange={set('telegram_bot_token')}
                placeholder="7123456789:AAF-xxxxxxxxxxxxxxxxxxx"
                mono
                hint="Deja vac\u00edo si no quieres notificaciones por ahora"
              />

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  ← Atr\u00e1s
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{ flex: 1, background: C.accent, color: '#000', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando\u2026' : '\u2705 Finalizar configuraci\u00f3n'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Preview en vivo
          </div>
          <WidgetPreview
            botName={form.bot_name || form.company_name}
            color={form.color}
            greeting={form.greeting}
            logo={form.logo_url}
          />
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
            As\u00ed ver\u00e1n el widget tus visitantes
          </div>
        </div>
      </div>
    </div>
  )
}
