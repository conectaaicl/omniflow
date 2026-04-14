'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

// Design tokens (matches OmniFlow dark theme)
const C = {
  base:    '#0f1117',
  surface: '#161b22',
  surface2:'#1e2530',
  border:  'rgba(255,255,255,0.08)',
  text:    '#f1f5f9',
  muted:   '#64748b',
  accent:  '#00e5a0',
  danger:  '#ef4444',
}

interface TemplateComponent { type: string; text?: string; format?: string }
interface Template {
  id: string; name: string; status: string
  language: string; category: string; components: TemplateComponent[]
}
interface Conversation {
  id: number; channel: string
  contact: { name: string; phone: string }
}

const CATEGORY_COLOR: Record<string, string> = {
  MARKETING: '#7c3aed', UTILITY: '#0ea5e9', AUTHENTICATION: '#f59e0b',
}
const STATUS_COLOR: Record<string, string> = {
  APPROVED: '#059669', PENDING: '#d97706', REJECTED: '#dc2626', PAUSED: '#6b7280',
}
const LANG_LABEL: Record<string, string> = {
  es: 'Español', en_US: 'English (US)', pt_BR: 'Português (BR)',
  en: 'English', fr: 'Français', de: 'Deutsch',
}

function getBodyText(tpl: Template) {
  return tpl.components.find(c => c.type === 'BODY')?.text || ''
}
function getHeaderText(tpl: Template) {
  const h = tpl.components.find(c => c.type === 'HEADER')
  return h?.format === 'TEXT' ? (h.text || '') : ''
}
function getFooterText(tpl: Template) {
  return tpl.components.find(c => c.type === 'FOOTER')?.text || ''
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 12,
      background: ok ? '#059669' : '#dc2626',
      color: '#fff', fontWeight: 600, fontSize: 13,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {ok ? '✓' : '✕'} {msg}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.3px',
      background: color + '22', color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  )
}

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: C.muted,
            cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text', rows, hint, required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; rows?: number; hint?: string; required?: boolean
}) {
  const base: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: C.base,
    border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, fontSize: 13, outline: 'none',
    resize: rows ? 'vertical' : undefined, boxSizing: 'border-box',
  }
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 5, fontWeight: 500 }}>
        {label}{required && <span style={{ color: C.accent }}> *</span>}
      </label>
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={base} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />
      }
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Select({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; required?: boolean
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 5, fontWeight: 500 }}>
        {label}{required && <span style={{ color: C.accent }}> *</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '9px 12px', background: C.base,
        border: `1px solid ${C.border}`, borderRadius: 8,
        color: C.text, fontSize: 13, outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Btn({ children, onClick, disabled, variant = 'primary', small }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  variant?: 'primary' | 'ghost' | 'danger'; small?: boolean
}) {
  const bg = variant === 'primary' ? C.accent : variant === 'danger' ? C.danger : C.surface2
  const fg = variant === 'primary' ? '#000' : C.text
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '6px 14px' : '9px 18px',
      background: disabled ? C.surface2 : bg,
      color: disabled ? C.muted : fg,
      border: `1px solid ${variant === 'ghost' ? C.border : 'transparent'}`,
      borderRadius: 8, fontWeight: 600, fontSize: small ? 12 : 13,
      cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  )
}

