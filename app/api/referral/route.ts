import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — récupérer son code parrainage et ses stats
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, referral_count, months_offered, full_name')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    referral_code: profile?.referral_code,
    referral_count: profile?.referral_count ?? 0,
    months_offered: profile?.months_offered ?? 0,
    referral_link: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${profile?.referral_code}`,
  })
}

// POST — enregistrer un parrainage lors de l'inscription
export async function POST(req: NextRequest) {
  const { referral_code, new_user_id } = await req.json()
  if (!referral_code || !new_user_id) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  // Cette route crédite des mois d'abonnement : elle doit être authentifiée et
  // ne rien accepter d'autre que le compte de l'appelant, sinon n'importe qui
  // peut créditer un parrain en boucle ou écrire sur le profil d'autrui.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id !== new_user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = await createServiceClient()

  // Anti-rejeu : un filleul ne peut être parrainé qu'une seule fois.
  const { data: filleul } = await service
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .single()
  if (filleul?.referred_by) {
    return NextResponse.json({ error: 'Parrainage déjà enregistré' }, { status: 409 })
  }

  // Trouver le parrain
  const { data: parrain } = await service
    .from('profiles')
    .select('id, referral_count, months_offered')
    .eq('referral_code', referral_code.toUpperCase())
    .single()

  if (!parrain) return NextResponse.json({ error: 'Code invalide' }, { status: 404 })
  if (parrain.id === new_user_id) return NextResponse.json({ error: 'Auto-parrainage interdit' }, { status: 400 })

  // Mettre à jour le parrain : +1 filleul, +2 mois offerts
  await service.from('profiles').update({
    referral_count: (parrain.referral_count ?? 0) + 1,
    months_offered: (parrain.months_offered ?? 0) + 2,
  }).eq('id', parrain.id)

  // Enregistrer le parrain sur le nouveau compte
  await service.from('profiles').update({
    referred_by: referral_code.toUpperCase(),
  }).eq('id', new_user_id)

  return NextResponse.json({ success: true, message: 'Parrainage enregistré — 2 mois offerts au parrain' })
}
