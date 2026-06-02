import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ImportResult, ImportedItem } from '@/lib/anthropic/import-pipeline'

function cleanAmount(val: any): number {
  if (!val) return 0
  return parseFloat(String(val).replace(/\s/g, '').replace(',', '.')) || 0
}

function cleanDate(val: any): string | null {
  if (!val) return null
  const s = String(val).trim()
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { biens } = body
    if (!biens || !Array.isArray(biens)) return NextResponse.json({ error: 'biens[] requis' }, { status: 400 })

    const results: ImportedItem[] = []
    let baux_crees = 0
    let paiements_crees = 0

    for (const item of biens) {
      try {
        const bienData = item.bien
        if (!bienData?.name) continue

        // A — Créer ou retrouver le bien
        const { data: existingProp } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', bienData.name)
          .maybeSingle()

        let propertyId: string

        if (existingProp) {
          propertyId = existingProp.id
          const updates: any = {}
          if (bienData.address) updates.address = bienData.address
          if (bienData.city) updates.city = bienData.city
          if (bienData.surface_m2) updates.surface_m2 = cleanAmount(bienData.surface_m2)
          if (bienData.purchase_price) updates.purchase_price = cleanAmount(bienData.purchase_price)
          if (bienData.numero_fiscal) updates.numero_fiscal = bienData.numero_fiscal
          if (Object.keys(updates).length > 0) {
            await supabase.from('properties').update(updates).eq('id', propertyId)
          }
        } else {
          const { data: newProp, error: propError } = await supabase
            .from('properties')
            .insert({
              user_id: user.id,
              name: bienData.name,
              type: bienData.type || 'nu',
              address: bienData.address || '',
              city: bienData.city || '',
              postal_code: bienData.postal_code || null,
              surface_m2: cleanAmount(bienData.surface_m2) || null,
              purchase_price: cleanAmount(bienData.purchase_price) || null,
              monthly_charges: cleanAmount(bienData.monthly_charges) || 0,
              property_tax: cleanAmount(bienData.property_tax) || 0,
              insurance_annual: 0,
              loan_monthly: 0,
              numero_fiscal: bienData.numero_fiscal || null,
              purchase_year: bienData.purchase_year || null,
            })
            .select('id')
            .single()

          if (propError) {
            results.push({ bien_nom: bienData.name, property_id: '', lease_id: null, nb_paiements: 0, statut: 'erreur', erreur: propError.message })
            continue
          }
          propertyId = newProp.id
        }

        // B — Créer ou mettre à jour le bail
        let leaseId: string | null = null
        const bailData = item.bail

        if (bailData?.tenant_name) {
          const { data: existingLease } = await supabase
            .from('leases')
            .select('id')
            .eq('property_id', propertyId)
            .ilike('tenant_name', bailData.tenant_name)
            .maybeSingle()

          if (existingLease) {
            leaseId = existingLease.id
            await supabase.from('leases').update({
              monthly_rent: cleanAmount(bailData.monthly_rent),
              monthly_charges: cleanAmount(bailData.monthly_charges),
              deposit: cleanAmount(bailData.deposit) || null,
              irl_index: cleanAmount(bailData.irl_index) || null,
            }).eq('id', leaseId)
          } else {
            const startDate = cleanDate(bailData.start_date) || `${new Date().getFullYear()}-01-01`
            const { data: newLease, error: leaseError } = await supabase
              .from('leases')
              .insert({
                property_id: propertyId,
                tenant_name: bailData.tenant_name,
                tenant_email: bailData.tenant_email || null,
                tenant_phone: bailData.tenant_phone || null,
                monthly_rent: cleanAmount(bailData.monthly_rent),
                monthly_charges: cleanAmount(bailData.monthly_charges) || 0,
                deposit: cleanAmount(bailData.deposit) || null,
                start_date: startDate,
                end_date: cleanDate(bailData.end_date),
                is_active: true,
                irl_index: cleanAmount(bailData.irl_index) || null,
              })
              .select('id')
              .single()

            if (!leaseError && newLease) {
              leaseId = newLease.id
              baux_crees++
            }
          }
        }

        // C — Créer les paiements
        let nbPay = 0
        if (leaseId && item.paiements?.length > 0) {
          for (const pay of item.paiements) {
            if (!pay.due_date && !pay.mois) continue

            const dueDate = pay.due_date
              ? cleanDate(pay.due_date)
              : pay.mois ? `${pay.mois}-01` : null
            if (!dueDate) continue

            const { data: existingPay } = await supabase
              .from('payments')
              .select('id')
              .eq('lease_id', leaseId)
              .eq('due_date', dueDate)
              .maybeSingle()

            if (!existingPay) {
              const { error: payError } = await supabase.from('payments').insert({
                lease_id: leaseId,
                amount: cleanAmount(pay.amount) || cleanAmount(bailData?.monthly_rent) || 0,
                due_date: dueDate,
                paid_date: cleanDate(pay.paid_date),
                status: pay.status || 'pending',
                notes: pay.note || null,
              })
              if (!payError) { nbPay++; paiements_crees++ }
            }
          }
        }

        results.push({ bien_nom: bienData.name, property_id: propertyId, lease_id: leaseId, nb_paiements: nbPay, statut: 'ok' })

      } catch (err: any) {
        results.push({ bien_nom: item.bien?.name || '?', property_id: '', lease_id: null, nb_paiements: 0, statut: 'erreur', erreur: err.message })
      }
    }

    const result: ImportResult = {
      success: true,
      biens_importes: results.filter(r => r.statut === 'ok').length,
      baux_crees,
      paiements_crees,
      details: results,
      avertissements: [],
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Confirm import error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
