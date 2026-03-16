'use client'

import { useState, useEffect, useMemo } from 'react'
import { adminAPI } from '@/lib/api'
import { Shield, Users, Activity, ChevronRight, Search, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

interface Tenant {
  id: number
  name: string
  subdomain: string
  plan?: string
  is_active: boolean
  created_at: string
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = () => {
    setLoading(true)
    adminAPI.getTenants()
      .then((r) => setTenants(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return tenants
    return tenants.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.subdomain.toLowerCase().includes(q) ||
      t.plan?.toLowerCase().includes(q)
    )
  }, [search, tenants])

  const activeCount = tenants.filter((t) => t.is_active).length

  const planColor = (plan?: string) => {
    if (plan === 'Enterprise') return { bg: '#7c3aed20', color: '#a78bfa' }
    if (plan === 'Pro') return { bg: '#2563eb20', color: '#60a5fa' }
    return { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8' }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10">
            <Shield size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
            <p className="text-slate-400 text-sm mt-0.5">Gestión global de tenants</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Sistema operativo</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Users size={16} className="text-violet-400" />
            </div>
            <Activity size={12} className="text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-white">{tenants.length}</div>
          <div className="text-sm text-slate-400 mt-0.5">Tenants totales</div>
        </div>
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 size={16} className="text-green-400" />
            </div>
            <Activity size={12} className="text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-white">{activeCount}</div>
          <div className="text-sm text-slate-400 mt-0.5">Tenants activos</div>
        </div>
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Shield size={16} className="text-amber-400" />
            </div>
            <Activity size={12} className="text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-white">{tenants.length - activeCount}</div>
          <div className="text-sm text-slate-400 mt-0.5">Suspendidos</div>
        </div>
      </div>

      {/* Tenant table */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-white">Tenants</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, subdominio..."
                className="bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-all w-56"
              />
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-all"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/3 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">{search ? 'Sin resultados' : 'Sin tenants registrados'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Subdominio</th>
                  <th className="px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Creado</th>
                  <th className="px-5 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {filtered.map((t) => {
                  const pc = planColor(t.plan)
                  return (
                    <tr key={t.id} className="hover:bg-white/3 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium text-white">{t.name}</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">ID-{t.id.toString().padStart(4, '0')}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs text-violet-300">{t.subdomain}</code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded"
                          style={{ background: pc.bg, color: pc.color }}
                        >
                          {t.plan || 'Sin plan'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {t.is_active
                            ? <><CheckCircle2 size={11} className="text-green-400" /><span className="text-xs text-green-400">Activo</span></>
                            : <><XCircle size={11} className="text-red-400" /><span className="text-xs text-red-400">Suspendido</span></>
                          }
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {new Date(t.created_at).toLocaleDateString('es')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-500/20 text-slate-500 hover:text-violet-400 transition-all opacity-0 group-hover:opacity-100">
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
