'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useBranding } from '@/components/providers/BrandingProvider'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface User { name: string; email: string; initials: string; role: string }

const NAV_GROUPS = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg> },
      { href: '/conversations', label: 'Conversaciones', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg> },
    ],
  },
  {
    label: 'VENTAS',
    items: [
      { href: '/pipeline', label: 'Pipeline CRM', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    ],
  },
  {
    label: 'AUTOMATIZACIÓN',
    items: [
      { href: '/automations', label: 'Automatizaciones', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: 'https://n8n.conectaai.cl', label: 'Editor n8n', external: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { href: '/settings/integrations', label: 'Canales', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: '/settings', label: 'Ajustes', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/></svg> },
      { href: '/settings/billing', label: 'Suscripción', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M1 10h22" stroke="currentColor" strokeWidth="2"/></svg> },
      { href: '/admin', label: 'SuperAdmin', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg> },
    ],
  },
]

function decodeJwt(token: string): Record<string, unknown> | null {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { branding } = useBranding()
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('omniflow_token')
    if (!token) { router.push('/login'); return }
    if (!decodeJwt(token)) { router.push('/login'); return }
    const cached = localStorage.getItem('omniflow_user')
    if (cached) {
      try {
        const u = JSON.parse(cached)
        const nm = u.full_name || u.email || 'Usuario'
        const initials = nm.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        setUser({ name: nm, email: u.email, initials, role: u.role || 'admin' })
      } catch { /* */ }
    }
  }, [router])

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('omniflow_token')
    localStorage.removeItem('omniflow_user')
    router.push('/login')
  }, [router])

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/settings') return pathname === href
    return pathname.startsWith(href)
  }

  const pc = branding?.settings?.primary_color || '#7c3aed'

  return (
    <div className="flex h-screen overflow-hidden bg-[#080812]">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`relative flex flex-col border-r border-white/5 bg-[#0a0a18] transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-64'}`}>

        {/* Logo */}
        <div className={`h-14 border-b border-white/5 flex items-center flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5 gap-3'}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${pc}, ${pc}99)`, boxShadow: `0 0 20px ${pc}40` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {!collapsed && (
              <span className="text-[15px] font-bold truncate text-white">
                {branding?.name || 'OmniFlow'}
              </span>
            )}
          </Link>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="ml-auto text-slate-700 hover:text-slate-400 transition-colors p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#0a0a18] border border-white/10 flex items-center justify-center text-slate-500 hover:text-white z-20 transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[9px] font-bold text-slate-700 tracking-[0.12em]">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = !item.external && isActive(item.href)
                  const inner = (
                    <div title={collapsed ? item.label : undefined}
                      className={`group flex items-center gap-3 rounded-xl text-sm transition-all duration-150 cursor-pointer relative
                        ${collapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
                        ${active ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}`}
                      style={active ? { background: `${pc}1a` } : {}}>
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: pc }} />
                      )}
                      <span className="flex-shrink-0" style={active ? { color: pc } : {}}>{item.icon}</span>
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && item.external && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="text-slate-700 flex-shrink-0">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )
                  if (item.external) return <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                  return <Link key={item.href} href={item.href}>{inner}</Link>
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5 p-2">
          {!collapsed && time && (
            <div className="flex items-center justify-between px-3 py-1.5 mb-1">
              <span className="text-[10px] text-slate-700 font-mono tabular-nums">{time}</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-green-700">En línea</span>
              </div>
            </div>
          )}
          {user && (
            <div className={`flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.03] transition-colors ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${pc}, ${pc}80)` }}>
                {user.initials}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-600 truncate capitalize">{user.role}</p>
                </div>
              )}
              <button onClick={handleLogout} title="Cerrar sesión"
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
