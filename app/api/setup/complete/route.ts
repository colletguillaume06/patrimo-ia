import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Biens sans locataire (créés seuls)
const BIENS_SEULS = [
  {
    name: 'FOUR', type: 'nu',
    monthly_charges: 0, loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    notes_bail: { monthly_rent: 875, charges: 0, deposit: 800, indexation_index: 'irl' },
  },
  {
    name: 'IGLOO', type: 'airbnb',
    monthly_charges: 0, loan_monthly: 0, property_tax: 0, insurance_annual: 0,
  },
]

// Données complètes extraites des photos — LOGEMENTS NUS 2024
const SETUP_DATA = [
  {
    bien: {
      name: 'MAG TOU',
      type: 'commerce',
      numero_fiscal: '061480117476',
      monthly_charges: 0,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'SARL Les Gourmandises',
      notes: 'Locataire commercial — bail depuis 01/06/2016 — N°fiscal 061480117476',
    },
    bail: {
      monthly_rent: 929, charges: 0, deposit: 850,
      start_date: '2016-06-01', is_active: true,
      indexation_index: 'irlc',
      irl_reference_valeur: 108.41, irl_reference_trimestre: 4, irl_reference_annee: 2015,
    },
  },
  {
    bien: {
      name: 'mag TUBY',
      type: 'commerce',
      numero_fiscal: '061570941965',
      monthly_charges: 60,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'LE FOURNIL VENCOIS',
      notes: 'Bail commercial — Syndic CMS — N°fiscal bien 061570941965 — N°fiscal parking lot34 061570948724',
    },
    bail: {
      monthly_rent: 1624, charges: 60, deposit: 1420,
      start_date: '2019-10-10', is_active: true,
      indexation_index: 'irlc',
      irl_reference_valeur: 115.21, irl_reference_trimestre: 2, irl_reference_annee: 2019,
    },
  },
  {
    bien: {
      name: 'courtil',
      type: 'nu',
      numero_fiscal: '061481310130',
      monthly_charges: 0,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'MONTOYA Delecroix',
      notes: 'N°fiscal 061481310130 — IRL 2T2020=130.57',
    },
    bail: {
      monthly_rent: 860, charges: 0, deposit: 800,
      start_date: '2020-08-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 130.57, irl_reference_trimestre: 2, irl_reference_annee: 2020,
    },
  },
  {
    bien: {
      name: 'Cours château 1',
      type: 'nu',
      numero_fiscal: '061480117453',
      monthly_charges: 0,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'ANA Alexio',
      notes: 'Locataire depuis 01/10/1996 — N°fiscal 061480117453 — ICC 1erT=1036 — Caution 760€',
    },
    bail: {
      monthly_rent: 510, charges: 0, deposit: 760,
      start_date: '1996-10-01', is_active: true,
      indexation_index: 'icc',
      irl_reference_valeur: 1036, irl_reference_trimestre: 1, irl_reference_annee: 1996,
    },
  },
  // ── LOGEMENTS LMNP ──
  {
    bien: {
      name: 'Studio 2ème « Le village 5211 » Le Chateau',
      type: 'lmnp',
      numero_fiscal: '061480117677',
      monthly_charges: 0,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'LEPROVOST Ching',
      notes: 'Entrée 01/02/2022 — Caution 2×660€ espèces — IRL 4T2021=132.62 — N°fiscal 061480117677',
    },
    bail: {
      monthly_rent: 660, charges: 0, deposit: 1320,
      start_date: '2022-02-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 132.62, irl_reference_trimestre: 4, irl_reference_annee: 2021,
    },
  },
  {
    bien: {
      name: 'LE PRESIDENT',
      type: 'lmnp',
      numero_fiscal: '061570792702',
      monthly_charges: 100,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'ROSA Cynthia',
      notes: 'Entrée 01/09/2023 — Syndic Martel — Caution 1420€ (710×2) — IRL 2T2023=140.59 — N°fiscal 061570792702 — N°fiscal garage lot151 061570792681',
    },
    bail: {
      monthly_rent: 710, charges: 100, deposit: 1420,
      start_date: '2023-09-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 140.59, irl_reference_trimestre: 2, irl_reference_annee: 2023,
    },
  },
  {
    bien: {
      name: 'Moulin Meuble',
      type: 'lmnp',
      numero_fiscal: '061481098892',
      monthly_charges: 10,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'MONTOYA INFANTOLINO',
      notes: 'Entrée 01/08/2021 — Caution 1110€ — IRL 1T2021=130.69 — Loyer révisé août 2024 (IRL 4T2023=142.06) — N°fiscal 061481098892',
    },
    bail: {
      monthly_rent: 1177, charges: 10, deposit: 1110,
      start_date: '2021-08-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 130.69, irl_reference_trimestre: 1, irl_reference_annee: 2021,
    },
  },
  {
    bien: {
      name: 'COURTIL bis',
      type: 'lmnp',
      numero_fiscal: '061481326455',
      monthly_charges: 10,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    },
    tenant: {
      full_name: 'FULCONIS Amandine',
      notes: 'Entrée 10/02/2024 — Caution 980€ — IRL 4T2023=142.06 — N°fiscal 061481326455',
    },
    bail: {
      monthly_rent: 980, charges: 10, deposit: 980,
      start_date: '2024-02-10', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 142.06, irl_reference_trimestre: 4, irl_reference_annee: 2023,
    },
  },
]

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const results = { biens: 0, tenants: 0, baux: 0, updates: 0, errors: [] as string[] }

  for (const item of SETUP_DATA) {
    try {
      // ── 1. BIEN ──
      const { data: existingBien } = await supabase
        .from('properties').select('id').eq('user_id', user.id)
        .ilike('name', item.bien.name).maybeSingle()

      let propertyId: string
      if (existingBien) {
        propertyId = existingBien.id
        await supabase.from('properties').update({
          type: item.bien.type,
          numero_fiscal: item.bien.numero_fiscal,
          monthly_charges: item.bien.monthly_charges,
        }).eq('id', propertyId)
        results.updates++
      } else {
        const { data: newBien, error } = await supabase.from('properties').insert({
          user_id: user.id, ...item.bien,
        }).select('id').single()
        if (error) { results.errors.push(`Bien ${item.bien.name}: ${error.message}`); continue }
        propertyId = newBien.id
        results.biens++
      }

      // ── 2. LOCATAIRE ──
      const { data: existingTenant } = await supabase
        .from('tenants').select('id').eq('user_id', user.id)
        .ilike('full_name', item.tenant.full_name).maybeSingle()

      let tenantId: string
      if (existingTenant) {
        tenantId = existingTenant.id
        await supabase.from('tenants').update({ notes: item.tenant.notes }).eq('id', tenantId)
      } else {
        const { data: newTenant, error } = await supabase.from('tenants').insert({
          user_id: user.id, ...item.tenant,
        }).select('id').single()
        if (error) { results.errors.push(`Locataire ${item.tenant.full_name}: ${error.message}`); continue }
        tenantId = newTenant.id
        results.tenants++
      }

      // ── 3. BAIL ──
      const { data: existingBail } = await supabase
        .from('leases').select('id').eq('property_id', propertyId)
        .ilike('tenant_name', item.tenant.full_name).maybeSingle()

      if (existingBail) {
        await supabase.from('leases').update({
          ...item.bail,
          tenant_id: tenantId,
          tenant_name: item.tenant.full_name,
        }).eq('id', existingBail.id)
        results.updates++
      } else {
        const { error } = await supabase.from('leases').insert({
          property_id: propertyId,
          tenant_id: tenantId,
          tenant_name: item.tenant.full_name,
          ...item.bail,
        })
        if (error) { results.errors.push(`Bail ${item.tenant.full_name}: ${error.message}`); continue }
        results.baux++
      }

    } catch (err: any) {
      results.errors.push(`${item.bien.name}: ${err.message}`)
    }
  }

  // ── Biens sans locataire (FOUR, IGLOO) ──
  for (const bien of BIENS_SEULS) {
    const { data: existing } = await supabase
      .from('properties').select('id').eq('user_id', user.id)
      .ilike('name', bien.name).maybeSingle()

    if (!existing) {
      const { error } = await supabase.from('properties').insert({
        user_id: user.id,
        name: bien.name, type: bien.type,
        monthly_charges: bien.monthly_charges,
        loan_monthly: 0, property_tax: 0, insurance_annual: 0,
      })
      if (!error) results.biens++
      else results.errors.push(`${bien.name}: ${error.message}`)
    } else {
      await supabase.from('properties').update({ type: bien.type }).eq('id', existing.id)
      results.updates++
    }
  }

  return NextResponse.json({
    success: true,
    message: `${results.biens} biens créés, ${results.tenants} locataires créés, ${results.baux} baux créés, ${results.updates} mis à jour`,
    ...results,
  })
}
