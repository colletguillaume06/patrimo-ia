import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const service = await createServiceClient()

  // Vérifier que l'appelant est admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { email, full_name, type } = await req.json()
  // type: 'free' (accès gratuit permanent) | 'trial_3m' (3 mois) | 'trial_6m' (6 mois)

  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  // Vérifier si l'utilisateur existe déjà
  const { data: existingUsers } = await service.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Créer le compte
    const password = Math.random().toString(36).slice(-10) + 'Aa1!'
    const { data: newUser, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    })
    if (error || !newUser.user) return NextResponse.json({ error: error?.message || 'Erreur création' }, { status: 500 })
    userId = newUser.user.id
  }

  // Calculer trial_ends_at selon le type
  const trialMap: Record<string, string> = {
    free: '2099-12-31',
    trial_3m: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    trial_6m: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
  }
  const trialEnd = trialMap[type] || trialMap.trial_3m
  const status = type === 'free' ? 'admin_free' : 'trial'

  // Mettre à jour le profil
  await service.from('profiles').update({
    subscription_status: status,
    trial_ends_at: trialEnd,
    full_name: full_name || undefined,
  }).eq('id', userId)

  return NextResponse.json({
    success: true,
    message: `Accès ${type} accordé à ${email}`,
    user_id: userId,
    trial_ends_at: trialEnd,
  })
}
