import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/templates'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { z } from 'zod'

const schema = z.object({ payment_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const service = await createServiceClient()
  const { data: payment } = await service
    .from('payments')
    .select('*, lease:leases(tenant_name, tenant_email, monthly_rent, charges, property:properties(name, address, city, user_id))')
    .eq('id', parsed.data.payment_id)
    .single()

  if (!payment) return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
  if (payment.lease?.property?.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payment.lease?.tenant_email) return NextResponse.json({ error: 'Email locataire manquant' }, { status: 400 })

  const { data: profile } = await service.from('profiles').select('full_name').eq('id', user.id).single()
  const mois = format(new Date(payment.due_date), 'MMMM yyyy', { locale: fr })
  const adresse = [payment.lease.property.address, payment.lease.property.city].filter(Boolean).join(', ')

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a;">Quittance de loyer — ${mois}</h2>
      <p>Bonjour ${payment.lease.tenant_name},</p>
      <p>Nous vous confirmons la réception du règlement de votre loyer pour :</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;">Bien</td><td style="padding: 8px; border: 1px solid #ddd;">${payment.lease.property?.name ?? adresse}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;">Période</td><td style="padding: 8px; border: 1px solid #ddd;">${mois}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;">Loyer HC</td><td style="padding: 8px; border: 1px solid #ddd;">${payment.lease.monthly_rent?.toFixed(2) ?? 0} €</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;">Charges</td><td style="padding: 8px; border: 1px solid #ddd;">${payment.lease.charges?.toFixed(2) ?? 0} €</td></tr>
        <tr style="font-weight: bold;"><td style="padding: 8px; border: 1px solid #ddd;">Total</td><td style="padding: 8px; border: 1px solid #ddd;">${payment.amount.toFixed(2)} €</td></tr>
      </table>
      <p>La présente quittance ne vaut pas pour les sommes pouvant rester dues au titre d'arriérés éventuels.</p>
      <p>Cordialement,<br><strong>${profile?.full_name ?? 'Le propriétaire'}</strong></p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 11px; color: #666;">Quittance générée par Patrimo — ${format(new Date(), 'dd/MM/yyyy')}</p>
    </div>
  `

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@propilot.ai',
    to: payment.lease.tenant_email,
    subject: `Quittance de loyer — ${mois} — ${adresse}`,
    html,
  })

  if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 })

  await service.from('payments').update({
    quittance_sent_at: new Date().toISOString(),
    quittance_sent_email: payment.lease.tenant_email,
  } as any).eq('id', parsed.data.payment_id)

  return NextResponse.json({ success: true })
}
