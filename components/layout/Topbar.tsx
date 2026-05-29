'use client'

import { MobileNav } from './MobileNav'
import { NotificationsPanel } from './NotificationsPanel'
import type { Profile } from '@/types'

interface TopbarProps {
  title: string
  profile: Profile | null
  latePaymentsCount?: number
}

export function Topbar({ title, profile, latePaymentsCount = 0 }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 h-14 flex items-center gap-4 px-6 bg-[#0B1628]/80 backdrop-blur-md border-b border-white/[0.06]">
      <MobileNav profile={profile} latePaymentsCount={latePaymentsCount} />
      <h1 className="font-display font-semibold text-white text-lg flex-1">{title}</h1>
      <NotificationsPanel />
    </header>
  )
}
