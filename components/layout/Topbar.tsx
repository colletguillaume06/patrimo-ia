'use client'

import { Bell, Search } from 'lucide-react'
import { MobileNav } from './MobileNav'
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
      <div className="flex items-center gap-2">
        <button className="relative h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.07] transition-colors">
          <Bell className="h-4 w-4 text-slate-400" />
          {latePaymentsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {latePaymentsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