// Use Template Modal
function UseTemplateModal({ template, conversations, onClose, onNotify }: {
  template: Template; conversations: Conversation[]
  onClose: () => void; onNotify: (msg: string, ok: boolean) => void
}) {
  const [mode, setMode] = useState<'conv' | 'number'>('conv')
  const [convId, setConvId] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)

  const waConvs = conversations.filter(c => c.channel === 'whatsapp')
  const body = getBodyText(template)
  const header = getHeaderText(template)
  const footer = getFooterText(template)

  async function send() {
    setSending(true)
    try {
      if (mode === 'conv') {
        if (!convId) { onNotify('Selecciona una conversación', false); setSending(false); return }
        await api.post('/conversations/whatsapp-templates/send', {
          conversation_id: Number(convId),
          template_name: template.name,
          language_code: template.language,
        })
      } else {
        if (!phone.trim()) { onNotify('Ingresa un número de teléfono', false); setSending(false); return }
        await api.post('/conversations/whatsapp-templates/send-to-number', {
          phone_number: phone.trim(),
          template_name: template.name,
          language_code: template.language,
        })
      }
      onNotify('Plantilla enviada correctamente', true)
      onClose()
    } catch (e: any) {
      onNotify(e.response?.data?.detail || 'Error al enviar', false)
    } finally { setSending(false) }
  }

  return (
    <Modal title={`Usar: ${template.name}`} onClose={onClose}>
      <div style={{
        background: C.base, borderRadius: 10, padding: '14px 16px',
        marginBottom: 20, border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Vista previa
        </div>
        {header && <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 6 }}>{header}</div>}
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</div>
        {footer && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>{footer}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <Badge label={template.category} color={CATEGORY_COLOR[template.category] || C.muted} />
          <Badge label={LANG_LABEL[template.language] || template.language} color={C.muted} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['conv', 'number'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: mode === m ? C.accent : C.surface2,
            color: mode === m ? '#000' : C.muted,
          }}>
            {m === 'conv' ? 'Conversación existente' : 'Número manual'}
          </button>
        ))}
      </div>

      {mode === 'conv' ? (
        <div>
          <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 5, fontWeight: 500 }}>
            Conversación de WhatsApp <span style={{ color: C.accent }}>*</span>
          </label>
          {waConvs.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, padding: '10px 12px', background: C.base, borderRadius: 8 }}>
              No hay conversaciones de WhatsApp activas. Usa "Número manual".
            </div>
          ) : (
            <select value={convId} onChange={e => setConvId(e.target.value)} style={{
              width: '100%', padding: '9px 12px', background: C.base,
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: convId ? C.text : C.muted, fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}>
              <option value="">— Selecciona un contacto —</option>
              {waConvs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.contact.name || 'Sin nombre'} · {c.contact.phone || 'Sin teléfono'}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <Field
          label="Número de WhatsApp" value={phone} onChange={setPhone}
          placeholder="+56912345678"
          hint="Incluye el código de país (ej. +56 para Chile)"
          required
        />
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={send} disabled={sending}>
          {sending ? 'Enviando…' : '▶  Enviar plantilla'}
        </Btn>
      </div>
    </Modal>
  )
}

