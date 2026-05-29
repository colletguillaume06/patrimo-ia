import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format, subMonths, subDays } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await createServiceClient()

  // Supprimer les données existantes
  const { data: existingProps } = await service.from('properties').select('id').eq('user_id', user.id)
  if (existingProps && existingProps.length > 0) {
    const ids = existingProps.map(p => p.id)
    await service.from('properties').delete().in('id', ids)
  }

  const today = new Date()

  // Bien 1 — LMNP
  const { data: prop1 } = await service.from('properties').insert({
    user_id: user.id,
    name: 'Studio Meublé Montmartre',
    type: 'lmnp',
    address: '18 rue Lepic',
    city: 'Paris',
    postal_code: '75018',
    surface_m2: 28,
    purchase_price: 195000,
    purchase_year: 2020,
    monthly_charges: 120,
    property_tax: 850,
    insurance_annual: 380,
    loan_monthly: 720,
    loan_rate: 1.85,
    lmnp_regime: 'reel',
  }).select().single()

  // Bien 2 — Foncier nu
  const { data: prop2 } = await service.from('properties').insert({
    user_id: user.id,
    name: 'Appartement T3 Lyon',
    type: 'nu',
    address: '5 rue de la République',
    city: 'Lyon',
    postal_code: '69002',
    surface_m2: 68,
    purchase_price: 285000,
    purchase_year: 2018,
    monthly_charges: 220,
    property_tax: 1650,
    insurance_annual: 580,
    loan_monthly: 1050,
    loan_rate: 2.1,
  }).select().single()

  // Bien 3 — Airbnb
  const { data: prop3 } = await service.from('properties').insert({
    user_id: user.id,
    name: 'Studio Airbnb Nice Promenade',
    type: 'airbnb',
    address: '10 Promenade des Anglais',
    city: 'Nice',
    postal_code: '06000',
    surface_m2: 32,
    purchase_price: 215000,
    purchase_year: 2022,
    monthly_charges: 160,
    property_tax: 920,
    insurance_annual: 420,
    loan_monthly: 810,
    airbnb_max_nights: 120,
    airbnb_platform_fees: 3,
  }).select().single()

  if (!prop1 || !prop2 || !prop3) {
    return NextResponse.json({ error: 'Erreur lors de la création des biens' }, { status: 500 })
  }

  // Baux
  const { data: lease1 } = await service.from('leases').insert({
    property_id: prop1.id,
    tenant_name: 'Sophie Martin',
    tenant_email: 'sophie.martin@email.fr',
    tenant_phone: '06 12 34 56 78',
    monthly_rent: 980,
    charges: 80,
    deposit: 1960,
    start_date: '2021-09-01',
    indexation_index: 'irl',
    is_active: true,
  }).select().single()

  const { data: lease2 } = await service.from('leases').insert({
    property_id: prop2.id,
    tenant_name: 'Marc et Julie Durand',
    tenant_email: 'marc.durand@email.fr',
    tenant_phone: '06 98 76 54 32',
    monthly_rent: 1350,
    charges: 150,
    deposit: 2700,
    start_date: '2019-03-15',
    indexation_index: 'irl',
    is_active: true,
  }).select().single()

  if (!lease1 || !lease2) {
    return NextResponse.json({ error: 'Erreur lors de la création des baux' }, { status: 500 })
  }

  // Paiements — 12 derniers mois
  const paymentsToInsert = []
  for (let i = 11; i >= 0; i--) {
    const dueDate = subMonths(today, i)
    dueDate.setDate(5)
    const isPast = i > 0
    const isLate = i === 1 // le mois dernier en retard

    paymentsToInsert.push({
      lease_id: lease1.id,
      amount: 1060,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      paid_date: isPast && !isLate ? format(subDays(dueDate, 2), 'yyyy-MM-dd') : null,
      status: isLate ? 'late' : isPast ? 'paid' : 'pending',
    })

    paymentsToInsert.push({
      lease_id: lease2.id,
      amount: 1500,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      paid_date: isPast ? format(subDays(dueDate, 1), 'yyyy-MM-dd') : null,
      status: isPast ? 'paid' : 'pending',
    })
  }
  await service.from('payments').insert(paymentsToInsert)

  // Dépenses
  await service.from('expenses').insert([
    { property_id: prop1.id, amount: 850, category: 'taxe', fiscal_deductible: true, description: 'Taxe foncière 2025', date: '2025-10-15' },
    { property_id: prop1.id, amount: 380, category: 'assurance', fiscal_deductible: true, description: 'Assurance PNO', date: '2026-01-10' },
    { property_id: prop1.id, amount: 1200, category: 'travaux', fiscal_deductible: true, description: 'Remplacement chauffe-eau', date: '2026-03-22' },
    { property_id: prop2.id, amount: 1650, category: 'taxe', fiscal_deductible: true, description: 'Taxe foncière 2025', date: '2025-10-15' },
    { property_id: prop2.id, amount: 580, category: 'assurance', fiscal_deductible: true, description: 'Assurance PNO', date: '2026-01-08' },
    { property_id: prop2.id, amount: 450, category: 'gestion', fiscal_deductible: true, description: 'Frais agence Q1 2026', date: '2026-04-01' },
    { property_id: prop3.id, amount: 920, category: 'taxe', fiscal_deductible: true, description: 'Taxe foncière 2025', date: '2025-10-15' },
    { property_id: prop3.id, amount: 320, category: 'gestion', fiscal_deductible: false, description: 'Ménage entre locataires', date: '2026-05-01' },
  ])

  // Plan amortissement LMNP
  await service.from('depreciation_plans').insert([
    { property_id: prop1.id, component: 'gros_oeuvre', value: 107250, duration_years: 80, start_date: '2020-06-01' },
    { property_id: prop1.id, component: 'toiture', value: 19500, duration_years: 25, start_date: '2020-06-01' },
    { property_id: prop1.id, component: 'agencement', value: 39000, duration_years: 15, start_date: '2020-06-01' },
    { property_id: prop1.id, component: 'mobilier', value: 8500, duration_years: 10, start_date: '2020-06-01' },
  ])

  // Réservations Airbnb (cette année)
  const bookings = []
  const months = [1, 2, 3, 4, 5]
  for (const m of months) {
    bookings.push({
      property_id: prop3.id,
      check_in: `2026-0${m}-05`,
      check_out: `2026-0${m}-12`,
      nightly_rate: 95,
      platform_fee_pct: 3,
      total_revenue: 95 * 7 * 0.97,
      guest_name: ['Emma L.', 'Thomas B.', 'Claire M.', 'Pierre D.', 'Anna K.'][m - 1],
    })
    if (m <= 4) {
      bookings.push({
        property_id: prop3.id,
        check_in: `2026-0${m}-18`,
        check_out: `2026-0${m}-23`,
        nightly_rate: 110,
        platform_fee_pct: 3,
        total_revenue: 110 * 5 * 0.97,
        guest_name: ['Lucas R.', 'Marie P.', 'David C.', 'Sophie N.'][m - 1],
      })
    }
  }
  await service.from('airbnb_bookings').insert(bookings)

  // Incident ouvert
  await service.from('incidents').insert({
    property_id: prop2.id,
    title: 'Fuite robinet salle de bain',
    description: 'Le locataire signale une fuite sous le lavabo depuis 3 jours.',
    status: 'open',
    cost: 150,
    reported_by: 'tenant',
  })

  await service.from('profiles').update({ onboarding_done: true }).eq('id', user.id)

  return NextResponse.json({ success: true, message: '3 biens de démonstration créés avec succès' })
}
