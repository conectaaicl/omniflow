'use client'

import { usePathname } from 'next/navigation'
import DashboardShell from './layout/DashboardShell'

const PUBLIC_ROUTES = ['/', '/login']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  if (isPublic) return <>{children}</>
  return <DashboardShell>{children}</DashboardShell>
}
