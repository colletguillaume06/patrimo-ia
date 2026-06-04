import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { differenceInDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://propilot-ai.vercel.app'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const service = await createServiceClient()
  const now = new Date()
  let sent = 0
  const errors: string[] = []

  // Récupérer tous les paiements en retard avec email locataire
  const { data: payments } = await service
    .from('payments')
    .select(`
      id, amount, due_date, status, relance_count, last_relance_at,
      lease:leases(
        tenant_name, tenant_email, monthly_rent,
        property:properties(name, user_id)
      )
    `)
    .in('status', ['pending', 'late'])

  for (const payment of (payments ?? [])) {
    const lease = payment.lease as any
    if (!lease?.tenant_email) continue

    const daysLate = differenceInDays(now, new Date(payment.due_date))
    if (daysLate < 5) continue // Pas encore en retard

    const relanceCount = payment.relance_count ?? 0
    const lastRelance = payment.last_relance_at ? new Date(payment.last_relance_at) : null
    const daysSinceLastRelance = lastRelance ? differenceInDays(now, lastRelance) : 999

    // Délais entre relances : J+5, J+15, J+30
    const shouldSend =
      (relanceCount === 0 && daysLate >= 5) ||
      (relanceCount === 1 && daysLate >= 15 && daysSinceLastRelance >= 7) ||
      (relanceCount === 2 && daysLate >= 30 && daysSinceLastRelance >= 14)

    if (!shouldSend) continue

    // Récupérer le profil du propriétaire
    const { data: profile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', lease.property?.user_id)
      .single()

    const niveaux = ['courtois', 'ferme', 'mise en demeure']
    const niveau = niveaux[Math.min(relanceCount, 2)]
    const mois = format(new Date(payment.due_date), 'MMMM yyyy', { locale: fr })

    const templates: Record<string, { subject: string; intro: string }> = {
      courtois: {
        subject: `Rappel loyer ${mois} — ${lease.property?.name}`,
        intro: `Nous vous contactons concernant le loyer du mois de ${mois} d'un montant de ${payment.amount}€ qui n'a pas encore été reçu. Il s'agit peut-être d'un oubli.`,
      },
      ferme: {
        subject: `⚠️ Loyer impayé — relance ${mois} — ${lease.property?.name}`,
        intro: `Malgré notre précédent rappel, le loyer du mois de ${mois} (${payment.amount}€) n'a toujours pas été réglé. Nous vous demandons de procéder au paiement dans les plus brefs délais.`,
      },
      'mise en demeure': {
        subject: `MISE EN DEMEURE — Loyer impayé ${mois} — ${lease.property?.name}`,
        intro: `En l'absence de règlement du loyer de ${mois} (${payment.amount}€) malgré nos relances précédentes, nous vous mettons en demeure de procéder au paiement sous 8 jours. À défaut, nous serons contraints d'engager les procédures légales prévues.`,
      },
    }

    const tpl = templates[niveau]
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Madame, Monsieur ${lease.tenant_name},</p>
        <p>${tpl.intro}</p>
        <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
          <tr><td style="padding:8px; border:1px solid #ddd;">Bien loué</td><td style="padding:8px; border:1px solid #ddd;">${lease.property?.name}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;">Période</td><td style="padding:8px; border:1px solid #ddd;">${mois}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;">Montant dû</td><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${payment.amount}€</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;">Retard</td><td style="padding:8px; border:1px solid #ddd; color:#DC2626;">${daysLate} jours</td></tr>
        </table>
        <p>Cordialement,<br><strong>${profile?.full_name ?? 'Le propriétaire'}</strong></p>
      </div>
    `

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@resend.dev',
      to: lease.tenant_email,
      subject: tpl.subject,
      html,
    })

    if (!error) {
      // Mettre à jour le compteur de relances
      await service.from('payments').update({
        status: 'late',
        relance_count: relanceCount + 1,
        last_relance_at: now.toISOString(),
      }).eq('id', payment.id)
      sent++
    } else {
      errors.push(`${lease.tenant_name}: ${error.message}`)
    }
  }

  return NextResponse.json({ success: true, sent, errors, message: `${sent} relance(s) envoyée(s)` })
}
