import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { format, subDays, startOfWeek } from 'date-fns'
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
  const semaineDerniere = subDays(now, 7)
  const periode = `du ${format(semaineDerniere, 'd MMM', { locale: fr })} au ${format(now, 'd MMM yyyy', { locale: fr })}`

  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, onboarding_done')
    .eq('onboarding_done', true)

  let sent = 0

  for (const profile of (profiles ?? [])) {
    try {
      const { data: { user } } = await service.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      // Récupérer les données de la semaine
      const [propsRes, paymentsRes, lateRes] = await Promise.all([
        service.from('properties').select('id, name, type').eq('user_id', profile.id),
        service.from('payments')
          .select('id, amount, status, lease:leases(property:properties(user_id))')
          .eq('status', 'paid')
          .gte('paid_date', semaineDerniere.toISOString().split('T')[0]),
        service.from('payments')
          .select('id, amount, lease:leases(tenant_name, property:properties(name, user_id))')
          .eq('status', 'late'),
      ])

      const biens = propsRes.data ?? []
      const paiementsSemaine = (paymentsRes.data ?? []).filter(
        p => (p.lease as any)?.property?.user_id === profile.id
      )
      const retards = (lateRes.data ?? []).filter(
        p => (p.lease as any)?.property?.user_id === profile.id
      )

      const totalEncaisse = paiementsSemaine.reduce((s, p) => s + p.amount, 0)
      const totalRetard = retards.reduce((s, p) => s + p.amount, 0)

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">

          <div style="background: linear-gradient(135deg, #0F172A, #1E3A5F); padding: 28px 36px;">
            <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Rapport hebdomadaire</p>
            <h1 style="color: white; margin: 0; font-size: 22px;">Votre patrimoine cette semaine</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px;">${periode}</p>
          </div>

          <div style="padding: 32px 36px;">
            <p style="color: #334155; font-size: 15px; margin: 0 0 24px;">
              Bonjour ${profile.full_name?.split(' ')[0] || 'Propriétaire'},
            </p>

            <!-- KPIs -->
            <div style="display: flex; gap: 12px; margin-bottom: 28px;">
              <div style="flex: 1; background: #F0FDF4; border-radius: 10px; padding: 16px; border: 1px solid #86EFAC; text-align: center;">
                <p style="color: #166534; font-size: 22px; font-weight: bold; margin: 0;">${biens.length}</p>
                <p style="color: #166534; font-size: 12px; margin: 4px 0 0;">Biens</p>
              </div>
              <div style="flex: 1; background: #EFF6FF; border-radius: 10px; padding: 16px; border: 1px solid #93C5FD; text-align: center;">
                <p style="color: #1D4ED8; font-size: 22px; font-weight: bold; margin: 0;">${totalEncaisse.toFixed(0)} €</p>
                <p style="color: #1D4ED8; font-size: 12px; margin: 4px 0 0;">Encaissés</p>
              </div>
              <div style="flex: 1; background: ${retards.length > 0 ? '#FEF2F2' : '#F8FAFC'}; border-radius: 10px; padding: 16px; border: 1px solid ${retards.length > 0 ? '#FECACA' : '#E2E8F0'}; text-align: center;">
                <p style="color: ${retards.length > 0 ? '#DC2626' : '#64748B'}; font-size: 22px; font-weight: bold; margin: 0;">${retards.length}</p>
                <p style="color: ${retards.length > 0 ? '#DC2626' : '#64748B'}; font-size: 12px; margin: 4px 0 0;">En retard</p>
              </div>
            </div>

            ${retards.length > 0 ? `
            <!-- Alertes retards -->
            <div style="background: #FEF2F2; border-radius: 10px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #DC2626;">
              <p style="color: #DC2626; font-weight: bold; margin: 0 0 8px; font-size: 14px;">⚠️ ${retards.length} loyer(s) en retard — ${totalRetard.toFixed(0)} €</p>
              ${retards.map(r => `
                <p style="color: #334155; font-size: 13px; margin: 4px 0;">
                  • ${(r.lease as any)?.tenant_name} — ${(r.lease as any)?.property?.name} — <strong>${r.amount.toFixed(0)} €</strong>
                </p>
              `).join('')}
            </div>
            ` : `
            <div style="background: #F0FDF4; border-radius: 10px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #059669;">
              <p style="color: #059669; font-weight: bold; margin: 0; font-size: 14px;">✓ Tous les loyers sont à jour</p>
            </div>
            `}

            <!-- CTA -->
            <div style="text-align: center; margin: 28px 0 0;">
              <a href="${APP_URL}/dashboard" style="
                display: inline-block;
                background: #1D4ED8;
                color: white;
                text-decoration: none;
                padding: 13px 28px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 14px;
              ">Voir mon tableau de bord →</a>
            </div>
          </div>

          <div style="background: #F8FAFC; padding: 16px 36px; border-top: 1px solid #E2E8F0; text-align: center;">
            <p style="color: #94A3B8; font-size: 12px; margin: 0;">
              Patrimo IA — Rapport automatique chaque lundi
            </p>
          </div>
        </div>
      `

      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@resend.dev',
        to: user.email,
        subject: `📊 Votre rapport Patrimo IA — ${periode}`,
        html,
      })

      if (!error) sent++
    } catch {}
  }

  return NextResponse.json({ success: true, sent, message: `${sent} rapport(s) envoyé(s)` })
}
