'use client'

import { useEffect, useState } from 'react'
import { tenantAPI } from '@/lib/api'
import {
  Users, TrendingUp, Target, Percent,
  MessageSquare, Zap, ArrowRight, Activity,
  Instagram, Globe, Facebook, Phone, Tv2
} from 'lucide-react'
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
  tiktok:    '#000000',
  email:     '#f59e0b',
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp:  Phone,
  instagram: Instagram,
  facebook:  Facebook,
  web:       Globe,
  tiktok:    Tv2,
  email:     MessageSquare,
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  delay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`relative bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 overflow-hidden transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none`} style={{ background: color }} />
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}20` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <Activity size={14} className="text-slate-600" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-300 font-medium capitalize">{payload[0].name}</p>
      <p className="text-white font-bold">{payload[0].value} leads</p>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    total_contacts: number
    hot_leads: number
    total_deals: number
    won_deals: number
    conversion_rate: number
  } | null>(null)
  const [sources, setSources] = useState<{ source: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tenantAPI.getDashboardStats()
      .then((r) => {
        setStats(r.data.stats)
        setSources(r.data.source_distribution || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const pieData = sources.map((s) => ({ name: s.source, value: s.count }))

  const topSource = sources.reduce((a, b) => (a.count > b.count ? a : b), { source: '—', count: 0 })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Vista general de tu operación omnicanal</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Sistema activo</span>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}     label="Contactos Totales"  value={stats?.total_contacts ?? 0}              color="#7c3aed" delay={0}   />
          <StatCard icon={TrendingUp} label="Leads Calientes"   value={stats?.hot_leads ?? 0}     sub="Score > 70" color="#e1306c" delay={80}  />
          <StatCard icon={Target}     label="Deals Activos"     value={stats?.total_deals ?? 0}                 color="#25d366" delay={160} />
          <StatCard icon={Percent}    label="Tasa Conversión"   value={`${(stats?.conversion_rate ?? 0).toFixed(1)}%`} color="#f59e0b" delay={240} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Leads por Canal</h3>
          {pieData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-600">
              <Activity size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Sin datos aún</p>
              <p className="text-xs mt-1">Los leads aparecerán aquí cuando lleguen mensajes</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || '#7c3aed'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((entry) => {
                  const Icon = CHANNEL_ICONS[entry.name] || Globe
                  return (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[entry.name] || '#7c3aed' }} />
                      <Icon size={12} className="text-slate-500" />
                      <span className="text-xs text-slate-400 capitalize flex-1">{entry.name}</span>
                      <span className="text-xs font-medium text-white">{entry.value}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Acciones Rápidas</h3>
          <div className="space-y-2">
            {[
              { href: '/conversations', icon: MessageSquare, label: 'Ver conversaciones activas',   color: '#7c3aed', sub: 'Responde a tus leads' },
              { href: '/pipeline',      icon: Target,        label: 'Gestionar pipeline de ventas', color: '#25d366', sub: 'Mueve deals entre etapas' },
              { href: '/automations',   icon: Zap,           label: 'Abrir editor n8n',             color: '#f59e0b', sub: 'Crea flujos de automatización' },
              { href: '/settings/integrations', icon: Globe, label: 'Configurar integraciones',     color: '#e1306c', sub: 'WhatsApp, Instagram, Facebook' },
            ].map(({ href, icon: Icon, label, color, sub }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group cursor-pointer">
                  <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-slate-500">{sub}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Top channel banner */}
      {topSource.source !== '—' && (
        <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/20 border border-violet-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <TrendingUp size={18} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Canal con más leads</p>
              <p className="text-xs text-slate-400 capitalize">{topSource.source} — {topSource.count} contactos</p>
            </div>
          </div>
          <Link href="/settings/integrations">
            <button className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
              Configurar <ArrowRight size={12} />
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
