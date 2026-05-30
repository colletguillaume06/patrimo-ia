'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tab {
  href: string
  label: string
  icon?: LucideIcon
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
        // Exact match pour le premier onglet, startsWith pour les autres
        const isActive = tabs[0].href === tab.href
          ? pathname === tab.href
          : pathname.startsWith(tab.href)

        return (
          <Link key={tab.href} href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              isActive
                ? 'bg-white text-[#1D4ED8] shadow-sm font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/50'
            )}
            style={isActive ? { color: '#1D4ED8' } : {}}>
            {tab.icon && <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />}
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
