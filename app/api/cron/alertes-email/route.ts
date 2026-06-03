import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { differenceInDays, differenceInMonths, format } from 'date-fns'
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

  const { data: profiles } = await service
    .from('profiles').select('id, full_name').eq('onboarding_done', true)

  for (const profile of (profiles ?? [])) {
    const { data: { user } } = await service.auth.admin.getUserById(profile.id)
    if (!user?.email) continue

    const alertes: { emoji: string; texte: string; href: string; severity: string }[] = []

    // Récupérer biens + diagnostics + baux
    const { data: props } = await service
      .from('properties')
      .select('id, name, diagnostics(*), leases(id, tenant_name, monthly_rent, end_date, last_revision_date, start_date, payments(id, amount, status, due_date))')
      .eq('user_id', profile.id)

    for (const prop of (props ?? [])) {
      // Loyers en retard
      for (const lease of (prop.leases ?? []) as any[]) {
        const latePayments = (lease.payments ?? []).filter((p: any) => {
          const days = differenceInDays(now, new Date(p.due_date))
          return p.status === 'pending' && days >= 5
        })
        for (const pay of latePayments) {
          const days = differenceInDays(now, new Date(pay.due_date))
          alertes.push({
            emoji: '⚠️',
            texte: `Loyer de <strong>${lease.tenant_name}</strong> en retard de ${days} jours — ${prop.name} (${pay.amount}€)`,
            href: `${APP_URL}/loyers`,
            severity: days > 15 ? 'high' : 'medium',
          })
        }

        // Bail expire dans 60 jours
        if (lease.end_date) {
          const days = differenceInDays(new Date(lease.end_date), now)
          if (days >= 0 && days <= 60) {
            alertes.push({
              emoji: '📅',
              texte: `Bail de <strong>${lease.tenant_name}</strong> expire dans ${days} jours — ${prop.name}`,
              href: `${APP_URL}/baux`,
              severity: days <= 30 ? 'high' : 'medium',
            })
          }
        }

        // Révision IRL disponible
        const lastRev = lease.last_revision_date ? new Date(lease.last_revision_date) : new Date(lease.start_date)
        if (differenceInMonths(now, lastRev) >= 12) {
          alertes.push({
            emoji: '📈',
            texte: `Révision de loyer possible pour <strong>${lease.tenant_name}</strong> — ${prop.name}`,
            href: `${APP_URL}/loyers`,
            severity: 'low',
          })
        }
      }

      // Diagnostics expirant dans 90 jours
      for (const diag of (prop.diagnostics ?? []) as any[]) {
        if (!diag.date_expiration) continue
        const days = differenceInDays(new Date(diag.date_expiration), now)
        if (days >= 0 && days <= 90) {
          alertes.push({
            emoji: '🔬',
            texte: `Diagnostic <strong>${diag.type.toUpperCase()}</strong> expire dans ${days} jours — ${prop.name}`,
            href: `${APP_URL}/biens/${prop.id}/diagnostics`,
            severity: days <= 30 ? 'high' : 'medium',
          })
        }
      }
    }

    if (alertes.length === 0) continue

    // Trier par sévérité
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    alertes.sort((a, b) => order[a.severity] - order[b.severity])

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
        <div style="background: #DC2626; padding: 24px 36px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🔔 ${alertes.length} alerte(s) sur votre patrimoine</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">${format(now, "EEEE d MMMM yyyy", { locale: fr })}</p>
        </div>
        <div style="padding: 28px 36px;">
          <p style="color: #334155; margin: 0 0 20px;">Bonjour ${profile.full_name?.split(' ')[0] || ''},</p>
          <p style="color: #334155; margin: 0 0 20px; font-size: 14px;">Voici les points d'attention sur votre portefeuille :</p>
          ${alertes.map(a => `
            <div style="background: ${a.severity === 'high' ? '#FEF2F2' : a.severity === 'medium' ? '#FFFBEB' : '#F8FAFC'}; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border-left: 4px solid ${a.severity === 'high' ? '#DC2626' : a.severity === 'medium' ? '#F59E0B' : '#94A3B8'};">
              <p style="margin: 0; font-size: 14px; color: #334155;">${a.emoji} ${a.texte}</p>
              <a href="${a.href}" style="color: #1D4ED8; font-size: 12px; text-decoration: none;">Voir →</a>
            </div>
          `).join('')}
          <div style="text-align: center; margin-top: 28px;">
            <a href="${APP_URL}/dashboard" style="background: #1D4ED8; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Accéder à mon espace →</a>
          </div>
        </div>
        <div style="background: #F8FAFC; padding: 14px 36px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="color: #94A3B8; font-size: 12px; margin: 0;">Patrimo IA — Alertes automatiques</p>
        </div>
      </div>
    `

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@resend.dev',
      to: user.email,
      subject: `🔔 ${alertes.length} alerte(s) Patrimo IA — action requise`,
      html,
    })

    if (!error) sent++
  }

  return NextResponse.json({ success: true, sent })
}
