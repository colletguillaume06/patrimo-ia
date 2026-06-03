import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { format, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const service = await createServiceClient()
  const now = new Date()
  // Quittance du mois précédent (le 1er du mois on envoie la quittance du mois passé)
  const moisPrecedent = subMonths(now, 1)
  const moisStr = format(moisPrecedent, 'MMMM yyyy', { locale: fr })
  const dueDatePrefix = format(moisPrecedent, 'yyyy-MM')

  // Récupérer tous les paiements du mois précédent marqués "paid" avec email locataire
  // Respecte les 3 niveaux de toggle : profil → bien → bail
  const { data: payments } = await service
    .from('payments')
    .select(`
      id, amount, due_date, status,
      lease:leases(
        id, tenant_name, tenant_email, monthly_rent, charges, quittances_auto,
        property:properties(id, name, address, city, user_id, quittances_auto)
      )
    `)
    .eq('status', 'paid')
    .like('due_date', `${dueDatePrefix}%`)
    .is('quittance_sent_at', null)

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const payment of (payments ?? [])) {
    const lease = payment.lease as any
    if (!lease?.tenant_email) { skipped++; continue }

    // Vérifier le toggle niveau profil (propriétaire)
    const { data: ownerProfile } = await service
      .from('profiles')
      .select('quittances_auto')
      .eq('id', lease.property?.user_id)
      .single()
    if (ownerProfile?.quittances_auto === false) { skipped++; continue }

    // Vérifier le toggle niveau bien
    if (lease.property?.quittances_auto === false) { skipped++; continue }

    // Vérifier le toggle niveau bail
    if (lease.quittances_auto === false) { skipped++; continue }

    // Récupérer le profil du propriétaire
    const { data: profile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', lease.property?.user_id)
      .single()

    const adresse = [lease.property?.address, lease.property?.city].filter(Boolean).join(', ')
    const loyer = Number(lease.monthly_rent ?? 0)
    const charges = Number(lease.charges ?? 0)
    const total = Number(payment.amount ?? (loyer + charges))

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1D4ED8, #0891B2); padding: 28px 36px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Quittance de loyer</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">${moisStr}</p>
        </div>
        <div style="padding: 36px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Bonjour ${lease.tenant_name},
          </p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Nous vous confirmons avoir bien reçu votre règlement pour le mois de <strong>${moisStr}</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr style="background: #F8FAFC;">
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #64748B;">Bien loué</td>
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #0F172A; font-weight: 500;">${lease.property?.name || adresse}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #64748B;">Adresse</td>
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #0F172A;">${adresse || '—'}</td>
            </tr>
            <tr style="background: #F8FAFC;">
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #64748B;">Période</td>
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #0F172A;">${moisStr}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #64748B;">Loyer hors charges</td>
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #0F172A;">${loyer.toFixed(2)} €</td>
            </tr>
            <tr style="background: #F8FAFC;">
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #64748B;">Charges</td>
              <td style="padding: 12px 16px; border: 1px solid #E2E8F0; color: #0F172A;">${charges.toFixed(2)} €</td>
            </tr>
            <tr style="background: #EFF6FF;">
              <td style="padding: 14px 16px; border: 1px solid #93C5FD; color: #1D4ED8; font-weight: bold;">Total réglé</td>
              <td style="padding: 14px 16px; border: 1px solid #93C5FD; color: #1D4ED8; font-weight: bold; font-size: 16px;">${total.toFixed(2)} €</td>
            </tr>
          </table>
          <p style="color: #94A3B8; font-size: 12px; line-height: 1.6; margin: 0 0 24px;">
            La présente quittance ne vaut pas pour les sommes pouvant rester dues au titre d'arriérés éventuels.
          </p>
          <p style="color: #334155; font-size: 15px; margin: 0;">
            Cordialement,<br>
            <strong>${profile?.full_name ?? 'Le propriétaire'}</strong>
          </p>
        </div>
        <div style="background: #F8FAFC; padding: 20px 36px; border-top: 1px solid #E2E8F0; text-align: center;">
          <p style="color: #94A3B8; font-size: 12px; margin: 0;">
            Quittance générée automatiquement par Patrimo IA — ${format(now, 'dd/MM/yyyy')}
          </p>
        </div>
      </div>
    `

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@resend.dev',
      to: lease.tenant_email,
      subject: `Quittance de loyer ${moisStr} — ${lease.property?.name || adresse}`,
      html,
    })

    if (error) {
      errors.push(`${lease.tenant_email}: ${error.message}`)
    } else {
      // Marquer la quittance comme envoyée
      await service.from('payments').update({
        quittance_sent_at: now.toISOString(),
        quittance_sent_email: lease.tenant_email,
      } as any).eq('id', payment.id)
      sent++
    }
  }

  return NextResponse.json({
    success: true,
    mois: moisStr,
    sent,
    skipped,
    errors,
    message: `${sent} quittance(s) envoyée(s) pour ${moisStr}`,
  })
}
