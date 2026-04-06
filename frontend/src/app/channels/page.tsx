'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'

const C = {
  base: '#0a0b0d', card: '#161a22', surface: '#111318',
  border: 'rgba(255,255,255,0.07)', accent: '#00e5a0',
  text: '#e2e8f0', muted: '#64748b',
  blue: '#60a5fa', purple: '#a78bfa', orange: '#fb923c', red: '#f87171',
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || ''
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || ''

// ─── Shared UI ────────────────────────────────────────────────────────────────
function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null
  const ok = msg.startsWith('\u2713')
  return (
    <div style={{
      marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12,
      background: ok ? 'rgba(0,229,160,0.1)' : 'rgba(248,113,113,0.1)',
      color: ok ? C.accent : C.red, border: `1px solid ${ok ? C.accent : C.red}30`,
    }}>{msg}</div>
  )
}

function Field({
  label, value, onChange, placeholder, mono, type = 'text', rows
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; type?: string; rows?: number;
}) {
  const base: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 12,
    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: mono ? 'monospace' : 'inherit',
  }
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</div>
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={rows} style={{ ...base, resize: 'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={base} />
      )}
    </div>
  )
}

function Btn({
  onClick, children, disabled, variant, small
}: {
  onClick?: () => void; children: React.ReactNode; disabled?: boolean;
  variant?: 'danger' | 'secondary'; small?: boolean;
}) {
  const bg = variant === 'danger' ? C.red : variant === 'secondary' ? C.surface : C.accent
  const color = variant === 'danger' ? '#fff' : variant === 'secondary' ? C.text : '#000'
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: bg, color, border: 'none', borderRadius: 8,
      padding: small ? '6px 12px' : '9px 16px',
      fontSize: small ? 11 : 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'opacity .2s',
    }}>{children}</button>
  )
}

