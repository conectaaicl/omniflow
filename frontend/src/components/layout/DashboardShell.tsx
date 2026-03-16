'use client'

import React, { useEffect, useState } from 'react'
import { useBranding } from '@/components/providers/BrandingProvider'
import {
  LogOut, LayoutDashboard, MessageSquare, Zap, Settings,
  Target, Shield, CreditCard, Plug, ChevronRight, Wifi
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',        href: '/dashboard' },
  { icon: MessageSquare,   label: 'Conversaciones',   href: '/conversations' },
  { icon: Target,          label: 'Pipeline CRM',     href: '/pipeline' },
  { icon: Zap,             label: 'Automatizaciones', href: '/automations' },
  { icon: Plug,            label: 'Integraciones',    href: '/settings/integrations' },
  { icon: Settings,        label: 'Ajustes',          href: '/settings' },
  { icon: CreditCard,      label: 'Suscripción',      href: '/settings/billing' },
  { icon: Shield,          label: 'Admin Global',     href: '/admin' },
]

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { branding } = useBranding()
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; initials: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('omniflow_token')
    if (!token) {
      router.push('/login')
      return
    }
    const payload = decodeJwt(token)
    if (!payload) {
      router.push('/login')
      return
    }
    // Try cached user info first
    const cached = localStorage.getItem('omniflow_user')
    if (cached) {
      try {
        const u = JSON.parse(cached)
        const initials = (u.full_name || u.email || 'U')
          .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        setUser({ name: u.full_name || u.email, email: u.email, initials })
      } catch { /* ignore */ }
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('omniflow_token')
    localStorage.removeItem('omniflow_user')
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/settings') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080812]">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-64 flex flex-col border-r border-white/5 bg-[#0d0d1a]">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Wifi size={16} className="text-white" />
            </div>
            {branding?.settings?.logo_url ? (
              <img src={branding.settings.logo_url} alt={branding.name} className="h-6 w-auto object-contain" />
            ) : (
              <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                {branding?.name || 'OmniFlow'}
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}>
                <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-violet-600/20 text-violet-300 font-medium'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}>
                  <Icon size={17} className={active ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={13} className="text-violet-400/60" />}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/5 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150"
          >
            <LogOut size={17} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
