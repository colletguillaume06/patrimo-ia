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

  // Rediriger vers l'onboarding si pas encore fait
  // (sauf si on est déjà sur /onboarding)
  if (profile && !(profile as any).onboarding_done) {
    // La vérification se fait côté page pour éviter la boucle
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
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6">
          <AutoLogout />
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
