import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TENANTS_DATA = [
  // ── LOGEMENTS NUS ──
  {
    full_name: 'SARL Les Gourmandises',
    email: null,
    phone: null,
    notes: 'Locataire commercial — MAG TOU — bail depuis 01/06/2016 — Caution 850€ — IRLC 4T2015=108.41 — N°fiscal 061480117476',
  },
  {
    full_name: 'LE FOURNIL VENCOIS',
    email: null,
    phone: null,
    notes: 'Locataire commercial — mag TUBY — Syndic CMS — bail comm 10/10/2019 — Caution 1420€ — IRLC 2T2019=115.21 — N°fiscal 061570941965 — N°fiscal parking lot34 061570948724',
  },
  {
    full_name: 'MONTOYA Delecroix',
    email: null,
    phone: null,
    notes: 'Locataire — courtil — bail 01/08/2020 — Caution 800€ — IRL 2T2020=130.57 — N°fiscal 061481310130',
  },
  {
    full_name: 'ANA Alexio',
    email: null,
    phone: null,
    notes: 'Locataire — Cours château 1 — depuis 01/10/1996 — Caution 760€ — ICC 1erT=1036 — N°fiscal 061480117453',
  },
  // ── LOGEMENTS LMNP ──
  {
    full_name: 'LEPROVOST Ching',
    email: null,
    phone: null,
    notes: 'Locataire LMNP — Studio 2ème Le Village 5211 Le Château — entrée 01/02/2022 — Caution 1320€ (2×660€ espèces) — IRL 4T2021=132.62 — N°fiscal 061480117677',
  },
  {
    full_name: 'ROSA Cynthia',
    email: null,
    phone: null,
    notes: 'Locataire LMNP — Le Président — entrée 01/09/2023 — Caution 1420€ (710×2) — IRL 2T2023=140.59 — Syndic Martel — N°fiscal 061570792702 — N°fiscal garage lot151 061570792681',
  },
  {
    full_name: 'MONTOYA INFANTOLINO',
    email: null,
    phone: null,
    notes: 'Locataire LMNP — Moulin Meublé — entrée 01/08/2021 — Caution 1110€ — IRL 1T2021=130.69 / 4T2023=142.06 — N°fiscal 061481098892 — Loyer révisé en août 2024',
  },
  {
    full_name: 'FULCONIS Amandine',
    email: null,
    phone: null,
    notes: 'Locataire LMNP — Courtil bis — entrée 10/02/2024 — Caution 980€ — IRL 4T2023=142.06 — N°fiscal 061481326455',
  },
]

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const results = { crees: 0, existants: 0, errors: [] as string[] }

  for (const t of TENANTS_DATA) {
    // Vérifier si existe déjà
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user.id)
      .ilike('full_name', t.full_name)
      .maybeSingle()

    if (existing) {
      results.existants++
      continue
    }

    const { error } = await supabase.from('tenants').insert({
      user_id: user.id,
      ...t,
    })

    if (error) {
      results.errors.push(`${t.full_name}: ${error.message}`)
    } else {
      results.crees++
    }
  }

  // Lier automatiquement les baux existants à ces nouveaux locataires
  const { data: tenants } = await supabase.from('tenants').select('id, full_name').eq('user_id', user.id)
  let liens = 0
  for (const tenant of (tenants ?? [])) {
    const { data: leases } = await supabase
      .from('leases')
      .select('id')
      .ilike('tenant_name', tenant.full_name)
      .is('tenant_id', null)
    for (const lease of (leases ?? [])) {
      await supabase.from('leases').update({ tenant_id: tenant.id }).eq('id', lease.id)
      liens++
    }
  }

  return NextResponse.json({
    success: true,
    message: `${results.crees} fiches créées, ${results.existants} déjà existantes, ${liens} baux liés`,
    ...results,
  })
}
