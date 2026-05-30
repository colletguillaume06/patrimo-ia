'use client'

import { MobileNav } from './MobileNav'
import { NotificationsPanel } from './NotificationsPanel'
import { ThemeToggle } from './ThemeToggle'
import type { Profile } from '@/types'

interface TopbarProps {
  title: string
  profile: Profile | null
  latePaymentsCount?: number
}

export function Topbar({ title, profile, latePaymentsCount = 0 }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 h-14 flex items-center gap-4 px-6 backdrop-blur-md border-b transition-colors"
      style={{ background: 'var(--topbar-bg)', borderColor: 'var(--border)' }}>
      <MobileNav profile={profile} latePaymentsCount={latePaymentsCount} />
      <h1 className="font-display font-semibold text-lg flex-1"
          style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationsPanel />
      </div>
    </header>
  )
}
