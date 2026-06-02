import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Données extraites des 2 photos de tableaux Excel
const DATA = [
  // ── PAGE 1 — LOGEMENTS NUS ──
  {
    tenant: {
      full_name: 'SARL Les Gourmandises',
      notes: 'Locataire commercial — N°fiscal bien 061480117476',
    },
    bien_name: 'MAG TOU',
    bail: {
      monthly_rent: 929, charges: 0, deposit: 850,
      start_date: '2016-06-01', is_active: true,
      indexation_index: 'irlc',
      irl_reference_valeur: 108.41, irl_reference_trimestre: 4, irl_reference_annee: 2015,
    },
  },
  {
    tenant: {
      full_name: 'LE FOURNIL VENCOIS',
      notes: 'Locataire commercial — Syndic CMS — N°fiscal 061570941965 — N°fiscal parking lot34 061570948724',
    },
    bien_name: 'mag TUBY',
    bail: {
      monthly_rent: 1624, charges: 60, deposit: 1420,
      start_date: '2019-10-10', is_active: true,
      indexation_index: 'irlc',
      irl_reference_valeur: 115.21, irl_reference_trimestre: 2, irl_reference_annee: 2019,
    },
  },
  {
    tenant: {
      full_name: 'MONTOYA Delecroix',
      notes: 'N°fiscal 061481310130',
    },
    bien_name: 'courtil',
    bail: {
      monthly_rent: 860, charges: 0, deposit: 800,
      start_date: '2020-08-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 130.57, irl_reference_trimestre: 2, irl_reference_annee: 2020,
    },
  },
  {
    tenant: {
      full_name: 'ANA Alexio',
      notes: 'Locataire depuis 1996 — N°fiscal 061480117453',
    },
    bien_name: 'Cours château 1',
    bail: {
      monthly_rent: 510, charges: 0, deposit: 760,
      start_date: '1996-10-01', is_active: true,
      indexation_index: 'icc',
      irl_reference_valeur: 1036, irl_reference_trimestre: 1, irl_reference_annee: 1996,
    },
  },
  // ── PAGE 2 — LOGEMENTS LMNP ──
  {
    tenant: {
      full_name: 'LEPROVOST Ching',
      notes: 'N°fiscal 061480117677 — Caution 2×660€ espèces',
    },
    bien_name: 'Studio 2ème « Le village 5211 » Le Chateau',
    bail: {
      monthly_rent: 660, charges: 0, deposit: 1320,
      start_date: '2022-02-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 132.62, irl_reference_trimestre: 4, irl_reference_annee: 2021,
    },
  },
  {
    tenant: {
      full_name: 'ROSA Cynthia',
      notes: 'N°fiscal 061570792702 — N°fiscal garage lot151 061570792681 — Syndic Martel',
    },
    bien_name: 'LE PRESIDENT',
    bail: {
      monthly_rent: 710, charges: 100, deposit: 1420,
      start_date: '2023-09-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 140.59, irl_reference_trimestre: 2, irl_reference_annee: 2023,
    },
  },
  {
    tenant: {
      full_name: 'MONTOYA INFANTOLINO',
      notes: 'N°fiscal 061481098892 — Loyer révisé en août 2024 (IRL 4T2023=142.06)',
    },
    bien_name: 'Moulin Meuble',
    bail: {
      monthly_rent: 1177, charges: 10, deposit: 1110,
      start_date: '2021-08-01', is_active: true,
      indexation_index: 'irl',
      irl_reference_valeur: 130.69, irl_reference_trimestre: 1, irl_reference_annee: 2021,
    },
  },
  {
    tenant: {
      full_name: 'FULCONIS Amandine',
      notes: 'N°fiscal 061481326455',
    },
    bien_name: 'COURTIL bis',
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

  const results = { locataires: 0, baux: 0, lies: 0, errors: [] as string[] }

  for (const item of DATA) {
    try {
      // ── 1. Créer ou retrouver le locataire ──
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .ilike('full_name', item.tenant.full_name)
        .maybeSingle()

      let tenantId: string
      if (existingTenant) {
        tenantId = existingTenant.id
        await supabase.from('tenants').update(item.tenant).eq('id', tenantId)
      } else {
        const { data: newTenant, error } = await supabase
          .from('tenants')
          .insert({ user_id: user.id, ...item.tenant })
          .select('id').single()
        if (error) { results.errors.push(`Locataire ${item.tenant.full_name}: ${error.message}`); continue }
        tenantId = newTenant.id
        results.locataires++
      }

      // ── 2. Trouver le bien correspondant ──
      const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', item.bien_name)
        .maybeSingle()

      if (!property) {
        results.errors.push(`Bien "${item.bien_name}" non trouvé — créez-le d'abord`)
        continue
      }

      // ── 3. Créer ou mettre à jour le bail ──
      const { data: existingLease } = await supabase
        .from('leases')
        .select('id')
        .eq('property_id', property.id)
        .ilike('tenant_name', item.tenant.full_name)
        .maybeSingle()

      if (existingLease) {
        await supabase.from('leases').update({
          ...item.bail,
          tenant_id: tenantId,
          tenant_name: item.tenant.full_name,
        }).eq('id', existingLease.id)
        results.lies++
      } else {
        const { error } = await supabase.from('leases').insert({
          property_id: property.id,
          tenant_id: tenantId,
          tenant_name: item.tenant.full_name,
          ...item.bail,
        })
        if (error) {
          results.errors.push(`Bail ${item.tenant.full_name}: ${error.message}`)
        } else {
          results.baux++
        }
      }

    } catch (err: any) {
      results.errors.push(`${item.tenant.full_name}: ${err.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    message: `${results.locataires} locataires créés, ${results.baux} baux créés, ${results.lies} baux mis à jour`,
    ...results,
  })
}
