'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { Profile } from '@/types'

interface MobileNavProps {
  profile: Profile | null
  latePaymentsCount?: number
}

export function MobileNav({ profile, latePaymentsCount }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="md:hidden h-9 w-9 rounded-lg bg-bg-tertiary/30 border border-border flex items-center justify-center"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4 text-text-tertiary" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-60 shadow-2xl">
            <button
              className="absolute top-4 right-4 z-10 h-8 w-8 rounded-lg bg-white/[0.08] flex items-center justify-center"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 text-text-secondary" />
            </button>
            <Sidebar profile={profile} latePaymentsCount={latePaymentsCount} />
          </div>
        </div>
      )}
    </>
  )
}
