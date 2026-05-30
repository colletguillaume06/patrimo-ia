import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from './(marketing)/page'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Connecté → dashboard
  if (user) redirect('/dashboard')
  // Non connecté → afficher la landing
  return <LandingPage />
}
