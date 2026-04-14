'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { conversationsAPI, usersAPI } from '@/lib/api'
import {
  Send, Search, RefreshCw, Bot, UserCheck, MessageSquare, X,
  ChevronRight, Zap, Image, FileText, Users, Plus, Trash2,
  Upload, Layout
} from 'lucide-react'

interface Contact {
  id: number; name: string; phone: string; email?: string
  lead_score: number; intent: string
  ip_address?: string; external_id?: string
}
interface Conv {
  id: number; channel: string; status: string
  last_message: string; updated_at: string
  bot_active: boolean; notes?: string; assigned_to?: number | null
  contact: Contact
}
interface Message {
  id: number; sender_type: string; content: string
  content_type?: string; media_url?: string; timestamp: string
}
interface CannedResponse {
  id: number; shortcut: string; title: string; content: string
}
interface Agent {
  id: number; full_name: string; email: string
}
interface WaTemplate {
  id: string; name: string; status: string; language: string; category: string
  components: Array<{ type: string; text?: string; buttons?: unknown[] }>
}

const CH_COLOR: Record<string, string> = {
  whatsapp: '#25d366', instagram: '#e1306c',
  facebook: '#1877f2', web: '#7c3aed', webchat: '#7c3aed',
}
const CH_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram',
  facebook: 'Facebook', web: 'Web Chat', webchat: 'Web Chat',
}
const CH_EMOJI: Record<string, string> = {
  whatsapp: '💬', instagram: '📸', facebook: '🔵',
  web: '💻', webchat: '💻',
}

