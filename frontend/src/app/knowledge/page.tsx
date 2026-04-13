'use client'

import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'

const C = {
  base: '#0a0b0d', card: '#161a22', surface: '#111318',
  border: 'rgba(255,255,255,0.07)', accent: '#00e5a0',
  text: '#e2e8f0', muted: '#64748b', danger: '#f87171',
}

function Btn({ onClick, children, variant = 'primary', disabled = false }: {
  onClick?: () => void; children: React.ReactNode
  variant?: 'primary' | 'danger' | 'ghost'; disabled?: boolean
}) {
  const bg = variant === 'primary' ? C.accent : variant === 'danger' ? C.danger : 'transparent'
  const fg = variant === 'primary' ? '#000' : variant === 'danger' ? '#fff' : C.muted
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#1e2330' : bg, color: disabled ? C.muted : fg,
      border: variant === 'ghost' ? `1px solid ${C.border}` : 'none',
      borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>{children}</button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</div>
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
      width: '100%', boxSizing: 'border-box', background: '#0d1017',
      border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px',
      fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit',
    }} />
  )
}

function Textarea({ value, onChange, placeholder, rows = 5 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{
      width: '100%', boxSizing: 'border-box', background: '#0d1017',
      border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px',
      fontSize: 13, color: C.text, resize: 'vertical', fontFamily: 'inherit', outline: 'none',
    }} />
  )
}

function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null
  const ok = msg.startsWith('✓')
  return (
    <div style={{ marginTop: 10, padding: '9px 14px', background: ok ? '#00e5a015' : '#f8717115', borderRadius: 8, fontSize: 13, color: ok ? C.accent : C.danger }}>
      {msg}
    </div>
  )
}

interface Doc { id: number; tipo: string; titulo: string; fuente_url: string | null; preview: string; created_at: string }

const TIPO_ICON: Record<string, string> = { texto: '📝', pdf: '📄', url: '🌐' }

