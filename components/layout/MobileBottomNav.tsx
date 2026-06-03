'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Banknote, Users, Sparkles } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/biens', label: 'Biens', icon: Building2 },
  { href: '/loyers', label: 'Loyers', icon: Banknote },
  { href: '/locataires', label: 'Locataires', icon: Users },
  { href: '/copilot', label: 'IA', icon: Sparkles },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
