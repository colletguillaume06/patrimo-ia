import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { AutoLogout } from '@/components/auth/AutoLogout'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Vérification accès : trial / abonnement actif / admin
  const p = profile as any
  if (p) {
    const status = p.subscription_status ?? 'trial'
    const isExpired = status === 'trial' && p.trial_ends_at && new Date(p.trial_ends_at) < new Date()
    const isBlocked = status === 'expired' || isExpired

    // Mettre à jour le statut si trial expiré
    if (isExpired && status !== 'expired') {
      await supabase.from('profiles').update({ subscription_status: 'expired' }).eq('id', user.id)
    }

    // Bloquer l'accès sauf pages admin, onboarding et acces-expire
    // (la vérification URL se fait côté middleware, ici on redirige simplement)
    if (isBlocked) {
      // On ne bloque pas ici pour éviter les boucles — géré par le composant
    }
  }

  const { count: lateCount } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'late')

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar profile={profile as Profile} latePaymentsCount={lateCount ?? 0} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          title=""
          profile={profile as Profile}
          latePaymentsCount={lateCount ?? 0}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <AutoLogout />
          {children}
        </main>
      </div>
      {/* Navigation mobile bas d'écran — cachée sur desktop */}
      <MobileBottomNav />
    </div>
  )
}
