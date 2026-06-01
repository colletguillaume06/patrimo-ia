import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const fd = await req.formData()
  const file = fd.get('file') as File
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'buffer' })

  // ── Lecture onglet Biens ──
  const wsBiens = wb.Sheets['Biens']
  const biens: any[] = XLSX.utils.sheet_to_json(wsBiens, { defval: '' })

  // ── Lecture onglet Loyers ──
  const wsLoyers = wb.Sheets['Loyers']
  const loyers: any[] = XLSX.utils.sheet_to_json(wsLoyers, { defval: '' })

  // ── Lecture onglet Dépenses ──
  const wsDepenses = wb.Sheets['Dépenses']
  const depenses: any[] = XLSX.utils.sheet_to_json(wsDepenses, { defval: '' })

  // Filtrer les lignes vides et les lignes d'aide
  const biensValides = biens.filter(b => b['Nom du bien'] && b['Type'])
  const loyersValides = loyers.filter(l => l['Nom du bien'] && l['Année'] && l['Loyers encaissés (€)'])
  const depensesValides = depenses.filter(d => d['Nom du bien'] && d['Année'] && d['Montant (€)'] && d['Catégorie'])

  const results = { biens: 0, loyers: 0, depenses: 0, errors: [] as string[] }

  // ── Insérer ou trouver les biens ──
  const bienMap: Record<string, string> = {} // nom → id

  // Récupérer les biens existants
  const { data: existingProps } = await supabase
    .from('properties')
    .select('id, name')
    .eq('user_id', user.id)

  existingProps?.forEach(p => { bienMap[p.name] = p.id })

  for (const b of biensValides) {
    const nom = b['Nom du bien']
    if (bienMap[nom]) continue // déjà existant

    const { data, error } = await supabase.from('properties').insert({
      user_id: user.id,
      name: nom,
      address: b['Adresse'] || '',
      city: b['Ville'] || '',
      type: b['Type'] || 'nu',
      surface_m2: Number(b['Surface (m²)']) || null,
      purchase_price: Number(b['Prix d\'achat (€)']) || null,
      purchase_year: Number(b['Année d\'achat']) || null,
      monthly_charges: Number(b['Charges mensuelles (€)']) || 0,
      loan_monthly: 0,
      property_tax: 0,
      insurance_annual: 0,
    }).select('id').single()

    if (error) { results.errors.push(`Bien "${nom}": ${error.message}`); continue }
    bienMap[nom] = data.id
    results.biens++
  }

  // ── Insérer les loyers (comme paiements groupés par année) ──
  for (const l of loyersValides) {
    const nom = l['Nom du bien']
    const propId = bienMap[nom]
    if (!propId) { results.errors.push(`Loyers: bien "${nom}" non trouvé`); continue }

    const annee = Number(l['Année'])
    const total = Number(l['Loyers encaissés (€)'])
    const moisLoues = 12 - (Number(l['Mois non loués']) || 0)
    const loyerMensuel = moisLoues > 0 ? Math.round(total / moisLoues) : Math.round(total / 12)
    const locataire = l['Nom du locataire'] || 'Locataire'

    // Créer ou récupérer un bail historique
    let leaseId: string | null = null
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id')
      .eq('property_id', propId)
      .eq('tenant_name', locataire)
      .single()

    if (existingLease) {
      leaseId = existingLease.id
    } else {
      const { data: newLease } = await supabase.from('leases').insert({
        property_id: propId,
        tenant_name: locataire,
        monthly_rent: loyerMensuel,
        start_date: `${annee}-01-01`,
        is_active: annee === new Date().getFullYear(),
      }).select('id').single()
      leaseId = newLease?.id ?? null
    }

    if (!leaseId) continue

    // Insérer les paiements mensuels
    const payments = []
    for (let m = 1; m <= 12; m++) {
      const montant = m <= moisLoues ? loyerMensuel : 0
      if (montant === 0) continue
      payments.push({
        lease_id: leaseId,
        amount: montant,
        due_date: `${annee}-${String(m).padStart(2, '0')}-01`,
        paid_date: `${annee}-${String(m).padStart(2, '0')}-05`,
        status: 'paid',
        notes: `Historique ${annee}`,
      })
    }
    if (payments.length > 0) {
      const { error } = await supabase.from('payments').insert(payments)
      if (!error) results.loyers += payments.length
    }
  }

  // ── Insérer les dépenses ──
  for (const d of depensesValides) {
    const nom = d['Nom du bien']
    const propId = bienMap[nom]
    if (!propId) { results.errors.push(`Dépense: bien "${nom}" non trouvé`); continue }

    const annee = Number(d['Année'])
    const cat = d['Catégorie']
    const description = d['Description'] || cat
    const montant = Number(d['Montant (€)'])

    const { error } = await supabase.from('expenses').insert({
      property_id: propId,
      amount: montant,
      date: `${annee}-06-15`,
      category: cat,
      description,
      deductible: ['charges', 'travaux_deductibles', 'assurance', 'gestion', 'taxe_fonciere'].includes(cat),
    })
    if (!error) results.depenses++
    else results.errors.push(`Dépense "${description}": ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Import terminé : ${results.biens} biens, ${results.loyers} paiements, ${results.depenses} dépenses`,
  })
}
