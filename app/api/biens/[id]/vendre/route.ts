import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  sold_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sale_price: z.number().positive(),
})

type Ctx = { params: Promise<{ id: string }> }

// Marquer un bien comme vendu : enregistre la cession, clôture les baux en cours
// et supprime les loyers à venir (pas encore échus à la date de vente).
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Date ou prix de vente invalide' }, { status: 400 })
  const { sold_at, sale_price } = parsed.data

  const { data: property } = await supabase
    .from('properties')
    .select('id, sold_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!property) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
  if (property.sold_at) return NextResponse.json({ error: 'Ce bien est déjà marqué comme vendu' }, { status: 409 })

  const { error: propErr } = await supabase
    .from('properties')
    .update({ sold_at, sale_price })
    .eq('id', id)
    .eq('user_id', user.id)
  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })

  // Baux en cours : désactivés, fin de bail ramenée à la date de vente
  const { data: leases } = await supabase
    .from('leases')
    .select('id, end_date')
    .eq('property_id', id)
    .eq('is_active', true)

  const leaseIds = (leases ?? []).map(l => l.id)
  for (const l of leases ?? []) {
    const end_date = l.end_date && l.end_date < sold_at ? l.end_date : sold_at
    await supabase.from('leases').update({ is_active: false, end_date }).eq('id', l.id)
  }

  // Loyers à venir (non échus à la date de vente) : supprimés, sinon appels et relances continueraient
  let loyers_supprimes = 0
  if (leaseIds.length > 0) {
    const { data: deleted } = await supabase
      .from('payments')
      .delete()
      .in('lease_id', leaseIds)
      .eq('status', 'pending')
      .gt('due_date', sold_at)
      .select('id')
    loyers_supprimes = deleted?.length ?? 0
  }

  return NextResponse.json({ ok: true, baux_clos: leaseIds.length, loyers_supprimes })
}
