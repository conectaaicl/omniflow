'use client'
import api from '@/lib/api'

import React, { useEffect, useState, useCallback } from 'react'
import { useBranding } from '@/components/providers/BrandingProvider'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface User { name: string; email: string; initials: string; role: string; is_superuser?: boolean }
interface NavItem { href: string; label: string; icon: React.ReactNode; external?: boolean }
interface NavGroup { label: string; items: NavItem[] }

const NAV_BASE: NavGroup[] = [
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
      { href: '/broadcasts', label: 'Broadcasts', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: '/automations', label: 'Automatizaciones', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: 'https://n8n.conectaai.cl', label: 'Editor n8n', external: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: '/knowledge', label: 'IA & Conocimiento', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6L15 21H9l-.7-6C6.3 13.7 5 11.5 5 9a7 7 0 017-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
    { href: '/broadcasts', label: 'Broadcasts Masivos', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.9 14.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.81 4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 18.92z"/></svg> },
    { href: '/bookings', label: 'Calendario & Citas', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { href: '/analytics', label: 'Analytics', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { href: '/setup', label: 'Configuración Rápida', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { href: '/team', label: 'Equipo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
      { href: '/channels', label: 'Canales', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
      { href: '/settings', label: 'Ajustes', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/></svg> },
      { href: '/settings/billing', label: 'Suscripción', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M1 10h22" stroke="currentColor" strokeWidth="2"/></svg> },
    ],
  },
]

const SUPERADMIN_GROUP: NavGroup = {
  label: 'SISTEMA',
  items: [
    { href: '/admin', label: 'SuperAdmin', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg> },
  ],
}

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
    // Load from cache immediately for fast render
    const cached = localStorage.getItem('omniflow_user')
    if (cached) {
      try {
        const u = JSON.parse(cached)
        const nm = u.full_name || u.email || 'Usuario'
        const initials = nm.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        setUser({ name: nm, email: u.email, initials, role: u.role || 'admin', is_superuser: !!u.is_superuser })
      } catch { /* */ }
    }
    // Always refresh from API to get latest is_superuser flag
    api.get('/auth/me').then((r: any) => {
      const u = r.data
      const nm = u.full_name || u.email || 'Usuario'
      const initials = nm.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
      const fresh = { name: nm, email: u.email, initials, role: u.role || 'admin', is_superuser: !!u.is_superuser }
      setUser(fresh)
      localStorage.setItem('omniflow_user', JSON.stringify(u))
    }).catch(() => {})
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

  const pc = branding?.settings?.primary_color || '#00e5a0'

  return (
    <div className="flex h-screen overflow-hidden bg-[#080812]">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`relative flex flex-col border-r border-white/5 bg-[#0a0a18] transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-64'}`}>

        {/* Logo */}
        <div className={`h-14 border-b border-white/5 flex items-center flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5 gap-3'}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00e5a0, #00e5a099)', boxShadow: '0 0 20px #00e5a040' }}>
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
          {[...NAV_BASE, ...(user?.is_superuser ? [SUPERADMIN_GROUP] : [])].map((group) => (
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
                className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-[11px] font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Salir
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
