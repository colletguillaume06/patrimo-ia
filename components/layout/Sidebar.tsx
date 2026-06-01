'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, Banknote, FileText,
  Wrench, Download, ChevronRight, Sparkles, TrendingUp, Landmark,
  BarChart3, Users, FolderOpen, Mail, Settings, BookOpen,
  FlaskConical, Loader2, LogOut
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { Logo } from '@/components/layout/Logo'
import { toast } from 'sonner'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
  latePaymentsCount?: number
}

const navGroups = [
  {
    label: '🏠 Mon patrimoine',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: false },
      { href: '/biens', label: 'Mes biens', icon: Building2, badge: false },
      { href: '/patrimoine', label: 'Valorisation', icon: TrendingUp, badge: false },
    ],
  },
  {
    label: '💰 Gestion locative',
    items: [
      { href: '/loyers', label: 'Loyers', icon: Banknote, badge: true },
      { href: '/baux', label: 'Baux', icon: FileText, badge: false },
      { href: '/rapprochement', label: 'Rapprochement', icon: Landmark, badge: false },
    ],
  },
  {
    label: '🔧 Charges & travaux',
    items: [
      { href: '/travaux', label: 'Travaux', icon: Wrench, badge: false },
      { href: '/exports', label: 'Exports', icon: Download, badge: false },
    ],
  },
  {
    label: '📊 Fiscalité',
    items: [
      { href: '/fiscal', label: 'Déclaration', icon: BarChart3, badge: false },
      { href: '/fiscalite/declaration', label: 'Aide déclaration', icon: BookOpen, badge: false },
    ],
  },
  {
    label: '📁 Outils',
    items: [
      { href: '/emails', label: 'Emails', icon: Mail, badge: false },
      { href: '/contacts', label: 'Contacts', icon: Users, badge: false },
      { href: '/documents', label: 'Documents', icon: FolderOpen, badge: false },
      { href: '/courriers', label: 'Courriers', icon: Mail, badge: false },
    ],
  },
]

const planLabels: Record<string, string> = { starter: 'Starter', pro: 'Pro', premium: 'Premium ✦' }

export function Sidebar({ profile, latePaymentsCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [loadingLogout, setLoadingLogout] = useState(false)

  // Groupes ouverts par défaut : celui qui contient la page active
  const defaultOpen = navGroups.reduce((acc, g) => {
    const hasActive = g.items.some(item =>
      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    )
    acc[g.label] = hasActive
    return acc
  }, {} as Record<string, boolean>)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpen)

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  const handleLogout = async () => {
    setLoadingLogout(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
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
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        {navGroups.map(group => {
          const isOpen = !!openGroups[group.label]
          const hasActiveChild = group.items.some(item => isActive(item.href))
          return (
            <div key={group.label}>
              {/* En-tête cliquable du groupe */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all duration-150 hover:opacity-80"
                style={{
                  color: hasActiveChild ? 'var(--accent)' : 'var(--text-tertiary)',
                  background: hasActiveChild && !isOpen ? 'var(--brand-light, #EEF3FF)' : 'transparent',
                }}
              >
                <span>{group.label}</span>
                <ChevronRight
                  className="h-3 w-3 flex-shrink-0 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* Items (visible si ouvert) */}
              {isOpen && (
                <div className="mt-0.5 ml-2 space-y-0.5">
                  {group.items.map(({ href, label, icon: Icon, badge }) => {
                    const active = isActive(href)
                    return (
                      <Link key={href} href={href}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                        style={{
                          background: active ? 'var(--brand-light, #EEF3FF)' : 'transparent',
                          color: active ? 'var(--accent)' : 'var(--text-secondary)',
                        }}>
                        <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                        <span className="flex-1">{label}</span>
                        {badge && latePaymentsCount > 0 && (
                          <span className="h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                            {latePaymentsCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Paramètres */}
        <div>
          <div className="space-y-0.5">
            <Link href="/parametres"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: isActive('/parametres') ? 'var(--brand-light, #EEF3FF)' : 'transparent',
                color: isActive('/parametres') ? 'var(--accent)' : 'var(--text-tertiary)',
              }}>
              <Settings className="h-4 w-4 flex-shrink-0" />
              Paramètres
            </Link>
          </div>
        </div>

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
          <button
            onClick={handleLogout}
            disabled={loadingLogout}
            title="Se déconnecter"
            className="p-1 rounded-lg transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            {loadingLogout
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
              : <LogOut className="h-3.5 w-3.5 text-red-400" />
            }
          </button>
        </div>
      </div>
    </aside>
  )
}