function ChannelCard({
  icon, name, desc, color, connected, children
}: {
  icon: string; name: string; desc: string; color: string;
  connected?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${connected ? color + '40' : C.border}`,
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{desc}</div>
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: connected ? color + '20' : C.surface,
          color: connected ? color : C.muted,
          border: `1px solid ${connected ? color + '40' : C.border}`,
        }}>
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
function WhatsAppCard({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [tab, setTab] = useState<'signup' | 'manual'>('signup')
  const [form, setForm] = useState({ phone_number_id: '', waba_id: '', access_token: '', phone_number: '' })
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [msg, setMsg] = useState('')
  const scriptRef = useRef(false)
  const isConnected = status?.whatsapp?.connected

  useEffect(() => {
    if (scriptRef.current) return
    scriptRef.current = true
    ;(window as any).fbAsyncInit = function () {
      ;(window as any).FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      })
    }
    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  function startEmbeddedSignup() {
    if (!(window as any).FB) { setMsg('SDK de Facebook no cargado. Recarga la página.'); return }
    setConnecting(true)
    ;(window as any).FB.login(
      async (response: any) => {
        if (response.authResponse?.code) {
          try {
            const r = await api.post('/channels/whatsapp/embedded', { code: response.authResponse.code })
            setMsg('\u2713 ' + r.data.message)
            onRefresh()
          } catch (e: any) {
            setMsg('\u2717 ' + (e.response?.data?.detail || e.message))
          }
        } else {
          setMsg('Proceso cancelado o sin permisos.')
        }
        setConnecting(false)
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      }
    )
  }

  async function saveManual() {
    if (!form.phone_number_id || !form.waba_id || !form.access_token) {
      setMsg('Phone Number ID, WABA ID y Access Token son obligatorios')
      return
    }
    setSaving(true); setMsg('')
    try {
      const r = await api.post('/channels/whatsapp/manual', form)
      setMsg('\u2713 ' + r.data.message)
      onRefresh()
    } catch (e: any) { setMsg('\u2717 ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }

  async function disconnect() {
    setDisconnecting(true)
    try { await api.post('/channels/whatsapp/disconnect'); onRefresh() }
    catch { setMsg('Error al desconectar') }
    finally { setDisconnecting(false) }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: active ? C.accent : C.surface, color: active ? '#000' : C.muted,
  })

  return (
    <ChannelCard icon="\ud83d\udcac" name="WhatsApp Business" desc="Mensajes, notificaciones y chatbot por WhatsApp" color="#25d366" connected={isConnected}>
      {isConnected && (
        <div style={{ background: C.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>N\u00famero</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{status?.whatsapp?.phone_number || 'Configurado'}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={tabStyle(tab === 'signup')} onClick={() => setTab('signup')}>Embedded Signup</button>
        <button style={tabStyle(tab === 'manual')} onClick={() => setTab('manual')}>Manual</button>
      </div>

      {tab === 'signup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Conecta tu cuenta de WhatsApp Business a trav\u00e9s de Facebook. Es el m\u00e9todo oficial y m\u00e1s seguro.
          </div>
          <Btn onClick={startEmbeddedSignup} disabled={connecting}>
            {connecting ? 'Conectando\u2026' : '\u25b6  Conectar con Facebook / WhatsApp'}
          </Btn>
          {!META_APP_ID && (
            <div style={{ fontSize: 11, color: C.muted }}>
              Nota: configura NEXT_PUBLIC_META_APP_ID en el servidor para el flujo completo de Meta.
            </div>
          )}
          {isConnected && (
            <Btn variant="danger" small onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? 'Desconectando\u2026' : 'Desconectar WhatsApp'}
            </Btn>
          )}
        </div>
      )}

      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Phone Number ID *" value={form.phone_number_id} onChange={v => setForm(f => ({ ...f, phone_number_id: v }))} placeholder="1106691139187373" mono />
            <Field label="WABA ID *" value={form.waba_id} onChange={v => setForm(f => ({ ...f, waba_id: v }))} placeholder="1234140128932428" mono />
          </div>
          <Field label="Access Token *" value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} placeholder="EAAxxxxxxxx..." mono />
          <Field label="N\u00famero de tel\u00e9fono (opcional)" value={form.phone_number} onChange={v => setForm(f => ({ ...f, phone_number: v }))} placeholder="+56912345678" />
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={saveManual} disabled={saving}>{saving ? 'Guardando\u2026' : 'Guardar configuraci\u00f3n'}</Btn>
            {isConnected && <Btn variant="danger" small onClick={disconnect} disabled={disconnecting}>{disconnecting ? 'Desconectando\u2026' : 'Desconectar'}</Btn>}
          </div>
        </div>
      )}
      <StatusMsg msg={msg} />
    </ChannelCard>
  )
}

// ─── Instagram ────────────────────────────────────────────────────────────────
function InstagramCard({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [form, setForm] = useState({ page_id: '', access_token: '', verify_token: '' })
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('')
  const ig = status?.instagram; const connected = ig?.connected

  async function save() {
    if (!form.page_id || !form.access_token) { setMsg('Page ID y Access Token son obligatorios'); return }
    setSaving(true); setMsg('')
    try { const r = await api.post('/channels/instagram', form); setMsg('\u2713 ' + r.data.message); onRefresh() }
    catch (e: any) { setMsg('\u2717 ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }
  async function disconnect() {
    try { await api.delete('/channels/instagram'); onRefresh() }
    catch { setMsg('Error al desconectar') }
  }

  return (
    <ChannelCard icon="\ud83d\udcf8" name="Instagram DMs" desc="Mensajes directos de Instagram Business" color="#E1306C" connected={connected}>
      {connected && (
        <div style={{ background: C.surface, borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Page ID</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{ig.page_id}</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Instagram Page ID *" value={form.page_id} onChange={v => setForm(f => ({ ...f, page_id: v }))} placeholder="17841400000000000" mono />
          <Field label="Verify Token" value={form.verify_token} onChange={v => setForm(f => ({ ...f, verify_token: v }))} placeholder="mi_verify_token" />
        </div>
        <Field label="Access Token *" value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} placeholder="EAAxxxxxxxx..." mono />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'Guardando\u2026' : 'Guardar'}</Btn>
          {connected && <Btn variant="danger" small onClick={disconnect}>Desconectar</Btn>}
        </div>
      </div>
      <StatusMsg msg={msg} />
    </ChannelCard>
  )
}

// ─── Facebook ─────────────────────────────────────────────────────────────────
function FacebookCard({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [form, setForm] = useState({ page_id: '', access_token: '', verify_token: '' })
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('')
  const fb = status?.facebook; const connected = fb?.connected

  async function save() {
    if (!form.page_id || !form.access_token) { setMsg('Page ID y Access Token son obligatorios'); return }
    setSaving(true); setMsg('')
    try { const r = await api.post('/channels/facebook', form); setMsg('\u2713 ' + r.data.message); onRefresh() }
    catch (e: any) { setMsg('\u2717 ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }
  async function disconnect() {
    try { await api.delete('/channels/facebook'); onRefresh() }
    catch { setMsg('Error al desconectar') }
  }

  return (
    <ChannelCard icon="\ud83d\udcd8" name="Facebook Messenger" desc="Mensajes de tu p\u00e1gina de Facebook" color="#1877F2" connected={connected}>
      {connected && (
        <div style={{ background: C.surface, borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Page ID</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{fb.page_id}</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Facebook Page ID *" value={form.page_id} onChange={v => setForm(f => ({ ...f, page_id: v }))} placeholder="123456789" mono />
          <Field label="Verify Token" value={form.verify_token} onChange={v => setForm(f => ({ ...f, verify_token: v }))} placeholder="mi_verify_token" />
        </div>
        <Field label="Page Access Token *" value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} placeholder="EAAxxxxxxxx..." mono />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'Guardando\u2026' : 'Guardar'}</Btn>
          {connected && <Btn variant="danger" small onClick={disconnect}>Desconectar</Btn>}
        </div>
      </div>
      <StatusMsg msg={msg} />
    </ChannelCard>
  )
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
function TelegramCard({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const tg = status?.telegram; const connected = tg?.connected

  async function save() {
    if (!token.trim()) { setMsg('Pega el token del bot'); return }
    setSaving(true); setMsg('')
    try {
      const r = await api.post('/channels/telegram', { bot_token: token.trim() })
      setMsg('\u2713 ' + r.data.message)
      setToken(''); setStep(1)
      onRefresh()
    }
    catch (e: any) { setMsg('\u2717 ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }
  async function disconnect() {
    try { await api.delete('/channels/telegram'); onRefresh() }
    catch { setMsg('Error al desconectar') }
  }

  const stepBubble = (n: number): React.CSSProperties => ({
    width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: 12,
    background: step === n ? '#229ED9' : C.surface,
    color: step === n ? '#fff' : C.muted,
  })

  const stepBox = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px', borderRadius: 10,
    background: active ? 'rgba(34,158,217,0.12)' : C.surface,
    border: `1px solid ${active ? '#229ED9' : C.border}`,
  })

  return (
    <ChannelCard icon="\u2708\ufe0f" name="Telegram" desc="Conecta tu bot para recibir leads y notificaciones" color="#229ED9" connected={connected}>
      {connected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: C.surface, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>\ud83e\udd16</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#229ED9' }}>Bot conectado</div>
              {tg?.bot_username && <div style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>@{tg.bot_username}</div>}
            </div>
          </div>
          <Btn variant="danger" small onClick={disconnect}>Desconectar bot</Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            {([1, 2] as const).map(n => (
              <button key={n} onClick={() => setStep(n)} style={stepBubble(n)}>{n}</button>
            ))}
            <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>
              {step === 1 ? 'Crear tu bot en Telegram' : 'Pegar el token'}
            </span>
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={stepBox(true)}>
                <span style={{ fontSize: 20 }}>1\ufe0f\u20e3</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Abre Telegram y busca @BotFather</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>El bot oficial de Telegram para crear bots</div>
                </div>
              </div>
              <div style={stepBox(false)}>
                <span style={{ fontSize: 20 }}>2\ufe0f\u20e3</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Escribe /newbot y sigue los pasos</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Pon nombre y username (debe terminar en "bot")</div>
                </div>
              </div>
              <div style={stepBox(false)}>
                <span style={{ fontSize: 20 }}>3\ufe0f\u20e3</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Copia el token que te entrega @BotFather</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Se ve as\u00ed: 7123456789:AAF-xyz...</div>
                </div>
              </div>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center', padding: '11px 0', borderRadius: 10,
                  background: '#229ED9', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                }}
              >
                Abrir @BotFather en Telegram \u2192
              </a>
              <Btn onClick={() => setStep(2)}>Ya tengo mi token \u2192</Btn>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: C.muted }}>Pega el token que te dio @BotFather:</div>
              <Field label="Token del Bot *" value={token} onChange={setToken} placeholder="7123456789:AAF-xxxxxxxxxxxxxxxxxxx" mono />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.muted, cursor: 'pointer', fontSize: 12 }}
                >
                  \u2190 Atr\u00e1s
                </button>
                <Btn onClick={save} disabled={saving}>{saving ? 'Verificando\u2026' : 'Conectar bot'}</Btn>
              </div>
            </div>
          )}
          <StatusMsg msg={msg} />
        </div>
      )}
    </ChannelCard>
  )
}

// ─── TikTok ───────────────────────────────────────────────────────────────────
function TikTokCard({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [form, setForm] = useState({ app_id: '', app_secret: '', access_token: '' })
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('')
  const tk = status?.tiktok; const connected = tk?.connected

  async function save() {
    if (!form.app_id || !form.access_token) { setMsg('App ID y Access Token son obligatorios'); return }
    setSaving(true); setMsg('')
    try { const r = await api.post('/channels/tiktok', form); setMsg('\u2713 ' + r.data.message); onRefresh() }
    catch (e: any) { setMsg('\u2717 ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }
  async function disconnect() {
    try { await api.delete('/channels/tiktok'); onRefresh() }
    catch { setMsg('Error al desconectar') }
  }

  return (
    <ChannelCard icon="\ud83c\udfb5" name="TikTok Lead Gen" desc="Leads generados desde TikTok Ads y Business" color="#ff0050" connected={connected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="App ID *" value={form.app_id} onChange={v => setForm(f => ({ ...f, app_id: v }))} placeholder="7xxxxxxxxxx" mono />
          <Field label="App Secret" value={form.app_secret} onChange={v => setForm(f => ({ ...f, app_secret: v }))} placeholder="xxxxxxxxxxxx" mono />
        </div>
        <Field label="Access Token *" value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} placeholder="act.xxxxxxxxxx..." mono />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'Guardando\u2026' : 'Guardar'}</Btn>
          {connected && <Btn variant="danger" small onClick={disconnect}>Desconectar</Btn>}
        </div>
      </div>
      <StatusMsg msg={msg} />
    </ChannelCard>
  )
}

// ─── Shopify ──────────────────────────────────────────────────────────────────
function ShopifyCard({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [form, setForm] = useState({ shop_domain: '', access_token: '', webhook_secret: '' })
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('')
  const sh = status?.shopify; const connected = sh?.connected

  async function save() {
    if (!form.shop_domain || !form.access_token) { setMsg('Shop Domain y Access Token son obligatorios'); return }
    setSaving(true); setMsg('')
    try { const r = await api.post('/channels/shopify', form); setMsg('\u2713 ' + r.data.message); onRefresh() }
    catch (e: any) { setMsg('\u2717 ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }
  async function disconnect() {
    try { await api.delete('/channels/shopify'); onRefresh() }
    catch { setMsg('Error al desconectar') }
  }

  return (
    <ChannelCard icon="\ud83d\uded2" name="Shopify" desc="Conecta tu tienda Shopify para leads y pedidos" color="#96bf48" connected={connected}>
      {connected && (
        <div style={{ background: C.surface, borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Tienda</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{sh.shop_domain}</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Shop Domain *" value={form.shop_domain} onChange={v => setForm(f => ({ ...f, shop_domain: v }))} placeholder="mitienda.myshopify.com" mono />
        <Field label="Admin API Access Token *" value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} placeholder="shpat_xxxxxxxxxx..." mono />
        <Field label="Webhook Secret (opcional)" value={form.webhook_secret} onChange={v => setForm(f => ({ ...f, webhook_secret: v }))} placeholder="xxxxxxxxxxxx" mono />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'Guardando\u2026' : 'Guardar'}</Btn>
          {connected && <Btn variant="danger" small onClick={disconnect}>Desconectar</Btn>}
        </div>
      </div>
      <StatusMsg msg={msg} />
    </ChannelCard>
  )
}

// ─── Webchat ──────────────────────────────────────────────────────────────────
function WebchatCard({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [form, setForm] = useState({
    enabled: true, greeting: '', bot_name: '', color: '#00e5a0', system_prompt: ''
  })
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const wc = status?.webchat; const connected = wc?.connected

  useEffect(() => {
    if (wc) {
      setForm({
        enabled: wc.enabled ?? true,
        greeting: wc.greeting || '',
        bot_name: wc.bot_name || '',
        color: wc.color || '#00e5a0',
        system_prompt: wc.system_prompt || '',
      })
    }
  }, [wc])

  async function save() {
    setSaving(true); setMsg('')
    try { const r = await api.post('/channels/webchat', form); setMsg('\u2713 ' + r.data.message); onRefresh() }
    catch (e: any) { setMsg('\u2717 ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }

  const subdomain = (status as any)?.subdomain || 'osw'
  const snippet = `<script src="https://osw.conectaai.cl/widget.js" data-tenant="${subdomain}"></script>`

  function copySnippet() {
    navigator.clipboard.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <ChannelCard icon="\ud83d\udcbb" name="Webchat / Widget" desc="Widget de chat para tu sitio web con IA" color={C.accent} connected={connected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nombre del bot" value={form.bot_name} onChange={v => setForm(f => ({ ...f, bot_name: v }))} placeholder="Asistente" />
          <Field label="Color del widget" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="#00e5a0" />
        </div>
        <Field label="Saludo inicial" value={form.greeting} onChange={v => setForm(f => ({ ...f, greeting: v }))} placeholder="\u00a1Hola! \u00bfEn qu\u00e9 puedo ayudarte?" />
        <Field
          label="Instrucciones para la IA (productos, servicios, etc.)"
          value={form.system_prompt}
          onChange={v => setForm(f => ({ ...f, system_prompt: v }))}
          placeholder="Eres un asistente de ventas de [tu empresa]. Vendemos [productos]..."
          rows={4}
        />
        <Btn onClick={save} disabled={saving}>{saving ? 'Guardando\u2026' : 'Guardar configuraci\u00f3n'}</Btn>

        {connected && (
          <div style={{ background: C.surface, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>C\u00f3digo para tu web</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.accent, wordBreak: 'break-all', marginBottom: 8 }}>{snippet}</div>
            <Btn small onClick={copySnippet}>{copied ? '\u2713 Copiado!' : 'Copiar c\u00f3digo'}</Btn>
          </div>
        )}
      </div>
      <StatusMsg msg={msg} />
    </ChannelCard>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChannelsPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadStatus = useCallback(async () => {
    try {
      const r = await api.get('/channels/status')
      setStatus(r.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const connected = status ? [
    status.whatsapp?.connected,
    status.instagram?.connected,
    status.facebook?.connected,
    status.telegram?.connected,
    status.tiktok?.connected,
    status.shopify?.connected,
    status.webchat?.connected,
  ].filter(Boolean).length : 0

  return (
    <div style={{ padding: '32px 28px', maxWidth: 960, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: C.text, minHeight: '100vh', background: C.base }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Canales</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>
          Conecta tus canales de mensajer\u00eda.{' '}
          {!loading && <span style={{ color: C.accent }}>{connected} canal{connected !== 1 ? 'es' : ''} activo{connected !== 1 ? 's' : ''}</span>}
        </p>
      </div>

      {loading ? (
        <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', paddingTop: 80 }}>Cargando canales\u2026</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <WhatsAppCard status={status} onRefresh={loadStatus} />
          <InstagramCard status={status} onRefresh={loadStatus} />
          <FacebookCard status={status} onRefresh={loadStatus} />
          <TelegramCard status={status} onRefresh={loadStatus} />
          <TikTokCard status={status} onRefresh={loadStatus} />
          <ShopifyCard status={status} onRefresh={loadStatus} />
          <div style={{ gridColumn: '1 / -1' }}>
            <WebchatCard status={status} onRefresh={loadStatus} />
          </div>
        </div>
      )}
    </div>
  )
}