function scoreColor(s: number) {
  if (s >= 70) return { bg: 'rgba(16,185,129,0.12)', text: '#34d399' }
  if (s >= 40) return { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' }
  return { bg: 'rgba(255,255,255,0.05)', text: '#64748b' }
}

function relativeTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'ahora'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  } catch { return '' }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conv[]>([])
  const [filtered, setFiltered] = useState<Conv[]>([])
  const [selected, setSelected] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'bot' | 'human' | 'closed'>('all')
  const [filterCh, setFilterCh] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [handoffLoading, setHandoffLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(true)

  // New features state
  const [agents, setAgents] = useState<Agent[]>([])
  const [canned, setCanned] = useState<CannedResponse[]>([])
  const [notes, setNotes] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templates, setTemplates] = useState<WaTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [showCannedManager, setShowCannedManager] = useState(false)
  const [newCanned, setNewCanned] = useState({ shortcut: '', title: '', content: '' })
  const [cannedSuggestions, setCannedSuggestions] = useState<CannedResponse[]>([])
  const [sideTab, setSideTab] = useState<'info' | 'canned'>('info')
  const [sentIds, setSentIds] = useState<Set<number>>(new Set())
  const [showNewMsgModal, setShowNewMsgModal] = useState(false)
  const [newMsgPhone, setNewMsgPhone] = useState('')
  const [newMsgTemplate, setNewMsgTemplate] = useState('')
  const [newMsgSending, setNewMsgSending] = useState(false)
  const [newMsgMsg, setNewMsgMsg] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadConversations = () => {
    conversationsAPI.list()
      .then(r => { setConversations(r.data); setFiltered(r.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadConversations()
    const iv = setInterval(loadConversations, 15000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    usersAPI.list().then(r => setAgents(r.data)).catch(() => {})
    conversationsAPI.getCannedResponses().then(r => setCanned(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setNotes(selected.notes || '')
    const poll = setInterval(() => {
      conversationsAPI.getMessages(selected.id).then(r => setMessages(r.data)).catch(() => {})
    }, 5000)
    conversationsAPI.getMessages(selected.id).then(r => setMessages(r.data)).catch(() => {})
    return () => clearInterval(poll)
  }, [selected])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let list = conversations
    if (filterTab === 'bot') list = list.filter(c => c.bot_active !== false)
    if (filterTab === 'human') list = list.filter(c => c.bot_active === false)
    if (filterTab === 'closed') list = list.filter(c => c.status === 'closed')
    if (filterCh !== 'all') list = list.filter(c => c.channel === filterCh)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.contact.name.toLowerCase().includes(q) ||
        c.contact.phone?.includes(q) ||
        c.last_message?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [search, conversations, filterTab, filterCh])

  // Canned response autocomplete
  useEffect(() => {
    if (input.startsWith('/') && input.length > 1) {
      const q = input.slice(1).toLowerCase()
      setCannedSuggestions(canned.filter(c =>
        c.shortcut.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
      ).slice(0, 5))
    } else {
      setCannedSuggestions([])
    }
  }, [input, canned])

  const handleHandoff = async () => {
    if (!selected || handoffLoading) return
    setHandoffLoading(true)
    const newBotActive = !(selected.bot_active !== false)
    try {
      await conversationsAPI.toggleHandoff(selected.id, newBotActive)
      const updated = { ...selected, bot_active: newBotActive }
      setSelected(updated)
      setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, bot_active: newBotActive } : c))
      setFiltered(prev => prev.map(c => c.id === selected.id ? { ...c, bot_active: newBotActive } : c))
    } catch (e) { console.error(e) }
    finally { setHandoffLoading(false) }
  }

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val)
    if (!selected) return
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(() => {
      conversationsAPI.saveNotes(selected.id, val).catch(console.error)
    }, 800)
  }, [selected])

  const handleAssign = async (userId: number | null) => {
    if (!selected) return
    try {
      await conversationsAPI.assign(selected.id, userId)
      const updated = { ...selected, assigned_to: userId }
      setSelected(updated)
      setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, assigned_to: userId } : c))
    } catch (e) { console.error(e) }
  }

  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    try {
      await conversationsAPI.send(selected.id, input.trim())
      setInput('')
      const r = await conversationsAPI.getMessages(selected.id)
      setMessages(r.data)
      const _outgoing = r.data.filter((m: Message) => m.sender_type === 'human' || m.sender_type === 'agent')
      const _lastSent = _outgoing[_outgoing.length - 1]
      if (_lastSent) setSentIds(prev => { const n = new Set(prev); n.add(_lastSent.id); return n })
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const handleSendImage = async () => {
    if (!imageUrl.trim() || !selected || sending) return
    setSending(true)
    try {
      await conversationsAPI.send(selected.id, imageCaption || '', 'image', imageUrl.trim())
      setImageUrl(''); setImageCaption(''); setShowImageInput(false)
      const r = await conversationsAPI.getMessages(selected.id)
      setMessages(r.data)
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const handleSendTemplate = async (tpl: WaTemplate) => {
    if (!selected) return
    try {
      await conversationsAPI.sendWhatsappTemplate({
        conversation_id: selected.id,
        template_name: tpl.name,
        language_code: tpl.language || 'es',
      })
      setShowTemplateModal(false)
      const r = await conversationsAPI.getMessages(selected.id)
      setMessages(r.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al enviar template'
      alert(msg)
    }
  }

  const loadTemplates = async () => {
    setTemplatesLoading(true)
    try {
      const r = await conversationsAPI.getWhatsappTemplates()
      setTemplates(r.data)
    } catch { setTemplates([]) }
    finally { setTemplatesLoading(false) }
  }

  const openTemplateModal = () => {
    setShowTemplateModal(true)
    loadTemplates()
  }

  const handleCreateCanned = async () => {
    if (!newCanned.shortcut || !newCanned.content) return
    try {
      const r = await conversationsAPI.createCannedResponse(newCanned)
      setCanned(prev => [...prev, r.data])
      setNewCanned({ shortcut: '', title: '', content: '' })
    } catch (e) { console.error(e) }
  }

  const handleDeleteCanned = async (id: number) => {
    try {
      await conversationsAPI.deleteCannedResponse(id)
      setCanned(prev => prev.filter(c => c.id !== id))
    } catch (e) { console.error(e) }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const r = await conversationsAPI.importContacts(file)
      alert(`Importados: ${r.data.imported}, Omitidos: ${r.data.skipped}`)
    } catch (e: unknown) {
      alert('Error al importar CSV')
      console.error(e)
    }
    e.target.value = ''
  }

  const channels = ['all', ...Array.from(new Set(conversations.map(c => c.channel)))]

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 0px)', background: '#080812' }}>

      {/* ── COL 1: LISTA ── */}
      <div style={{ width: 288, minWidth: 288, background: '#0a0a14', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>Conversaciones</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{filtered.length}</span>
              <button onClick={loadConversations} style={{ padding: 5, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <RefreshCw size={11} />
              </button>
              {/* CSV Import */}
              <button onClick={() => fileInputRef.current?.click()} title="Importar contactos CSV"
                style={{ padding: 5, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <Upload size={11} />
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
              <button onClick={() => { setNewMsgPhone(''); setNewMsgTemplate(''); setNewMsgMsg(''); setShowNewMsgModal(true) }} title="Nuevo mensaje"
                style={{ padding: 5, borderRadius: 7, background: 'rgba(0,229,160,0.1)', border: 'none', cursor: 'pointer', color: '#00e5a0', display: 'flex' }}>
                <Plus size={11} />
              </button>
            </div>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 10px 7px 28px', fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto' }}>
          {(['all', 'bot', 'human', 'closed'] as const).map(tab => (
            <button key={tab} onClick={() => setFilterTab(tab)}
              style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 500, cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap', transition: 'all .15s',
                background: filterTab === tab ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: filterTab === tab ? '#a78bfa' : '#64748b',
                borderColor: filterTab === tab ? 'rgba(124,58,237,0.3)' : 'transparent',
              }}>
              {tab === 'all' ? 'Todos' : tab === 'bot' ? 'Bot' : tab === 'human' ? 'Humano' : 'Cerrados'}
            </button>
          ))}
        </div>

        {/* Channel filters */}
        <div style={{ display: 'flex', gap: 4, padding: '6px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto' }}>
          {channels.map(ch => (
            <button key={ch} onClick={() => setFilterCh(ch)} title={ch}
              style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0,
                background: filterCh === ch ? `${CH_COLOR[ch] || '#7c3aed'}18` : 'rgba(255,255,255,0.04)',
                borderColor: filterCh === ch ? `${CH_COLOR[ch] || '#7c3aed'}40` : 'rgba(255,255,255,0.06)',
                opacity: filterCh !== 'all' && filterCh !== ch ? 0.4 : 1,
              }}>
              {ch === 'all' ? <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>ALL</span> : CH_EMOJI[ch] || '•'}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 11, background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '70%' }} />
                    <div style={{ height: 9, background: 'rgba(255,255,255,0.03)', borderRadius: 4, width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <MessageSquare size={28} style={{ color: '#1e293b', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: '#475569' }}>{search ? 'Sin resultados' : 'Sin conversaciones'}</p>
            </div>
          ) : filtered.map(conv => {
            const color = CH_COLOR[conv.channel] || '#7c3aed'
            const sc = scoreColor(conv.contact.lead_score)
            const isSel = selected?.id === conv.id
            return (
              <button key={conv.id} onClick={() => setSelected(conv)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 12px', display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', transition: 'background .12s', borderLeft: `2px solid ${isSel ? '#7c3aed' : 'transparent'}`, borderRight: 'none', borderTop: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', background: isSel ? 'rgba(124,58,237,0.08)' : 'transparent' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color, flexShrink: 0, position: 'relative', fontFamily: 'monospace' }}>
                  {initials(conv.contact.name)}
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 13, height: 13, borderRadius: '50%', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, border: '1.5px solid #0a0a14' }}>
                    {CH_EMOJI[conv.channel] || '•'}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{conv.contact.name}</span>
                    <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace', flexShrink: 0 }}>{relativeTime(conv.updated_at)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 5 }}>
                    {conv.bot_active !== false ? '🤖 ' : '👤 '}{conv.last_message || 'Sin mensajes'}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, fontWeight: 600, background: sc.bg, color: sc.text }}>
                      {conv.contact.lead_score}pts
                    </span>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: `${color}12`, color }}>
                      {CH_LABEL[conv.channel] || conv.channel}
                    </span>
                    {conv.contact.intent && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>
                        {conv.contact.intent}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── COL 2: CHAT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#080812' }}>
        {selected ? (
          <>
            {/* Chat header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0a0a14', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${CH_COLOR[selected.channel] || '#7c3aed'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: CH_COLOR[selected.channel] || '#7c3aed', flexShrink: 0, fontFamily: 'monospace' }}>
                {initials(selected.contact.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{selected.contact.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: `${CH_COLOR[selected.channel] || '#7c3aed'}12`, color: CH_COLOR[selected.channel] || '#7c3aed', fontWeight: 500 }}>
                    {CH_EMOJI[selected.channel]} {CH_LABEL[selected.channel] || selected.channel}
                  </span>
                  {selected.contact.phone && (
                    <span style={{ fontSize: 10, color: '#475569' }}>{selected.contact.phone}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600, ...scoreColor(selected.contact.lead_score) }}>
                  Score {selected.contact.lead_score}
                </span>
                {/* Bot toggle */}
                <button onClick={handleHandoff} disabled={handoffLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '5px 11px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                    background: selected.bot_active !== false ? 'rgba(124,58,237,0.12)' : 'rgba(245,158,11,0.12)',
                    color: selected.bot_active !== false ? '#a78bfa' : '#fbbf24',
                    borderColor: selected.bot_active !== false ? 'rgba(124,58,237,0.3)' : 'rgba(245,158,11,0.3)',
                    opacity: handoffLoading ? 0.5 : 1,
                  }}>
                  {selected.bot_active !== false ? <><Bot size={11} /> Bot activo</> : <><UserCheck size={11} /> En control</>}
                </button>
                {/* Detail toggle */}
                <button onClick={() => setShowDetail(v => !v)}
                  style={{ padding: 6, borderRadius: 8, background: showDetail ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', color: showDetail ? '#a78bfa' : '#64748b', display: 'flex' }}>
                  <ChevronRight size={14} style={{ transform: showDetail ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
              </div>
            </div>

            {/* Bot status bar */}
            {selected.bot_active !== false && (
              <div style={{ padding: '6px 16px', background: 'rgba(124,58,237,0.06)', borderBottom: '1px solid rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a78bfa' }}>
                  <Zap size={11} />
                  Bot respondiendo automáticamente
                </div>
                <button onClick={handleHandoff}
                  style={{ fontSize: 10, color: '#fbbf24', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '2px 8px', cursor: 'pointer' }}>
                  Tomar control
                </button>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 12, color: '#334155' }}>Sin mensajes en esta conversación</p>
                </div>
              ) : messages.map(msg => {
                const isOut = msg.sender_type === 'human' || msg.sender_type === 'bot' || msg.sender_type === 'agent'
                const isBot = msg.sender_type === 'bot'
                const isImage = msg.content_type === 'image'
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end', maxWidth: '100%' }}>
                    {!isOut && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${CH_COLOR[selected.channel] || '#7c3aed'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: CH_COLOR[selected.channel] || '#7c3aed', flexShrink: 0, fontWeight: 700 }}>
                        {initials(selected.contact.name)}
                      </div>
                    )}
                    <div style={{ maxWidth: '68%' }}>
                      {isOut && (
                        <div style={{ fontSize: 9, color: '#475569', textAlign: 'right', marginBottom: 2 }}>
                          {isBot ? '🤖 Bot IA' : '👤 Agente'}
                        </div>
                      )}
                      <div style={{ padding: isImage ? '6px' : '9px 13px', borderRadius: isOut ? '14px 14px 3px 14px' : '14px 14px 14px 3px', fontSize: 13, lineHeight: 1.5,
                        background: isOut
                          ? isBot ? 'rgba(124,58,237,0.25)' : 'rgba(16,185,129,0.15)'
                          : 'rgba(255,255,255,0.06)',
                        color: '#e2e8f0',
                        border: isOut
                          ? isBot ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(16,185,129,0.2)'
                          : '1px solid rgba(255,255,255,0.06)',
                      }}>
                        {isImage && msg.media_url ? (
                          <div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.media_url} alt="imagen" style={{ maxWidth: 240, borderRadius: 8, display: 'block' }} />
                            {msg.content && <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>{msg.content}</div>}
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      <div style={{ fontSize: 9, color: '#334155', marginTop: 3, textAlign: isOut ? 'right' : 'left', fontFamily: 'monospace' }}>
                        {formatTime(msg.timestamp)}{isOut && sentIds.has(msg.id) && <span style={{ marginLeft: 3, color: '#00e5a0' }}>✓</span>}
                      </div>
                    </div>
                    {isOut && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: isBot ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                        {isBot ? '🤖' : '👤'}
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Canned suggestions dropdown */}
            {cannedSuggestions.length > 0 && (
              <div style={{ margin: '0 14px', background: '#0f0f1e', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, overflow: 'hidden' }}>
                {cannedSuggestions.map(c => (
                  <button key={c.id} onClick={() => { setInput(c.content); setCannedSuggestions([]) }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>{c.shortcut}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.content.slice(0, 60)}{c.content.length > 60 ? '…' : ''}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Image input panel */}
            {showImageInput && (
              <div style={{ margin: '0 14px', padding: '10px 12px', background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>ENVIAR IMAGEN</div>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL de la imagen..."
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#fff', outline: 'none' }} />
                <input value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Caption (opcional)..."
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#fff', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleSendImage} disabled={!imageUrl.trim() || sending}
                    style={{ flex: 1, padding: '6px', background: '#7c3aed', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    Enviar imagen
                  </button>
                  <button onClick={() => setShowImageInput(false)}
                    style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Input area */}
            <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0a0a14', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                {/* Quick action buttons */}
                <button onClick={() => { setShowImageInput(v => !v); setShowTemplateModal(false) }} title="Enviar imagen"
                  style={{ padding: '4px 8px', background: showImageInput ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid', borderColor: showImageInput ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)', borderRadius: 7, cursor: 'pointer', color: showImageInput ? '#a78bfa' : '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <Image size={11} /> Imagen
                </button>
                {selected.channel === 'whatsapp' && (
                  <button onClick={openTemplateModal} title="Enviar template HSM"
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                    <Layout size={11} /> Template
                  </button>
                )}
                <div style={{ fontSize: 10, color: '#334155', alignSelf: 'center', marginLeft: 'auto' }}>
                  Escribe <span style={{ color: '#475569' }}>/</span> para respuestas rápidas
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={selected.bot_active !== false ? 'Bot activo — escribe para responder manualmente...' : 'Escribe un mensaje... (/ para respuestas rápidas)'}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 13px', fontSize: 13, color: '#fff', outline: 'none', transition: 'border-color .15s' }}
                />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  style={{ width: 38, height: 38, borderRadius: 10, background: input.trim() ? '#7c3aed' : 'rgba(124,58,237,0.2)', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
                  <Send size={15} color="#fff" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <MessageSquare size={40} style={{ color: '#1e293b' }} />
            <p style={{ fontSize: 14, color: '#475569' }}>Selecciona una conversación</p>
            <p style={{ fontSize: 12, color: '#1e293b' }}>WhatsApp, Instagram, Facebook y más aparecerán aquí</p>
          </div>
        )}
      </div>

      {/* ── COL 3: DETALLE ── */}
      {selected && showDetail && (
        <div style={{ width: 230, minWidth: 230, background: '#0a0a14', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {(['info', 'canned'] as const).map(tab => (
              <button key={tab} onClick={() => setSideTab(tab)}
                style={{ flex: 1, padding: '9px 4px', fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'transparent', color: sideTab === tab ? '#a78bfa' : '#475569', borderBottom: `2px solid ${sideTab === tab ? '#7c3aed' : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all .15s' }}>
                {tab === 'info' ? <><Users size={10} /> Info</> : <><FileText size={10} /> Respuestas</>}
              </button>
            ))}
          </div>

          {sideTab === 'info' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Contacto */}
              <div style={{ padding: '12px 13px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 9, color: '#334155', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Contacto</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {([
                    ['Nombre', selected.contact.name],
                    ['Canal', CH_LABEL[selected.channel] || selected.channel],
                    ['Teléfono', selected.contact.phone || '—'],
                    ['Email', selected.contact.email || '—'],
                    ['Score', `${selected.contact.lead_score} pts`],
                    ['Intención', selected.contact.intent || '—'],
                  ] as [string, string][]).map(([lbl, val]) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#475569' }}>{lbl}</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500, textAlign: 'right', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asignar agente */}
              <div style={{ padding: '10px 13px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 9, color: '#334155', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Asignar agente</div>
                <select
                  value={selected.assigned_to ?? ''}
                  onChange={e => handleAssign(e.target.value ? Number(e.target.value) : null)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 8px', fontSize: 11, color: '#e2e8f0', outline: 'none', cursor: 'pointer' }}>
                  <option value="">Sin asignar</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div style={{ padding: '10px 13px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 9, color: '#334155', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Estado</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, fontWeight: 600, background: selected.bot_active !== false ? 'rgba(124,58,237,0.12)' : 'rgba(245,158,11,0.12)', color: selected.bot_active !== false ? '#a78bfa' : '#fbbf24' }}>
                    {selected.bot_active !== false ? 'Bot activo' : 'Agente humano'}
                  </span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, background: selected.status === 'open' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: selected.status === 'open' ? '#34d399' : '#64748b', fontWeight: 600 }}>
                    {selected.status === 'open' ? 'Abierto' : selected.status}
                  </span>
                </div>
              </div>

              {/* Notas */}
              <div style={{ padding: '10px 13px' }}>
                <div style={{ fontSize: 9, color: '#334155', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Notas internas</div>
                <textarea
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="Añadir nota interna sobre este contacto..."
                  rows={5}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 9px', fontSize: 11, color: '#94a3b8', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
                <div style={{ fontSize: 9, color: '#334155', marginTop: 3 }}>Auto-guardado</div>
              </div>
            </div>
          )}

          {sideTab === 'canned' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Canned list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#334155', letterSpacing: '1px', textTransform: 'uppercase' }}>Respuestas rápidas</div>
                  <button onClick={() => setShowCannedManager(v => !v)}
                    style={{ padding: '2px 6px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 5, fontSize: 9, color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Plus size={9} /> Nueva
                  </button>
                </div>

                {showCannedManager && (
                  <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 9, padding: '10px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input value={newCanned.shortcut} onChange={e => setNewCanned(p => ({ ...p, shortcut: e.target.value }))}
                      placeholder="/atajo (ej: /precio)"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#fff', outline: 'none' }} />
                    <input value={newCanned.title} onChange={e => setNewCanned(p => ({ ...p, title: e.target.value }))}
                      placeholder="Título (descripción)"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#fff', outline: 'none' }} />
                    <textarea value={newCanned.content} onChange={e => setNewCanned(p => ({ ...p, content: e.target.value }))}
                      placeholder="Texto del mensaje..."
                      rows={3}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#fff', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                    <button onClick={handleCreateCanned}
                      style={{ padding: '5px', background: '#7c3aed', border: 'none', borderRadius: 6, fontSize: 11, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                      Guardar respuesta
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {canned.length === 0 ? (
                    <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', padding: '20px 0' }}>Sin respuestas rápidas</p>
                  ) : canned.map(c => (
                    <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px 4px' }}>
                        <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace', flex: 1 }}>{c.shortcut}</span>
                        <button onClick={() => handleDeleteCanned(c.id)}
                          style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <button onClick={() => setInput(c.content)}
                        style={{ width: '100%', textAlign: 'left', padding: '0 8px 7px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                        {c.content.slice(0, 70)}{c.content.length > 70 ? '…' : ''}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATE MODAL ── */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowTemplateModal(false) }}>
          <div style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Templates de WhatsApp</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Solo se muestran templates aprobados</div>
              </div>
              <button onClick={() => setShowTemplateModal(false)} style={{ padding: 6, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {templatesLoading ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#475569', fontSize: 12 }}>Cargando templates...</div>
              ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#475569', fontSize: 12 }}>
                  No hay templates aprobados.<br />
                  <span style={{ color: '#334155', fontSize: 10 }}>Crea templates en Meta Business Manager.</span>
                </div>
              ) : templates.map(tpl => {
                const bodyComp = tpl.components?.find(c => c.type === 'BODY')
                return (
                  <div key={tpl.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{tpl.name}</div>
                        <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>{tpl.status}</span>
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>{tpl.language}</span>
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>{tpl.category}</span>
                        </div>
                      </div>
                      <button onClick={() => handleSendTemplate(tpl)}
                        style={{ padding: '5px 12px', background: '#25d366', border: 'none', borderRadius: 8, fontSize: 11, color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Enviar
                      </button>
                    </div>
                    {bodyComp?.text && (
                      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px', marginTop: 4 }}>
                        {bodyComp.text}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* NEW MSG MODAL */}
      {showNewMsgModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#161a22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 400, position: 'relative' }}>
            <button onClick={() => setShowNewMsgModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Nuevo mensaje</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Número de teléfono *</div>
                <input value={newMsgPhone} onChange={e => setNewMsgPhone(e.target.value)} placeholder="+56912345678"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 12, background: '#111318', border: '1px solid rgba(255,255,255,0.07)', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Plantilla aprobada *</div>
                <select value={newMsgTemplate} onChange={e => setNewMsgTemplate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 12, background: '#111318', border: '1px solid rgba(255,255,255,0.07)', color: newMsgTemplate ? '#e2e8f0' : '#64748b', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Seleccionar plantilla...</option>
                  {templates.filter(t => t.status === 'APPROVED').map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                  ))}
                </select>
                {templates.filter(t => t.status === 'APPROVED').length === 0 && !templatesLoading && (
                  <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 6 }}>Sin plantillas aprobadas. Crea una en /templates.</div>
                )}
              </div>
              {newMsgMsg && (
                <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8,
                  background: newMsgMsg.startsWith('✓') ? 'rgba(0,229,160,0.1)' : 'rgba(248,113,113,0.1)',
                  color: newMsgMsg.startsWith('✓') ? '#00e5a0' : '#f87171',
                  border: newMsgMsg.startsWith('✓') ? '1px solid #00e5a030' : '1px solid #f8717130' }}>{newMsgMsg}</div>
              )}
              <button
                disabled={!newMsgPhone.trim() || !newMsgTemplate || newMsgSending}
                onClick={async () => {
                  setNewMsgSending(true); setNewMsgMsg('')
                  try {
                    await conversationsAPI.sendTemplateToNumber({ phone_number: newMsgPhone.trim(), template_name: newMsgTemplate, language_code: templates.find(t => t.name === newMsgTemplate)?.language || 'es' })
                    setNewMsgMsg('✓ Mensaje enviado correctamente')
                    loadConversations()
                  } catch (e: any) {
                    setNewMsgMsg('✗ ' + ((e as any).response?.data?.detail || (e as Error).message || 'Error al enviar'))
                  } finally { setNewMsgSending(false) }
                }}
                style={{ padding: '10px 16px', background: !newMsgPhone.trim() || !newMsgTemplate || newMsgSending ? 'rgba(0,229,160,0.3)' : '#00e5a0', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: !newMsgPhone.trim() || !newMsgTemplate || newMsgSending ? 'not-allowed' : 'pointer' }}>
                {newMsgSending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}
