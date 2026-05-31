'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Stethoscope, CreditCard, Building, Users, Wrench, Shield, BarChart2, RefreshCw } from 'lucide-react'

// Map des icônes par nom (string) → évite de passer des composants non-sérialisables
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope, CreditCard, Building, Users, Wrench, Shield, BarChart2, RefreshCw,
}

interface Tab {
  href: string
  label: string
  icon?: string  // nom de l'icône en string
}

interface TabNavProps {
  tabs: Tab[]
}

export function TabNav({ tabs }: TabNavProps) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 p-1 rounded-xl overflow-x-auto"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      {tabs.map(tab => {
        const isActive = tabs[0].href === tab.href
          ? pathname === tab.href
          : pathname.startsWith(tab.href)

        const Icon = tab.icon ? ICON_MAP[tab.icon] : null

        return (
          <Link key={tab.href} href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              isActive
                ? 'bg-white text-[#1D4ED8] shadow-sm font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/50'
            )}
            style={isActive ? { color: '#1D4ED8' } : {}}>
            {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
