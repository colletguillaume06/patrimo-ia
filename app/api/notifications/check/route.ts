import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { differenceInDays, differenceInMonths, addMonths } from 'date-fns'
import type { Alert } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await createServiceClient()
  const now = new Date()
  const alerts: Alert[] = []

  const { data: properties } = await service
    .from('properties')
    .select('*, leases(*, payments(*)), diagnostics(*)')
    .eq('user_id', user.id)

  for (const prop of properties ?? []) {
    const leases = prop.leases ?? []

    for (const lease of leases.filter((l: any) => l.is_active)) {
      // Loyers en retard depuis plus de 5 jours
      const latePayments = (lease.payments ?? []).filter((p: any) => {
        const daysSinceDue = differenceInDays(now, new Date(p.due_date))
        return p.status === 'pending' && daysSinceDue >= 5
      })

      for (const pay of latePayments) {
        const daysLate = differenceInDays(now, new Date(pay.due_date))
        alerts.push({
          type: 'loyer_retard',
          property_id: prop.id,
          property_name: prop.name,
          message: `Loyer de ${lease.tenant_name} en retard de ${daysLate} jours (${pay.amount}€)`,
          severity: daysLate > 15 ? 'high' : 'medium',
          action_label: 'Envoyer relance',
          action_href: '/loyers',
        })
      }

      // Bail expire dans 3 mois
      if (lease.end_date) {
        const monthsLeft = differenceInMonths(new Date(lease.end_date), now)
        if (monthsLeft <= 3 && monthsLeft >= 0) {
          alerts.push({
            type: 'bail_expire',
            property_id: prop.id,
            property_name: prop.name,
            message: `Bail de ${lease.tenant_name} expire dans ${monthsLeft} mois`,
            severity: monthsLeft <= 1 ? 'high' : 'medium',
            action_label: 'Gérer le bail',
            action_href: '/baux',
          })
        }
      }

      // Révision IRL possible (12 mois depuis dernière révision)
      const lastRevision = lease.last_revision_date
        ? new Date(lease.last_revision_date)
        : new Date(lease.start_date)
      const monthsSinceRevision = differenceInMonths(now, lastRevision)
      if (monthsSinceRevision >= 12) {
        alerts.push({
          type: 'revision_possible',
          property_id: prop.id,
          property_name: prop.name,
          message: `Révision IRL possible pour ${lease.tenant_name} — ${monthsSinceRevision} mois sans révision`,
          severity: 'low',
          action_label: 'Calculer la révision',
          action_href: '/loyers',
        })
      }
    }

    // ── Diagnostics expirant ──
    for (const diag of (prop.diagnostics ?? [])) {
      if (!diag.date_expiration) continue
      const daysUntilExpiry = differenceInDays(new Date(diag.date_expiration), now)
      if (daysUntilExpiry <= 90 && daysUntilExpiry >= 0) {
        const typeLabel: Record<string, string> = {
          dpe: 'DPE', amiante: 'Amiante', plomb: 'Plomb',
          electricite: 'Électricité', gaz: 'Gaz', erp: 'ERP',
        }
        alerts.push({
          type: 'diagnostic_expire',
          property_id: prop.id,
          property_name: prop.name,
          message: `${typeLabel[diag.type] || diag.type} expire dans ${daysUntilExpiry} jours — ${prop.name}`,
          severity: daysUntilExpiry <= 30 ? 'high' : 'medium',
          action_label: 'Voir les diagnostics',
          action_href: `/biens/${prop.id}/diagnostics`,
        })
      }
    }

    // Taxe foncière — rappel en septembre
    if (now.getMonth() === 8 && prop.property_tax > 0) {
      alerts.push({
        type: 'fiscalite',
        property_id: prop.id,
        property_name: prop.name,
        message: `Taxe foncière à prévoir : ~${prop.property_tax}€ (échéance octobre)`,
        severity: 'low',
        action_href: '/fiscalite',
      })
    }

    // Limite 120 nuits Airbnb
    if (prop.type === 'airbnb') {
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
      const { data: bookings } = await service
        .from('airbnb_bookings')
        .select('nights')
        .eq('property_id', prop.id)
        .gte('check_in', yearStart)
      const totalNights = (bookings ?? []).reduce((s: number, b: any) => s + (b.nights ?? 0), 0)
      if (totalNights > 100) {
        alerts.push({
          type: 'airbnb_limit',
          property_id: prop.id,
          property_name: prop.name,
          message: `${totalNights}/120 nuits Airbnb utilisées — limite légale approche`,
          severity: totalNights > 110 ? 'high' : 'medium',
          action_href: `/biens/${prop.id}`,
        })
      }
    }
  }

  // Trier par sévérité
  const order = { high: 0, medium: 1, low: 2 }
  alerts.sort((a, b) => order[a.severity] - order[b.severity])

  return NextResponse.json({ alerts, count: alerts.length })
}
