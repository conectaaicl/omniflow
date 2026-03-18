'use client'

import { useEffect, useState } from 'react'
import { tenantAPI, conversationsAPI } from '@/lib/api'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'
import Link from 'next/link'

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp:  '#25d366',
  instagram: '#e1306c',
  facebook:  '#1877f2',
  web:       '#7c3aed',
  webchat:   '#7c3aed',
  tiktok:    '#94a3b8',
  email:     '#f59e0b',
}

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook',
  web: 'Web Chat', webchat: 'Web Chat', tiktok: 'TikTok', email: 'Email',
}

// Simulated weekly data — replace with real API when available
const WEEKLY = [
  { day: 'Lun', leads: 0, conversaciones: 0 },
  { day: 'Mar', leads: 0, conversaciones: 0 },
  { day: 'Mié', leads: 0, conversaciones: 0 },
  { day: 'Jue', leads: 0, conversaciones: 0 },
  { day: 'Vie', leads: 0, conversaciones: 0 },
  { day: 'Sáb', leads: 0, conversaciones: 0 },
  { day: 'Hoy', leads: 0, conversaciones: 0 },
]

const QUICK_ACTIONS = [
  { href: '/conversations', color: '#7c3aed', label: 'Conversaciones', sub: 'Responde en tiempo real',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg> },
  { href: '/pipeline', color: '#10b981', label: 'Pipeline CRM', sub: 'Gestiona deals y oportunidades',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { href: 'https://n8n.conectaai.cl', color: '#f59e0b', label: 'Editor n8n', sub: 'Crea flujos de automatización', external: true,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { href: '/settings/integrations', color: '#e1306c', label: 'Integraciones', sub: 'WhatsApp, Instagram, Facebook',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
]

interface Stats {
  total_contacts: number
  hot_leads: number
  total_deals: number
  won_deals: number
  conversion_rate: number
}

interface Conversation {
  id: number
  contact?: { id: number; name: string; phone?: string; lead_score?: number; intent?: string }
  contact_name?: string
  channel: string
  last_message?: string
  updated_at?: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sources, setSources] = useState<{ source: string; count: number }[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [greeting, setGreeting] = useState('Buenos días')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches')
    const cached = localStorage.getItem('omniflow_user')
    if (cached) {
      try {
        const u = JSON.parse(cached)
        setUserName((u.full_name || u.email || '').split(' ')[0])
      } catch { /* */ }
    }
  }, [])

  useEffect(() => {
    tenantAPI.getDashboardStats()
      .then((r) => { setStats(r.data.stats); setSources(r.data.source_distribution || []) })
      .catch(console.error)
      .finally(() => setLoadingStats(false))
    conversationsAPI.list()
      .then((r) => setConversations((r.data || []).slice(0, 5)))
      .catch(console.error)
  }, [])

  const pieData = sources.map((s) => ({ name: s.source, value: s.count }))
  const totalSources = sources.reduce((a, b) => a + b.count, 0)

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-slate-500 text-xs mb-0.5">{greeting}{userName ? `, ${userName}` : ''} 👋</p>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-500/8 border border-green-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Sistema activo</span>
          </div>
          <Link href="/settings/integrations">
            <button className="text-xs text-slate-500 hover:text-white bg-white/5 hover:bg-white/8 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Conectar canal
            </button>
          </Link>
        </div>
      </div>

      {/* KPI row */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-[#0d0d1a] rounded-2xl animate-pulse border border-white/5" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Contactos', value: stats?.total_contacts ?? 0, sub: 'Total en CRM', color: '#7c3aed',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
            { label: 'Leads Calientes', value: stats?.hot_leads ?? 0, sub: 'Score > 70', color: '#ef4444',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label: 'Deals Activos', value: stats?.total_deals ?? 0, sub: `${stats?.won_deals ?? 0} cerrados`, color: '#10b981',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label: 'Conversión', value: `${(stats?.conversion_rate ?? 0).toFixed(1)}%`, sub: 'Lead → Deal', color: '#f59e0b',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          ].map(({ label, value, sub, color, icon }) => (
            <div key={label} className="relative bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-[0.07] pointer-events-none" style={{ background: color }} />
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-xl" style={{ background: `${color}18` }}>
                  <span style={{ color }}>{icon}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-sm text-slate-400 mt-0.5">{label}</div>
              {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Charts + actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Leads por canal */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Leads por Canal</h3>
          {pieData.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-700">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-2 opacity-40"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
              <p className="text-xs">Sin datos todavía</p>
              <p className="text-[10px] mt-1 text-center">Los leads aparecerán cuando lleguen mensajes</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || '#7c3aed'} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const name = String(payload[0].name ?? '')
                    return (
                      <div className="bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2 text-xs">
                        <p className="text-white font-semibold">{CHANNEL_LABEL[name] || name}</p>
                        <p className="text-slate-400">{payload[0].value} leads</p>
                      </div>
                    )
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHANNEL_COLORS[entry.name] || '#7c3aed' }} />
                    <span className="text-xs text-slate-400 flex-1 truncate">{CHANNEL_LABEL[entry.name] || entry.name}</span>
                    <span className="text-xs font-semibold text-white">{totalSources > 0 ? Math.round(entry.value / totalSources * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weekly activity */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Actividad Semanal</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={WEEKLY} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 }} />
              <Area type="monotone" dataKey="leads" stroke="#7c3aed" strokeWidth={2} fill="url(#gLeads)" name="Leads" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-700 text-center mt-2">Los datos se poblarán con actividad real</p>
        </div>

        {/* Quick actions */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Acciones Rápidas</h3>
          <div className="space-y-1.5">
            {QUICK_ACTIONS.map(({ href, icon, label, color, sub, external }) => {
              const inner = (
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all group cursor-pointer">
                  <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${color}18` }}>
                    <span style={{ color }}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight">{label}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate">{sub}</p>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-slate-700 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all flex-shrink-0">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )
              return external
                ? <a key={href} href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
                : <Link key={href} href={href}>{inner}</Link>
            })}
          </div>
        </div>
      </div>

      {/* Recent conversations + channel status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent conversations */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Conversaciones Recientes</h3>
            <Link href="/conversations" className="text-[11px] text-slate-500 hover:text-violet-400 transition-colors flex items-center gap-1">
              Ver todas
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-700 mx-auto mb-2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
              <p className="text-xs text-slate-600">Sin conversaciones todavía</p>
              <p className="text-[11px] text-slate-700 mt-1">Aparecerán cuando lleguen mensajes de tus canales</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {conversations.map((conv) => (
                <Link key={conv.id} href="/conversations">
                  <div className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ background: `${CHANNEL_COLORS[conv.channel] || '#7c3aed'}30`, border: `1px solid ${CHANNEL_COLORS[conv.channel] || '#7c3aed'}40` }}>
                      {(conv.contact?.name || conv.contact_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{conv.contact?.name || conv.contact_name || 'Visitante'}</p>
                      <p className="text-[11px] text-slate-600 truncate">{conv.last_message || 'Sin mensajes'}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="w-2 h-2 rounded-full ml-auto" style={{ background: CHANNEL_COLORS[conv.channel] || '#7c3aed' }} />
                      <p className="text-[10px] text-slate-700 mt-1 capitalize">{conv.channel}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* System health */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Estado del Sistema</h3>
          <div className="space-y-3">
            {[
              { name: 'API Backend', status: 'operational', latency: '~12ms', color: '#10b981' },
              { name: 'Base de datos', status: 'operational', latency: '~3ms', color: '#10b981' },
              { name: 'n8n Automatizaciones', status: 'operational', latency: 'n8n.conectaai.cl', color: '#10b981', href: 'https://n8n.conectaai.cl' },
              { name: 'Web Chat Widget', status: 'operational', latency: 'osw.conectaai.cl', color: '#10b981' },
              { name: 'WhatsApp Webhook', status: 'pending', latency: 'Sin configurar', color: '#f59e0b', href: '/settings/integrations' },
            ].map(({ name, status, latency, color, href }) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-sm text-slate-300">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {href ? (
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      className="text-[11px] font-mono hover:text-violet-400 transition-colors" style={{ color: color === '#f59e0b' ? '#f59e0b' : '#475569' }}>
                      {latency}
                    </a>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-600">{latency}</span>
                  )}
                  <span className="text-[10px] capitalize" style={{ color }}>{status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
