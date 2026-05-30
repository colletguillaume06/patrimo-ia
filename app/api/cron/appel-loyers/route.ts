import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/templates'
import { format, addMonths, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

// Cron : POST /api/cron/appel-loyers
// À appeler le 25 de chaque mois (via Vercel Cron ou webhook externe)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { data: leases } = await service
    .from('leases')
    .select('*, property:properties(name, address, city, user_id, profiles:profiles(full_name, iban, bic))')
    .eq('is_active', true)
    .eq('appel_loyer_actif', true)
    .not('tenant_email', 'is', null)

  let sent = 0
  const nextMonth = addMonths(new Date(), 1)
  const nextMonthLabel = format(nextMonth, 'MMMM yyyy', { locale: fr })
  const echeance = `le 5 ${nextMonthLabel}`

  for (const lease of leases ?? []) {
    // Créer le paiement du mois prochain si pas déjà existant
    const startNext = startOfMonth(nextMonth)
    const { data: existing } = await service
      .from('payments')
      .select('id')
      .eq('lease_id', lease.id)
      .eq('due_date', format(startNext, 'yyyy-MM-') + '05')
      .single()

    if (!existing) {
      await service.from('payments').insert({
        lease_id: lease.id,
        amount: lease.monthly_rent + (lease.charges ?? 0),
        due_date: format(startNext, 'yyyy-MM-') + '05',
        status: 'pending',
      })
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Appel de loyer — ${nextMonthLabel}</h2>
        <p>Bonjour ${lease.tenant_name},</p>
        <p>Votre loyer pour <strong>${lease.property?.name ?? lease.property?.address}</strong> est à régler ${echeance}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border: 1px solid #eee;">Loyer HC</td><td style="padding: 8px; border: 1px solid #eee; text-align: right;">${lease.monthly_rent?.toFixed(2)} €</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;">Charges</td><td style="padding: 8px; border: 1px solid #eee; text-align: right;">${(lease.charges ?? 0).toFixed(2)} €</td></tr>
          <tr style="font-weight: bold; background: #f5f5f5;"><td style="padding: 8px; border: 1px solid #eee;">Total à régler</td><td style="padding: 8px; border: 1px solid #eee; text-align: right;">${(lease.monthly_rent + (lease.charges ?? 0)).toFixed(2)} €</td></tr>
        </table>
        <p>Cordialement,<br><strong>${lease.property?.profiles?.full_name ?? 'Votre propriétaire'}</strong></p>
      </div>
    `

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@propilot.ai',
      to: lease.tenant_email!,
      subject: `Appel de loyer — ${nextMonthLabel} — ${lease.property?.address ?? lease.property?.name}`,
      html,
    })
    sent++
  }

  return NextResponse.json({ success: true, sent })
}
