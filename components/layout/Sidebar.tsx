'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Banknote, FileText,
  Calculator, Wrench, Bot, Download, ChevronRight,
  Sparkles, TrendingUp, BarChart3, Users, FolderOpen,
  Mail, Settings
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
  { href: '/patrimoine', label: 'Patrimoine', icon: TrendingUp },
  { href: '/loyers', label: 'Loyers', icon: Banknote },
  { href: '/baux', label: 'Baux', icon: FileText },
  { href: '/travaux', label: 'Travaux', icon: Wrench },
  { href: '/fiscal', label: 'Déclaration', icon: BarChart3 },
  { href: '/exports', label: 'Exports', icon: Download },
]

const navSecondary = [
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/courriers', label: 'Courriers', icon: Mail },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
]

const planLabels = { starter: 'Starter', pro: 'Pro', premium: 'Premium ✦' }
const planColors = { starter: 'text-gray-500', pro: 'text-[#1B4FD8]', premium: 'text-amber-600' }

export function Sidebar({ profile, latePaymentsCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className="flex flex-col h-full w-[220px] bg-white border-r border-[#E5E2DB]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#EEECE8]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#1B4FD8] to-[#0891B2] flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-[16px] text-[#0A0908] tracking-tight">
            Propilot<span className="text-[#1B4FD8]"> AI</span>
          </span>
        </div>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const isLoyers = href === '/loyers'
          return (
            <Link key={href} href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150',
                active ? 'bg-[#EEF3FF] text-[#1B4FD8]' : 'text-[#1A1714] hover:bg-[#F0EEE9] hover:text-[#0A0908]'
              )}>
              <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active ? 'text-[#1B4FD8]' : 'text-[#3D3A36] group-hover:text-[#1A1714]')} />
              <span className="flex-1">{label}</span>
              {isLoyers && latePaymentsCount > 0 && (
                <span className="h-5 min-w-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
                  {latePaymentsCount}
                </span>
              )}
            </Link>
          )
        })}

        <div className="my-2 border-t border-[#EEECE8]" />

        {navSecondary.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150',
                active ? 'bg-[#EEF3FF] text-[#1B4FD8]' : 'text-[#3D3A36] hover:bg-[#F0EEE9] hover:text-[#1A1714]'
              )}>
              <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-[#1B4FD8]' : 'text-[#6B6560]')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Copilot — feature star */}
      <div className="px-3 pb-3">
        <Link href="/copilot"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200',
            isActive('/copilot')
              ? 'bg-[#1B4FD8] text-white'
              : 'bg-gradient-to-r from-[#1B4FD8] to-[#0891B2] text-white shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 hover:-translate-y-0.5'
          )}>
          <Sparkles className="h-[18px] w-[18px]" />
          Demander à Propilot
        </Link>
      </div>

      {/* User */}
      <div className="px-4 pb-4 border-t border-[#EEECE8] pt-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#EEF3FF] border border-[#C7D9FF] flex items-center justify-center flex-shrink-0">
            <span className="text-[12px] font-bold text-[#1B4FD8]">
              {getInitials(profile?.full_name ?? null)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#0A0908] truncate">{profile?.full_name ?? 'Mon compte'}</p>
            <p className={cn('text-[11px] font-medium', planColors[profile?.plan ?? 'starter'])}>
              {planLabels[profile?.plan ?? 'starter']}
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-[#6B6560] flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
