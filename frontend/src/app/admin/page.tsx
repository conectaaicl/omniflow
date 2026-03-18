'use client'

import { useState, useEffect, useMemo } from 'react'
import { adminAPI } from '@/lib/api'

interface Tenant {
  id: number
  name: string
  subdomain: string
  plan: string
  plan_price: number
  sub_status: string
  is_active: boolean
  created_at: string
  contacts: number
  conversations: number
  channels: string[]
}

interface Stats {
  total_tenants: number
  active_tenants: number
  suspended_tenants: number
  mrr: number
  arr: number
  new_tenants_30d: number
  plan_distribution: Record<string, number>
}

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: '🟢',
  instagram: '📷',
  facebook: '🔵',
  tiktok: '⬛',
  shopify: '🛍️',
  email: '📧',
  webchat: '💬',
}

const PLAN_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Enterprise: { bg: '#7c3aed18', text: '#a78bfa', border: '#7c3aed40' },
  Pro:        { bg: '#0ea5e918', text: '#38bdf8', border: '#0ea5e940' },
  Starter:    { bg: '#10b98118', text: '#34d399', border: '#10b98140' },
  Free:       { bg: 'rgba(255,255,255,0.03)', text: '#64748b', border: 'rgba(255,255,255,0.06)' },
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl`} style={{ background: color + '18' }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {sub && <span className="text-xs text-slate-600">{sub}</span>}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)
  const [newTenant, setNewTenant] = useState({ name: '', subdomain: '', admin_email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchAll = () => {
    setLoading(true)
    Promise.all([adminAPI.getTenants(), adminAPI.getStats()])
      .then(([tr, sr]) => { setTenants(tr.data); setStats(sr.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = useMemo(() => {
    let list = tenants
    if (filterPlan !== 'all') list = list.filter(t => t.plan === filterPlan)
    if (filterStatus === 'active') list = list.filter(t => t.is_active)
    if (filterStatus === 'suspended') list = list.filter(t => !t.is_active)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.subdomain.toLowerCase().includes(q) ||
        t.plan.toLowerCase().includes(q)
      )
    }
    return list
  }, [tenants, search, filterPlan, filterStatus])

  const handleToggle = async (id: number) => {
    setToggling(id)
    try {
      const r = await adminAPI.toggleTenant(id)
      setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: r.data.is_active } : t))
    } catch (e) { console.error(e) }
    finally { setToggling(null) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      await adminAPI.createTenant(newTenant)
      setShowCreate(false)
      setNewTenant({ name: '', subdomain: '', admin_email: '', password: '' })
      fetchAll()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setCreateError(e?.response?.data?.detail || 'Error al crear tenant')
    } finally { setCreating(false) }
  }

  const plans = ['all', ...Array.from(new Set(tenants.map(t => t.plan)))]

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-violet-400">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">SuperAdmin</h1>
            <p className="text-slate-500 text-xs">Control total de la plataforma</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-500/8 border border-green-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Sistema operativo</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Nuevo tenant
          </button>
          <button
            onClick={fetchAll}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/8 text-slate-400 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={loading ? 'animate-spin' : ''}>
              <path d="M21 12a9 9 0 11-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Tenants totales" value={stats.total_tenants} color="#7c3aed"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
          />
          <StatCard
            label="Activos" value={stats.active_tenants} color="#10b981"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <StatCard
            label="Suspendidos" value={stats.suspended_tenants} color="#ef4444"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
          />
          <StatCard
            label="MRR" value={`$${stats.mrr}`} sub="USD/mes" color="#f59e0b"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
          />
          <StatCard
            label="ARR" value={`$${stats.arr}`} sub="proyectado" color="#06b6d4"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <StatCard
            label="Nuevos 30d" value={stats.new_tenants_30d} color="#8b5cf6"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
        </div>
      )}

      {/* Plan distribution */}
      {stats && Object.keys(stats.plan_distribution).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stats.plan_distribution).map(([plan, count]) => {
            const s = PLAN_STYLES[plan] || PLAN_STYLES.Free
            const pct = stats.active_tenants > 0 ? Math.round((count / stats.active_tenants) * 100) : 0
            return (
              <div key={plan} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: s.text }}>{plan}</span>
                  <span className="text-xs text-slate-600">{pct}%</span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">{count}</div>
                <div className="h-1 rounded-full bg-white/5">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.text }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tenant table */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white">
            Tenants
            {filtered.length !== tenants.length && (
              <span className="ml-2 text-xs text-slate-500">({filtered.length} de {tenants.length})</span>
            )}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="bg-white/5 border border-white/5 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 w-44"
              />
            </div>
            {/* Plan filter */}
            <select
              value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500/40"
            >
              {plans.map(p => <option key={p} value={p}>{p === 'all' ? 'Todos los planes' : p}</option>)}
            </select>
            {/* Status filter */}
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500/40"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white/3 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-slate-700 mx-auto mb-3">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p className="text-sm text-slate-500">Sin resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Canales</th>
                  <th className="px-4 py-3">Contactos</th>
                  <th className="px-4 py-3">Conversaciones</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Registrado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map((t) => {
                  const ps = PLAN_STYLES[t.plan] || PLAN_STYLES.Free
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{t.name}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <code className="text-[10px] text-violet-400">{t.subdomain}</code>
                              <span className="text-slate-700 text-[10px]">·</span>
                              <span className="text-[10px] text-slate-700 font-mono">#{t.id.toString().padStart(4,'0')}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border"
                          style={{ background: ps.bg, color: ps.text, borderColor: ps.border }}>
                          {t.plan}
                        </span>
                        {t.plan_price > 0 && (
                          <div className="text-[10px] text-slate-600 mt-0.5">${t.plan_price}/mo</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1 flex-wrap max-w-[120px]">
                          {t.channels.length === 0
                            ? <span className="text-[10px] text-slate-700">Sin canales</span>
                            : t.channels.map(ch => (
                                <span key={ch} title={ch} className="text-sm leading-none">{CHANNEL_ICONS[ch] || '•'}</span>
                              ))
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-white">{t.contacts.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-white">{t.conversations.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggle(t.id)}
                          disabled={toggling === t.id}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            t.is_active ? 'bg-green-500' : 'bg-slate-700'
                          } ${toggling === t.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            t.is_active ? 'translate-x-4' : 'translate-x-1'
                          }`} />
                        </button>
                        <div className={`text-[10px] mt-0.5 ${t.is_active ? 'text-green-400' : 'text-red-400'}`}>
                          {t.is_active ? 'Activo' : 'Suspendido'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(t.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`https://osw.conectaai.cl/login`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-violet-500/15 text-slate-500 hover:text-violet-400 text-[11px] transition-all opacity-0 group-hover:opacity-100"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Acceder
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create tenant modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Crear nuevo tenant</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { key: 'name', label: 'Nombre empresa', placeholder: 'Acme Corp' },
                { key: 'subdomain', label: 'Subdominio', placeholder: 'acme' },
                { key: 'admin_email', label: 'Email admin', placeholder: 'admin@acme.com' },
                { key: 'password', label: 'Contraseña', placeholder: 'Mínimo 8 caracteres', type: 'password' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
                    type={type || 'text'} required placeholder={placeholder}
                    value={newTenant[key as keyof typeof newTenant]}
                    onChange={e => setNewTenant(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              ))}
              {createError && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{createError}</div>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-sm text-slate-400 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all disabled:opacity-50">
                  {creating ? 'Creando...' : 'Crear tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
