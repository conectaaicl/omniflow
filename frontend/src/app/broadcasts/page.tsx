'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

function Notif({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,padding:'12px 20px',borderRadius:12,
      background:ok?'#059669':'#dc2626',color:'white',fontWeight:600,fontSize:13,
      boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
      {msg}
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:   { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  sending: { label: 'Enviando', color: 'bg-blue-100 text-blue-700' },
  sent:    { label: 'Enviado',  color: 'bg-green-100 text-green-700' },
  done:    { label: 'Enviado',  color: 'bg-green-100 text-green-700' },
  failed:  { label: 'Error',    color: 'bg-red-100 text-red-700' },
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp:  'WhatsApp',
  instagram: 'Instagram',
  facebook:  'Facebook',
  email:     'Email',
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [notif, setNotif] = useState<{ msg: string; ok: boolean } | null>(null)
  const [sending, setSending] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', message: '', channel: 'whatsapp',
    filter_tag: '',
    segment_tags: '', segment_min_score: '', segment_source: '',
  })
  const [formErr, setFormErr] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const notify = (msg: string, ok = true) => {
    setNotif({ msg, ok })
    setTimeout(() => setNotif(null), 3500)
  }

  const load = useCallback(async () => {
    try {
      const r = await api.get('/broadcasts')
      setBroadcasts(r.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim()) { setFormErr('Nombre y mensaje son requeridos'); return }
    setFormSaving(true); setFormErr('')
    try {
      await api.post('/broadcasts', {
        name: form.name,
        message: form.message,
        channel: form.channel,
        filter_tag: form.filter_tag || null,
        segment_tags: form.segment_tags ? form.segment_tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
        segment_min_score: form.segment_min_score ? Number(form.segment_min_score) : null,
        segment_source: form.segment_source || null,
      })
      setForm({ name: '', message: '', channel: 'whatsapp', filter_tag: '', segment_tags: '', segment_min_score: '', segment_source: '' })
      setShowForm(false)
      notify('Campaña creada')
      load()
    } catch { setFormErr('Error al crear campaña') }
    finally { setFormSaving(false) }
  }

  const handleSend = async (b: any) => {
    if (!window.confirm(`¿Enviar "${b.name}" a ${b.recipient_count ?? 'todos los'} contactos?`)) return
    setSending(b.id)
    try {
      await api.post(`/broadcasts/${b.id}/send`)
      notify('Envío iniciado')
      load()
    } catch { notify('Error al enviar', false) }
    finally { setSending(null) }
  }

  const handleDelete = async (b: any) => {
    if (!window.confirm('¿Eliminar esta campaña?')) return
    try {
      await api.delete(`/broadcasts/${b.id}`)
      notify('Eliminada')
      load()
    } catch { notify('Error al eliminar', false) }
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {notif && <Notif msg={notif.msg} ok={notif.ok} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Broadcasts Masivos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Envía campañas segmentadas a tus contactos por WhatsApp, Instagram, Facebook o Email</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition">
          + Nueva campaña
        </button>
      </div>

      <div className="p-8 space-y-6">

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Nueva campaña</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {formErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formErr}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Nombre</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ej: Promo Abril 2026"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Canal</label>
                <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-violet-400">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram DM</option>
                  <option value="facebook">Facebook Messenger</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Mensaje</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={4} placeholder="Hola, tenemos una oferta especial para ti..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 resize-none" />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Segmentación (opcional)</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Etiqueta / Campaña</label>
                  <input value={form.filter_tag} onChange={e => setForm(f => ({ ...f, filter_tag: e.target.value }))}
                    placeholder="Dejar vacío = todos" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Tags (coma separados)</label>
                  <input value={form.segment_tags} onChange={e => setForm(f => ({ ...f, segment_tags: e.target.value }))}
                    placeholder="vip, cliente" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Score mínimo</label>
                  <input type="number" min={0} max={100} value={form.segment_min_score}
                    onChange={e => setForm(f => ({ ...f, segment_min_score: e.target.value }))}
                    placeholder="ej: 50" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Canal de origen</label>
                  <select value={form.segment_source} onChange={e => setForm(f => ({ ...f, segment_source: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-violet-400">
                    <option value="">Todos</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="webchat">Web Chat</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={formSaving}
                className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50">
                {formSaving ? 'Creando...' : 'Crear campaña'}
              </button>
            </div>
          </form>
        )}

        {/* Stats */}
        {broadcasts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total campañas', value: broadcasts.length },
              { label: 'Enviadas', value: broadcasts.filter(b => b.status === 'sent' || b.status === 'done').length },
              { label: 'Contactos alcanzados', value: broadcasts.reduce((s, b) => s + (b.sent_count || 0), 0) },
              { label: 'En borrador', value: broadcasts.filter(b => b.status === 'draft').length },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="text-2xl font-bold text-violet-700">{s.value.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12 text-gray-400 text-sm">Cargando...</div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4 opacity-30">📢</div>
            <p className="font-semibold text-gray-600">Sin campañas aún</p>
            <p className="text-sm mt-1">Crea tu primera campaña masiva y llega a todos tus contactos en segundos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => {
              const cfg = STATUS_LABELS[b.status] || STATUS_LABELS.draft
              const segTags: string[] = (() => { try { return JSON.parse(b.segment_tags || '[]') } catch { return [] } })()
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[10px] text-gray-400 capitalize">{CHANNEL_LABELS[b.channel] || b.channel}</span>
                        {b.filter_tag && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">{b.filter_tag}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{b.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{b.message}</p>
                    </div>
                    <div className="flex-shrink-0 text-right text-xs text-gray-500">
                      <div>{b.sent_count || 0} / {b.recipient_count || '—'} enviados</div>
                      {b.failed_count > 0 && <div className="text-red-400">{b.failed_count} fallidos</div>}
                      {b.sent_at && <div className="text-[10px] text-gray-400 mt-0.5">{new Date(b.sent_at).toLocaleDateString('es-CL')}</div>}
                    </div>
                  </div>
                  {(segTags.length > 0 || b.segment_min_score || b.segment_source) && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {segTags.map((t: string) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full">#{t}</span>
                      ))}
                      {b.segment_min_score && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">Score ≥ {b.segment_min_score}</span>}
                      {b.segment_source && <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{b.segment_source}</span>}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
                    {b.status === 'draft' && (
                      <button onClick={() => handleSend(b)} disabled={sending === b.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-50">
                        {sending === b.id ? 'Enviando...' : '▶ Enviar ahora'}
                      </button>
                    )}
                    {b.status === 'sending' && (
                      <span className="text-xs text-blue-600 font-semibold px-3 py-1.5">Enviando…</span>
                    )}
                    <button onClick={() => handleDelete(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
