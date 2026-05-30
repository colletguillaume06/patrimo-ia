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
    <header className="sticky top-0 z-20 h-14 flex items-center gap-4 px-6 bg-white/90 backdrop-blur-md border-b border-[#E5E2DB]">
      <MobileNav profile={profile} latePaymentsCount={latePaymentsCount} />
      <h1 className="font-display font-semibold text-[18px] text-[#0A0908] flex-1">{title}</h1>
      <NotificationsPanel />
    </header>
  )
}
