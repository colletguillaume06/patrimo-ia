import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()
  const service = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // `properties.user_id` et `ai_messages.user_id` référencent `profiles` SANS "on delete
  // cascade" (supabase/migrations/001_schema.sql) : supprimer le profil avant elles échoue
  // avec une violation de contrainte FK dès que l'utilisateur a au moins un bien ou un
  // message IA — donc pour la quasi-totalité des comptes réels. La RLS ne fait pas de
  // cascade (contrairement à ce que l'ancien commentaire supposait), il faut supprimer ces
  // données explicitement, comme le font déjà app/api/demo/reset et app/api/demo/toggle.
  const { data: props } = await service.from('properties').select('id').eq('user_id', user.id)
  if (props?.length) await service.from('properties').delete().in('id', props.map(p => p.id))
  await service.from('ai_messages').delete().eq('user_id', user.id)
  await service.from('deficits_fonciers').delete().eq('user_id', user.id)
  await service.from('documents').delete().eq('user_id', user.id)

  // Supprimer le profil puis le compte auth
  await service.from('profiles').delete().eq('id', user.id)
  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
