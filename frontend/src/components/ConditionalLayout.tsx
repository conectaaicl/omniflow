'use client'

import { usePathname } from 'next/navigation'
import DashboardShell from './layout/DashboardShell'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/pricing', '/checkout', '/payment-pending', '/payment-success']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (isPublic) return <>{children}</>
  return <DashboardShell>{children}</DashboardShell>
}
