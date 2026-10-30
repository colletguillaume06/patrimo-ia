import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Resynchronise le loyer de chaque fiche (lease.monthly_rent) sur le dernier
// loyer réellement encaissé, afin que la fiche bien reflète toujours le montant
// le plus récent (révisions IRL incluses). Exécuté quotidiennement.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const service = await createServiceClient()
  const updates: { lease: string; from: number; to: number }[] = []
  const errors: string[] = []

  // Tous les baux actifs
  const { data: leases, error: leaseErr } = await service
    .from('leases')
    .select('id, tenant_name, monthly_rent, is_active')
    .eq('is_active', true)

  if (leaseErr) {
    return NextResponse.json({ error: leaseErr.message }, { status: 500 })
  }

  for (const lease of (leases ?? [])) {
    // Derniers paiements encaissés pour ce bail (par date d'échéance décroissante)
    const { data: payments, error: payErr } = await service
      .from('payments')
      .select('amount, due_date, status')
      .eq('lease_id', lease.id)
      .eq('status', 'paid')
      .order('due_date', { ascending: false })
      .limit(6)

    if (payErr) {
      errors.push(`${lease.tenant_name}: ${payErr.message}`)
      continue
    }
    if (!payments || payments.length === 0) continue

    // Le montant le plus récent encaissé
    const latest = Number(payments[0].amount)
    if (!latest || latest <= 0) continue

    // Garde-fou : ignorer un paiement partiel/anormal isolé.
    // On retient le montant uniquement s'il est confirmé par un autre
    // paiement récent de même valeur, ou s'il n'y a qu'un seul paiement.
    const sameAsLatest = payments.filter(p => Number(p.amount) === latest).length
    if (payments.length > 1 && sameAsLatest < 2) continue

    const current = Number(lease.monthly_rent)
    if (current === latest) continue

    const { error: updErr } = await service
      .from('leases')
      .update({ monthly_rent: latest })
      .eq('id', lease.id)

    if (updErr) {
      errors.push(`${lease.tenant_name}: ${updErr.message}`)
    } else {
      updates.push({ lease: lease.tenant_name, from: current, to: latest })
    }
  }

  return NextResponse.json({
    success: true,
    updated: updates.length,
    updates,
    errors,
    message: `${updates.length} loyer(s) resynchronisé(s)`,
  })
}