export default function ConocimientoPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'texto' | 'pdf' | 'url'>('texto')
  const [deleting, setDeleting] = useState<number | null>(null)

  // Texto
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [savingText, setSavingText] = useState(false)
  const [textMsg, setTextMsg] = useState('')

  // PDF
  const [pdfTitulo, setPdfTitulo] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [savingPdf, setSavingPdf] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // URL
  const [url, setUrl] = useState('')
  const [urlTitulo, setUrlTitulo] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const [urlMsg, setUrlMsg] = useState('')

  useEffect(() => { fetchDocs() }, [])

  async function fetchDocs() {
    setLoading(true)
    try { const r = await api.get('/knowledge'); setDocs(r.data) }
    catch { setDocs([]) }
    setLoading(false)
  }

  async function saveText() {
    if (!titulo.trim() || !contenido.trim()) { setTextMsg('Completa todos los campos.'); return }
    setSavingText(true); setTextMsg('')
    try {
      const r = await api.post('/knowledge/text', { titulo, contenido })
      setTextMsg(`✓ Guardado: ${r.data.saved_chunks} chunk(s)`)
      setTitulo(''); setContenido(''); fetchDocs()
    } catch (e: any) { setTextMsg('Error: ' + (e.response?.data?.detail || e.message)) }
    finally { setSavingText(false) }
  }

  async function savePdf() {
    if (!pdfTitulo.trim() || !pdfFile) { setPdfMsg('Selecciona un PDF y escribe el título.'); return }
    setSavingPdf(true); setPdfMsg('')
    const form = new FormData()
    form.append('titulo', pdfTitulo)
    form.append('file', pdfFile)
    try {
      const r = await api.post('/knowledge/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPdfMsg(`✓ Procesado: ${r.data.saved_chunks} chunk(s), ${r.data.pages} página(s)`)
      setPdfTitulo(''); setPdfFile(null)
      if (fileRef.current) fileRef.current.value = ''
      fetchDocs()
    } catch (e: any) { setPdfMsg('Error: ' + (e.response?.data?.detail || e.message)) }
    finally { setSavingPdf(false) }
  }

  async function saveUrl() {
    if (!url.trim()) { setUrlMsg('Ingresa una URL.'); return }
    setSavingUrl(true); setUrlMsg('')
    try {
      const params = new URLSearchParams({ url })
      if (urlTitulo.trim()) params.append('titulo', urlTitulo)
      const r = await api.post(`/knowledge/url?${params}`)
      setUrlMsg(`✓ Indexado: ${r.data.saved_chunks} chunk(s) — "${r.data.titulo}"`)
      setUrl(''); setUrlTitulo(''); fetchDocs()
    } catch (e: any) { setUrlMsg('Error: ' + (e.response?.data?.detail || e.message)) }
    finally { setSavingUrl(false) }
  }

  async function deleteDoc(id: number) {
    if (!confirm('¿Eliminar este documento del conocimiento del asistente?')) return
    setDeleting(id)
    try { await api.delete(`/knowledge/${id}`); setDocs(prev => prev.filter(d => d.id !== id)) }
    catch {}
    setDeleting(null)
  }

  const TABS = [
    { key: 'texto' as const, label: '📝 Texto libre' },
    { key: 'pdf' as const, label: '📄 PDF' },
    { key: 'url' as const, label: '🌐 URL / Sitio web' },
  ]

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: C.text, minHeight: '100vh', background: C.base }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>IA & Conocimiento</h1>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
        Entrena el asistente de IA con información de tu negocio. El contenido se convierte en vectores
        semánticos e inyecta contexto relevante en cada conversación de WhatsApp automáticamente.
      </p>

      {/* Add Knowledge */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 18 }}>Agregar conocimiento</div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tab === t.key ? C.accent + '18' : 'transparent',
              color: tab === t.key ? C.accent : C.muted,
              border: tab === t.key ? `1px solid ${C.accent}40` : '1px solid transparent',
              borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Texto */}
        {tab === 'texto' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><Label>Título</Label><Input value={titulo} onChange={setTitulo} placeholder="Ej: Precios servicios, FAQ, Horarios de atención…" /></div>
            <div>
              <Label>Contenido</Label>
              <Textarea value={contenido} onChange={setContenido} rows={6}
                placeholder="Escribe o pega el texto. FAQs, productos, precios, políticas, horarios — cualquier información que el asistente debe conocer." />
            </div>
            <div><Btn onClick={saveText} disabled={savingText}>{savingText ? 'Guardando…' : 'Guardar texto'}</Btn></div>
            <StatusMsg msg={textMsg} />
          </div>
        )}

        {/* PDF */}
        {tab === 'pdf' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><Label>Título del documento</Label><Input value={pdfTitulo} onChange={setPdfTitulo} placeholder="Ej: Catálogo 2025, Manual de servicios…" /></div>
            <div>
              <Label>Archivo PDF</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input ref={fileRef} type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  style={{ fontSize: 13, color: C.muted }} />
                {pdfFile && <span style={{ fontSize: 12, color: C.muted }}>{pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)</span>}
              </div>
            </div>
            <div><Btn onClick={savePdf} disabled={savingPdf}>{savingPdf ? 'Procesando PDF…' : 'Subir y procesar'}</Btn></div>
            <StatusMsg msg={pdfMsg} />
          </div>
        )}

        {/* URL */}
        {tab === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><Label>URL del sitio web</Label><Input value={url} onChange={setUrl} placeholder="https://tuempresa.cl/servicios" /></div>
            <div><Label>Título (opcional)</Label><Input value={urlTitulo} onChange={setUrlTitulo} placeholder="Se detecta automáticamente si está vacío" /></div>
            <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b25', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#f59e0b' }}>
              Se indexan hasta 20 secciones del sitio. Funciona mejor con páginas públicas sin login.
            </div>
            <div><Btn onClick={saveUrl} disabled={savingUrl}>{savingUrl ? 'Scrapeando sitio…' : 'Indexar URL'}</Btn></div>
            <StatusMsg msg={urlMsg} />
          </div>
        )}
      </div>

      {/* Documents List */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Base de conocimiento</div>
          <span style={{ fontSize: 12, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '3px 10px' }}>
            {docs.length} documento{docs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 36, color: C.muted, fontSize: 13 }}>Cargando…</div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36, color: C.muted, fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🧠</div>
            Base vacía. Agrega texto, PDFs o URLs para entrenar al asistente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {docs.map(doc => (
              <div key={doc.id} style={{ background: C.surface, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 18, marginTop: 2, flexShrink: 0 }}>{TIPO_ICON[doc.tipo] || '📎'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{doc.titulo}</div>
                  <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.preview}…
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, background: C.accent + '18', color: C.accent, border: `1px solid ${C.accent}30`, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                      ✓ Entrenado
                    </span>
                    <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{doc.tipo}</span>
                    {doc.fuente_url && (
                      <span style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{doc.fuente_url}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteDoc(doc.id)} disabled={deleting === doc.id}
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: '2px 4px', flexShrink: 0 }}
                  title="Eliminar documento">
                  {deleting === doc.id ? '⏳' : '🗑'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
