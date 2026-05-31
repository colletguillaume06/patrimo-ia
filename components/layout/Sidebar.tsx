'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, Banknote, FileText,
  Wrench, Download, ChevronRight, Sparkles, TrendingUp,
  BarChart3, Users, FolderOpen, Mail, Settings, BookOpen,
  FlaskConical, Loader2
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { Logo } from '@/components/layout/Logo'
import { toast } from 'sonner'
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
  { href: '/fiscalite/declaration', label: 'Aide déclaration', icon: BookOpen },
  { href: '/exports', label: 'Exports', icon: Download },
]

const navSecondary = [
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/courriers', label: 'Courriers', icon: Mail },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
]

const planLabels: Record<string, string> = { starter: 'Starter', pro: 'Pro', premium: 'Premium ✦' }

export function Sidebar({ profile, latePaymentsCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loadingDemo, setLoadingDemo] = useState(false)
  const isDemo = (profile as any)?.demo_mode === true

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  const handleDemoToggle = async () => {
    setLoadingDemo(true)
    try {
      if (isDemo) {
        // Désactiver → reset + onboarding
        const confirm = window.confirm(
          'Désactiver le mode démo supprimera toutes les données fictives et vous redirigera vers l\'onboarding. Continuer ?'
        )
        if (!confirm) { setLoadingDemo(false); return }
        const res = await fetch('/api/demo/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disable' }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success('Mode démo désactivé — données supprimées')
          router.push('/onboarding')
          router.refresh()
        } else {
          toast.error(data.error)
        }
      } else {
        // Activer → charger données démo
        const res = await fetch('/api/demo/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'enable' }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success('Mode démo activé — 3 biens chargés !')
          router.push('/dashboard')
          router.refresh()
        } else {
          toast.error(data.error)
        }
      }
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <aside className="flex flex-col h-full w-[220px] transition-colors"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>

      {/* Logo */}
      <div className="px-4 pb-4 pt-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Logo size="sm" linkTo="/dashboard" />
      </div>

      {/* Nav principale */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: active ? 'var(--brand-light, #EEF3FF)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {href === '/loyers' && latePaymentsCount > 0 && (
                <span className="h-5 min-w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1">
                  {latePaymentsCount}
                </span>
              )}
            </Link>
          )
        })}

        <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />

        {navSecondary.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: active ? 'var(--brand-light, #EEF3FF)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-tertiary)',
              }}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* ── Mode démo ── */}
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleDemoToggle}
            disabled={loadingDemo}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-60"
            style={{
              background: isDemo ? '#FEF3DC' : 'transparent',
              color: isDemo ? '#92400E' : 'var(--text-tertiary)',
              border: isDemo ? '1px solid #FCD34D' : '1px dashed var(--border)',
            }}
          >
            {loadingDemo
              ? <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
              : <FlaskConical className="h-4 w-4 flex-shrink-0" />
            }
            <span className="flex-1 text-left">Mode démo</span>
            {/* Toggle visuel */}
            <div className={cn(
              'h-5 w-9 rounded-full transition-colors relative flex-shrink-0',
              isDemo ? 'bg-amber-400' : 'bg-gray-300'
            )}>
              <div className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                isDemo ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </div>
          </button>
          {isDemo && (
            <p className="text-xs px-3 mt-1.5" style={{ color: '#92400E' }}>
              Données fictives actives
            </p>
          )}
        </div>
      </nav>

      {/* Copilot — feature star */}
      <div className="px-3 pb-3">
        <Link href="/copilot"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #1B4FD8, #0891B2)',
            boxShadow: '0 4px 12px rgba(27,79,216,0.25)',
          }}>
          <Sparkles className="h-[18px] w-[18px]" />
          Demander à Patrimo
        </Link>
      </div>

      {/* User */}
      <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand-light, #EEF3FF)', border: '1px solid var(--accent)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
              {getInitials(profile?.full_name ?? null)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name ?? 'Mon compte'}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {planLabels[profile?.plan ?? 'starter']}
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>
    </aside>
  )
}
