import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await createServiceClient()

  // Supprimer toutes les propriétés (cascade sur toutes les tables liées)
  const { data: props } = await service
    .from('properties')
    .select('id')
    .eq('user_id', user.id)

  if (props && props.length > 0) {
    await service.from('properties').delete().in('id', props.map(p => p.id))
  }

  // Supprimer les messages IA
  await service.from('ai_messages').delete().eq('user_id', user.id)

  // Supprimer les déficits fonciers
  await service.from('deficits_fonciers').delete().eq('user_id', user.id)

  // Supprimer les documents
  await service.from('documents').delete().eq('user_id', user.id)

  // Reset profil → onboarding non fait, mode démo désactivé
  await service.from('profiles').update({
    onboarding_done: false,
    demo_mode: false,
  } as any).eq('id', user.id)

  return NextResponse.json({ success: true })
}
