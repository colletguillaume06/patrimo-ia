'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Banknote, FileText,
  Calculator, Wrench, Bot, Download, ChevronRight, Sparkles
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
  latePaymentsCount?: number
}

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/biens', label: 'Mes biens', icon: Building2 },
  { href: '/loyers', label: 'Loyers', icon: Banknote },
  { href: '/baux', label: 'Baux', icon: FileText },
  { href: '/fiscalite', label: 'Fiscalité', icon: Calculator },
  { href: '/travaux', label: 'Travaux', icon: Wrench },
  { href: '/copilot', label: 'Copilot IA', icon: Bot },
]

const planColors = {
  starter: 'text-slate-400 border-slate-700',
  pro: 'text-blue-400 border-blue-800',
  premium: 'text-amber-400 border-amber-800',
}

const planLabels = {
  starter: 'Starter',
  pro: 'Pro',
  premium: 'Premium ✦',
}

export function Sidebar({ profile, latePaymentsCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col h-full w-60 bg-[#0D1B2E] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-white text-base tracking-tight">Propilot</span>
            <span className="font-display font-bold text-blue-400 text-base tracking-tight"> AI</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const isLoyers = href === '/loyers'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isLoyers && latePaymentsCount > 0 && (
                <span className="h-5 min-w-5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center px-1">
                  {latePaymentsCount}
                </span>
              )}
            </Link>
          )
        })}

        <div className="pt-3 mt-3 border-t border-white/[0.06]">
          <Link
            href="/exports"
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all duration-150"
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span>Exports</span>
          </Link>
        </div>
      </nav>

      {/* Plan indicator + user */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2">
        <div className={cn(
          'flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium',
          planColors[profile?.plan ?? 'starter']
        )}>
          <span>{planLabels[profile?.plan ?? 'starter']}</span>
          <ChevronRight className="h-3 w-3 opacity-60" />
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors">
          <div className="h-7 w-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-400">
              {getInitials(profile?.full_name ?? null)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {profile?.full_name ?? 'Mon compte'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
