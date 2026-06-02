import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Route pour lier les baux existants à leurs fiches locataires par nom
export async function POST() {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Récupérer tous les locataires de l'utilisateur
  const { data: tenants } = await supabase.from('tenants').select('id, full_name').eq('user_id', user.id)

  let linked = 0
  for (const tenant of (tenants ?? [])) {
    // Trouver les baux avec ce nom de locataire mais sans tenant_id
    const { data: leases } = await service
      .from('leases')
      .select('id, property:properties(user_id)')
      .ilike('tenant_name', tenant.full_name)
      .is('tenant_id', null)

    for (const lease of (leases ?? [])) {
      if ((lease.property as any)?.user_id !== user.id) continue
      await service.from('leases').update({ tenant_id: tenant.id }).eq('id', lease.id)
      linked++
    }
  }

  return NextResponse.json({ success: true, liens_crees: linked })
}
