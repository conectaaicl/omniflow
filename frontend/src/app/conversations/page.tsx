'use client'

import { useState, useEffect, useRef } from 'react'
import { conversationsAPI } from '@/lib/api'
import {
  MessageSquare, Send, Phone, User, Search,
  Smartphone, Instagram, Facebook, Globe, RefreshCw
} from 'lucide-react'

interface Contact  { id: number; name: string; phone: string; lead_score: number; intent: string }
interface Conv     { id: number; channel: string; status: string; last_message: string; updated_at: string; contact: Contact }
interface Message  { id: number; sender_type: string; content: string; timestamp: string }

const CHANNEL_ICON: Record<string, React.ElementType> = {
  whatsapp: Phone, instagram: Instagram, facebook: Facebook, web: Globe,
}
const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: '#25d366', instagram: '#e1306c', facebook: '#1877f2', web: '#7c3aed',
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-400 bg-green-400/10'
  if (score >= 40) return 'text-amber-400 bg-amber-400/10'
  return 'text-slate-400 bg-white/5'
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conv[]>([])
  const [filtered, setFiltered] = useState<Conv[]>([])
  const [selected, setSelected] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = () => {
    conversationsAPI.list()
      .then((r) => {
        setConversations(r.data)
        setFiltered(r.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (!selected) return
    const poll = setInterval(() => {
      conversationsAPI.getMessages(selected.id).then((r) => setMessages(r.data)).catch(() => {})
    }, 5000)
    conversationsAPI.getMessages(selected.id).then((r) => setMessages(r.data)).catch(() => {})
    return () => clearInterval(poll)
  }, [selected])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q ? conversations.filter((c) =>
        c.contact.name.toLowerCase().includes(q) ||
        c.contact.phone?.includes(q) ||
        c.last_message?.toLowerCase().includes(q)
      ) : conversations
    )
  }, [search, conversations])

  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    try {
      await conversationsAPI.send(selected.id, input.trim())
      setInput('')
      const r = await conversationsAPI.getMessages(selected.id)
      setMessages(r.data)
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const ChannelIcon = selected ? (CHANNEL_ICON[selected.channel] || Globe) : Globe

  return (
    <div className="flex h-full bg-[#080812]" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Sidebar */}
      <div className="w-80 flex flex-col border-r border-white/5 bg-[#0a0a14]">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Conversaciones</h2>
            <button onClick={loadConversations} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-all">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contacto o mensaje..."
              className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{search ? 'Sin resultados' : 'Sin conversaciones aún'}</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const Icon = CHANNEL_ICON[conv.channel] || Globe
              const color = CHANNEL_COLOR[conv.channel] || '#7c3aed'
              const isSelected = selected?.id === conv.id
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-all hover:bg-white/5 ${isSelected ? 'bg-violet-600/10 border-l-2 border-violet-500' : 'border-l-2 border-transparent'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                    <User size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate">{conv.contact.name}</span>
                      <span className="text-xs text-slate-600 shrink-0">{formatTime(conv.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Icon size={10} style={{ color }} className="shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{conv.last_message || 'Sin mensajes'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${scoreColor(conv.contact.lead_score)}`}>
                        {conv.contact.lead_score}
                      </span>
                      {conv.contact.intent && (
                        <span className="text-xs text-slate-600 capitalize truncate">{conv.contact.intent.replace('_', ' ')}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-white/5 bg-[#0a0a14] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${CHANNEL_COLOR[selected.channel] || '#7c3aed'}20` }}>
                <User size={14} style={{ color: CHANNEL_COLOR[selected.channel] || '#7c3aed' }} />
              </div>
              <div>
                <p className="font-medium text-white text-sm">{selected.contact.name}</p>
                <div className="flex items-center gap-2">
                  <ChannelIcon size={10} style={{ color: CHANNEL_COLOR[selected.channel] || '#7c3aed' }} />
                  <span className="text-xs text-slate-500 capitalize">{selected.channel}</span>
                  {selected.contact.phone && <span className="text-xs text-slate-600">· {selected.contact.phone}</span>}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColor(selected.contact.lead_score)}`}>
                  Score {selected.contact.lead_score}
                </span>
                <Smartphone size={14} className="text-slate-500" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-slate-600">Sin mensajes en esta conversación</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutgoing = msg.sender_type === 'human' || msg.sender_type === 'bot'
                  return (
                    <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        isOutgoing
                          ? 'bg-violet-600/30 text-white rounded-br-sm'
                          : 'bg-white/5 text-slate-200 rounded-bl-sm'
                      }`}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isOutgoing ? 'text-violet-300/60' : 'text-slate-600'}`}>
                          {formatTime(msg.timestamp)}
                          {msg.sender_type === 'bot' && ' · Bot'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-[#0a0a14]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Selecciona una conversación</p>
              <p className="text-xs text-slate-700 mt-1">Los mensajes de WhatsApp, Instagram y más aparecerán aquí</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