// Create Template Modal
function CreateTemplateModal({ onClose, onCreated, onNotify }: {
  onClose: () => void; onCreated: () => void; onNotify: (msg: string, ok: boolean) => void
}) {
  const [form, setForm] = useState({
    name: '', category: 'MARKETING', language: 'es',
    header_text: '', body_text: '', footer_text: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [exampleParams, setExampleParams] = useState<string[]>([])

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const varCount = Array.from(form.body_text.matchAll(/\{\{(\d+)\}\}/g)).length
  useEffect(() => {
    setExampleParams(prev => {
      const next = [...prev]
      while (next.length < varCount) next.push('')
      return next.slice(0, varCount)
    })
  }, [varCount])

  async function handleCreate() {
    if (!form.name.trim()) { setErr('El nombre es obligatorio'); return }
    if (!form.body_text.trim()) { setErr('El cuerpo del mensaje es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const r = await api.post('/conversations/whatsapp-templates', {
        ...form,
        name: form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        example_body_params: exampleParams.filter(Boolean),
      })
      onNotify(`Plantilla "${r.data.name}" enviada a revisión de Meta`, true)
      onCreated()
      onClose()
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Error al crear plantilla')
    } finally { setSaving(false) }
  }

  const CATEGORIES = [
    { value: 'MARKETING',      label: 'Marketing — Promociones y ofertas' },
    { value: 'UTILITY',        label: 'Utilidad — Confirmaciones y actualizaciones' },
    { value: 'AUTHENTICATION', label: 'Autenticación — OTPs y verificaciones' },
  ]
  const LANGUAGES = [
    { value: 'es',    label: 'Español (es)' },
    { value: 'en_US', label: 'English — US (en_US)' },
    { value: 'pt_BR', label: 'Português — Brasil (pt_BR)' },
    { value: 'fr',    label: 'Français (fr)' },
    { value: 'de',    label: 'Deutsch (de)' },
  ]

  const previewBody = form.body_text.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) =>
    exampleParams[Number(n) - 1] || `[var${n}]`
  )

  return (
    <Modal title="Nueva plantilla de WhatsApp" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {err && (
          <div style={{
            background: '#450a0a', border: '1px solid #7f1d1d',
            color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 13,
          }}>{err}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field
            label="Nombre" value={form.name} onChange={set('name')}
            placeholder="confirmacion_pedido" required
            hint="Solo letras, números y guiones bajos"
          />
          <Select label="Idioma" value={form.language} onChange={set('language')} options={LANGUAGES} required />
        </div>

        <Select label="Categoría" value={form.category} onChange={set('category')} options={CATEGORIES} required />

        <Field
          label="Encabezado (opcional)" value={form.header_text} onChange={set('header_text')}
          placeholder="Confirmación de tu pedido"
          hint="Texto en negrita sobre el cuerpo del mensaje"
        />

        <Field
          label="Cuerpo del mensaje" value={form.body_text} onChange={set('body_text')}
          placeholder="Hola {{1}}, tu pedido {{2}} está confirmado y será entregado el {{3}}."
          rows={4} required
          hint="Usa {{1}}, {{2}}, etc. para variables dinámicas"
        />

        {varCount > 0 && (
          <div style={{ background: C.base, borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 500 }}>
              Ejemplos de variables (requeridos por Meta para aprobación)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exampleParams.map((val, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.accent, fontFamily: 'monospace', minWidth: 32 }}>
                    {`{{${i + 1}}}`}
                  </span>
                  <input
                    value={val}
                    onChange={e => {
                      const next = [...exampleParams]; next[i] = e.target.value
                      setExampleParams(next)
                    }}
                    placeholder={`Ejemplo para variable ${i + 1}`}
                    style={{
                      flex: 1, padding: '7px 10px', background: C.surface2,
                      border: `1px solid ${C.border}`, borderRadius: 6,
                      color: C.text, fontSize: 12, outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Field
          label="Pie de página (opcional)" value={form.footer_text} onChange={set('footer_text')}
          placeholder="Gracias por tu confianza"
          hint="Texto pequeño al final del mensaje"
        />

        {form.body_text && (
          <div style={{ background: C.base, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vista previa
            </div>
            {form.header_text && (
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 6 }}>{form.header_text}</div>
            )}
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{previewBody}</div>
            {form.footer_text && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>{form.footer_text}</div>
            )}
          </div>
        )}

        <div style={{
          background: '#1a2a1a', border: '1px solid #2a4a2a',
          borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#86efac',
        }}>
          ℹ️ Meta revisará la plantilla antes de aprobarla. <strong>Marketing</strong>: hasta 24h. <strong>Utilidad</strong> y <strong>Autenticación</strong>: normalmente minutos.
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handleCreate} disabled={saving}>
            {saving ? 'Enviando a Meta…' : '+ Crear plantilla'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

// Template Row
function TemplateRow({ tpl, onUse }: { tpl: Template; onUse: (t: Template) => void }) {
  const [expanded, setExpanded] = useState(false)
  const body = getBodyText(tpl)
  const header = getHeaderText(tpl)
  const footer = getFooterText(tpl)

  return (
    <>
      <tr onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}>
        <td style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.text, fontFamily: 'monospace' }}>{tpl.name}</div>
          {!expanded && body && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3, maxWidth: 340,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {body}
            </div>
          )}
        </td>
        <td style={{ padding: '14px 16px' }}>
          <Badge label={tpl.category} color={CATEGORY_COLOR[tpl.category] || C.muted} />
        </td>
        <td style={{ padding: '14px 16px', fontSize: 12, color: C.muted }}>
          {LANG_LABEL[tpl.language] || tpl.language}
        </td>
        <td style={{ padding: '14px 16px' }}>
          <Badge label={tpl.status} color={STATUS_COLOR[tpl.status] || C.muted} />
        </td>
        <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
          {tpl.status === 'APPROVED' && (
            <Btn small onClick={() => onUse(tpl)}>Usar plantilla</Btn>
          )}
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
          <td colSpan={5} style={{ padding: '0 16px 16px 16px' }}>
            <div style={{
              background: C.base, borderRadius: 8, padding: '14px 16px',
              border: `1px solid ${C.border}`, marginTop: 4,
            }}>
              {header && <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 6 }}>{header}</div>}
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{body}</div>
              {footer && <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>{footer}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// Main Page
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [useModal, setUseModal] = useState<Template | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL')

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const loadTemplates = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await api.get('/conversations/whatsapp-templates')
      setTemplates(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'No se pudieron cargar las plantillas')
    } finally { setLoading(false) }
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      const r = await api.get('/conversations/')
      setConversations(r.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadTemplates(); loadConversations() }, [loadTemplates, loadConversations])

  const filtered = filter === 'ALL' ? templates : templates.filter(t => t.status === filter)
  const counts = {
    ALL:      templates.length,
    APPROVED: templates.filter(t => t.status === 'APPROVED').length,
    PENDING:  templates.filter(t => t.status === 'PENDING').length,
    REJECTED: templates.filter(t => t.status === 'REJECTED').length,
  }

  return (
    <div style={{
      padding: '32px 28px', maxWidth: 1080, margin: '0 auto',
      fontFamily: 'Inter, system-ui, sans-serif', color: C.text,
      minHeight: '100vh', background: C.base,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>
            Plantillas WhatsApp
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
            Gestiona tus plantillas aprobadas por Meta y crea nuevas para campañas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={loadTemplates} disabled={loading} small>
            {loading ? '⟳  Cargando…' : '⟳  Actualizar'}
          </Btn>
          <Btn onClick={() => setShowCreate(true)}>+ Crear plantilla</Btn>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? C.surface2 : C.surface,
            border: `1px solid ${filter === s ? C.accent + '55' : C.border}`,
            borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: filter === s ? C.accent : C.text }}>{counts[s]}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {s === 'ALL' ? 'Total' : s === 'APPROVED' ? 'Aprobadas' : s === 'PENDING' ? 'Pendientes' : 'Rechazadas'}
            </div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
          padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
        }}>
          {['Nombre / Contenido', 'Categoría', 'Idioma', 'Estado', ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 600, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.5px', paddingRight: i < 4 ? 20 : 0,
            }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⟳</div>
            Cargando plantillas desde Meta…
          </div>
        ) : error ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
            <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>
            <Btn variant="ghost" small onClick={loadTemplates}>Reintentar</Btn>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 4 }}>
              {filter === 'ALL' ? 'No hay plantillas en este WABA' : `Sin plantillas con estado ${filter}`}
            </div>
            {filter === 'ALL' && (
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                Crea tu primera plantilla para enviar mensajes proactivos
              </div>
            )}
            {filter === 'ALL' && <Btn onClick={() => setShowCreate(true)}>+ Crear primera plantilla</Btn>}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {filtered.map(tpl => (
                <TemplateRow key={tpl.id} tpl={tpl} onUse={t => setUseModal(t)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && templates.length > 0 && (
        <p style={{ fontSize: 12, color: C.muted, marginTop: 16, textAlign: 'center' }}>
          Datos en tiempo real desde Meta Business API · Haz clic en una fila para ver el contenido completo
        </p>
      )}

      {useModal && (
        <UseTemplateModal
          template={useModal} conversations={conversations}
          onClose={() => setUseModal(null)} onNotify={notify}
        />
      )}
      {showCreate && (
        <CreateTemplateModal onClose={() => setShowCreate(false)} onCreated={loadTemplates} onNotify={notify} />
      )}
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}
