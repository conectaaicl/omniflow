'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

const C = {
  base: '#0a0b0d', card: '#161a22', surface: '#111318',
  border: 'rgba(255,255,255,0.07)', accent: '#00e5a0',
  text: '#e2e8f0', muted: '#64748b',
  blue: '#60a5fa', purple: '#a78bfa', orange: '#fb923c', pink: '#f472b6',
}

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: '💬', instagram: '📸', facebook: '📘', webchat: '💻',
  telegram: '✈️', tiktok: '🎵', email: '📧',
}

function StatCard({ label, value, sub, color = C.accent }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function BarChart({ data, label }: { data: { label: string; value: number; color?: string }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 80, fontSize: 12, color: C.muted, textAlign: 'right' as const, flexShrink: 0 }}>{d.label}</div>
            <div style={{ flex: 1, background: C.surface, borderRadius: 4, height: 22, position: 'relative' as const, overflow: 'hidden' }}>
              <div style={{
                width: `${(d.value / max) * 100}%`, height: '100%',
                background: d.color || C.accent, borderRadius: 4, transition: 'width .5s ease',
                minWidth: d.value > 0 ? 4 : 0,
              }} />
            </div>
            <div style={{ width: 40, fontSize: 12, color: C.text, fontWeight: 600, textAlign: 'right' as const, flexShrink: 0 }}>{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniSparkline({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const w = 400, h = 80
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (d.count / max) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>Mensajes últimos 14 días</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 80 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={C.accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline points={points} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#grad)" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: C.muted }}>{data[0]?.date?.slice(5) || ''}</span>
        <span style={{ fontSize: 10, color: C.muted }}>{data[data.length - 1]?.date?.slice(5) || ''}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/analytics/overview?days=${days}`)
      setData(r.data)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [days])

  useEffect(() => { load() }, [load])

  const channelData = (data?.by_channel || []).map((c: any) => ({
    label: (CHANNEL_ICONS[c.channel] || '📡') + ' ' + (c.channel || 'otro'),
    value: c.count,
    color: C.accent,
  }))

  const statusColors: Record<string, string> = { open: C.blue, closed: C.muted, bot: C.accent, human: C.orange }
  const statusData = (data?.by_status || []).map((s: any) => ({
    label: s.status,
    value: s.count,
    color: statusColors[s.status] || C.purple,
  }))

  const msgSenderData = data ? [
    { label: '🤖 Bot', value: data.messages?.bot || 0, color: C.purple },
    { label: '👤 Agente', value: data.messages?.human || 0, color: C.orange },
    { label: '🙋 Visitante', value: data.messages?.visitor || 0, color: C.blue },
  ] : []

  return (
    <div style={{ padding: '32px 28px', maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: C.text, minHeight: '100vh', background: C.base }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>Métricas de conversaciones, mensajes y canales</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              background: days === d ? C.accent : C.surface, color: days === d ? '#000' : C.muted,
              border: `1px solid ${days === d ? C.accent : C.border}`, borderRadius: 8, padding: '6px 14px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{d}d</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.muted, fontSize: 14, textAlign: 'center' as const, paddingTop: 80 }}>Cargando métricas…</div>
      ) : !data ? (
        <div style={{ color: C.muted, fontSize: 14, textAlign: 'center' as const, paddingTop: 80 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <p>Sin datos disponibles</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
          {/* Top stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            <StatCard label="Conversaciones" value={data.conversations?.total || 0} sub={`${data.conversations?.active_period || 0} activas (${days}d)`} color={C.accent} />
            <StatCard label="Mensajes totales" value={data.messages?.total || 0} sub={`${data.messages?.period || 0} en ${days} días`} color={C.blue} />
            <StatCard label="Contactos" value={data.contacts?.total || 0} sub={`+${data.contacts?.new_period || 0} nuevos (${days}d)`} color={C.purple} />
            <StatCard label="Respuesta IA" value={data.messages?.bot > 0 ? Math.round((data.messages.bot / Math.max(data.messages.total, 1)) * 100) + '%' : '—'} sub="mensajes del bot" color={C.orange} />
          </div>

          {/* Sparkline */}
          {data.daily_messages?.length > 0 && <MiniSparkline data={data.daily_messages} />}

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {channelData.length > 0 && <BarChart data={channelData} label="Conversaciones por canal" />}
            {statusData.length > 0 && <BarChart data={statusData} label="Estado de conversaciones" />}
            {msgSenderData.some(d => d.value > 0) && <BarChart data={msgSenderData} label="Mensajes por tipo de remitente" />}
          </div>
        </div>
      )}
    </div>
  )
}
