'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Banknote, FileText,
  Wrench, Download, ChevronRight, Sparkles, TrendingUp,
  BarChart3, Users, FolderOpen, Mail, Settings
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

const planLabels: Record<string, string> = { starter: 'Starter', pro: 'Pro', premium: 'Premium ✦' }

export function Sidebar({ profile, latePaymentsCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className="flex flex-col h-full w-[220px] transition-colors"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#1B4FD8] to-[#0891B2] flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-[16px] tracking-tight"
            style={{ color: 'var(--text-primary)' }}>
            Propilot<span style={{ color: 'var(--brand)' }}> AI</span>
          </span>
        </div>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150"
              style={{
                background: active ? 'var(--brand-light)' : 'transparent',
                color: active ? 'var(--brand)' : 'var(--text-muted)',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' } }}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {href === '/loyers' && latePaymentsCount > 0 && (
                <span className="h-5 min-w-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
                  {latePaymentsCount}
                </span>
              )}
            </Link>
          )
        })}

        <div className="my-2" style={{ borderTop: '1px solid var(--border-subtle)' }} />

        {navSecondary.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
              style={{
                background: active ? 'var(--brand-light)' : 'transparent',
                color: active ? 'var(--brand)' : 'var(--text-subtle)',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-subtle)' } }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Copilot — feature star */}
      <div className="px-3 pb-3">
        <Link href="/copilot"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #1B4FD8, #0891B2)',
            boxShadow: '0 4px 12px rgba(27,79,216,0.25)',
          }}>
          <Sparkles className="h-[18px] w-[18px]" />
          Demander à Propilot
        </Link>
      </div>

      {/* User */}
      <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand-light)', border: '1px solid var(--brand)', opacity: 0.8 }}>
            <span className="text-[12px] font-bold" style={{ color: 'var(--brand)' }}>
              {getInitials(profile?.full_name ?? null)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name ?? 'Mon compte'}
            </p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--brand)' }}>
              {planLabels[profile?.plan ?? 'starter']}
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-subtle)' }} />
        </div>
      </div>
    </aside>
  )
}
