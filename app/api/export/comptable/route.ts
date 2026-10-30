import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())

  const service = await createServiceClient()

  const [{ data: properties }, { data: annexesRaw }] = await Promise.all([
    service
      .from('properties')
      .select(`
        id, name, type, city,
        leases(id, tenant_name, monthly_rent, is_active,
          payments(amount, due_date, paid_date, status)
        ),
        expenses(amount, category, description, date, fiscal_deductible),
        incidents(id, title, description, cout_paye, cout_estime, est_paye, date_travaux, created_at, nom_entreprise, numero_facture, categorie_fiscale, property_id),
        airbnb_bookings(total_revenue, check_in)
      `)
      .eq('user_id', user.id),
    service
      .from('incidents')
      .select('*')
      .is('property_id', null)
      .eq('est_paye', true),
  ])

  const LABEL_ANNEXE: Record<string, string> = {
    materiel_informatique: 'Matériel informatique',
    frais_gestion: 'Frais bancaires & gestion',
    frais_deplacement: 'Frais de déplacement',
    abonnements: 'Abonnements & logiciels',
    fournitures: 'Fournitures de bureau',
    honoraires: 'Honoraires & conseils',
  }

  const annexes = (annexesRaw ?? []).filter((d: any) => {
    const y = new Date(d.date_travaux ?? d.created_at).getFullYear()
    return y === year
  })

  const rows: string[] = []

  // En-tête CSV
  rows.push([
    'Bien', 'Type', 'Ville', 'Catégorie', 'Sous-catégorie',
    'Description', 'Date', 'Montant (€)', 'Déductible fiscal', 'Locataire'
  ].join(';'))

  for (const prop of properties ?? []) {
    // Revenus locatifs
    for (const lease of prop.leases ?? []) {
      for (const pay of lease.payments ?? []) {
        const payDate = new Date(pay.due_date)
        if (payDate.getFullYear() !== year) continue
        if (pay.status !== 'paid') continue

        rows.push([
          `"${prop.name}"`,
          prop.type.toUpperCase(),
          prop.city ?? '',
          'Revenu',
          'Loyer',
          `"Loyer ${lease.tenant_name}"`,
          pay.paid_date ?? pay.due_date,
          pay.amount.toFixed(2),
          'Non',
          `"${lease.tenant_name}"`,
        ].join(';'))
      }
    }

    // Travaux & incidents liés au bien
    for (const inc of (prop.incidents ?? []).filter((i: any) => {
      const d = new Date(i.date_travaux ?? i.created_at)
      return d.getFullYear() === year && i.est_paye
    })) {
      rows.push([
        `"${prop.name}"`,
        prop.type.toUpperCase(),
        prop.city ?? '',
        'Charge',
        'Travaux & Incidents',
        `"${inc.title ?? ''}"`,
        inc.date_travaux ?? inc.created_at.slice(0, 10),
        (-(inc.cout_paye || 0)).toFixed(2),
        'Oui',
        '',
      ].join(';'))
    }

    // Dépenses
    for (const exp of prop.expenses ?? []) {
      const expDate = new Date(exp.date)
      if (expDate.getFullYear() !== year) continue

      const categoryLabels: Record<string, string> = {
        travaux: 'Travaux & Réparations',
        gestion: 'Frais de gestion',
        assurance: 'Assurance',
        taxe: 'Taxes & Impôts',
        interet: 'Intérêts emprunt',
        autre: 'Autres charges',
      }

      rows.push([
        `"${prop.name}"`,
        prop.type.toUpperCase(),
        prop.city ?? '',
        'Charge',
        categoryLabels[exp.category] ?? exp.category,
        `"${exp.description ?? exp.category}"`,
        exp.date,
        (-exp.amount).toFixed(2),
        exp.fiscal_deductible ? 'Oui' : 'Non',
        '',
      ].join(';'))
    }
  }

  // Dépenses annexes (non liées à un bien)
  if (annexes.length > 0) {
    rows.push('')
    rows.push('=== DÉPENSES ANNEXES DE GESTION ===')
    for (const d of annexes) {
      rows.push([
        '"Frais généraux"',
        'ANNEXE',
        '',
        'Charge',
        LABEL_ANNEXE[d.categorie_fiscale] ?? 'Frais de gestion',
        `"${d.title ?? ''}"`,
        d.date_travaux ?? d.created_at.slice(0, 10),
        (-(d.cout_paye || 0)).toFixed(2),
        'Oui',
        d.nom_entreprise ?? '',
      ].join(';'))
    }
    const totalAnnexes = annexes.reduce((s: number, d: any) => s + (d.cout_paye || 0), 0)
    rows.push(['"TOTAL DÉPENSES ANNEXES"', '', '', '', '', '', '', (-totalAnnexes).toFixed(2), '', ''].join(';'))
  }

  // Résumé par bien
  rows.push('')
  rows.push('=== RÉSUMÉ PAR BIEN ===')
  rows.push(['Bien', 'Revenus bruts (€)', 'Charges (€)', 'Résultat (€)'].join(';'))

  let totalRevGlobal = 0
  let totalChargesGlobal = 0
  for (const prop of properties ?? []) {
    const revenus = (prop.leases ?? [])
      .flatMap((l: any) => l.payments ?? [])
      .filter((p: any) => p.status === 'paid' && new Date(p.due_date).getFullYear() === year)
      .reduce((s: number, p: any) => s + p.amount, 0)
      + (prop.airbnb_bookings ?? [])
        .filter((b: any) => new Date(b.check_in).getFullYear() === year)
        .reduce((s: number, b: any) => s + (b.total_revenue || 0), 0)

    const chargesExp = (prop.expenses ?? [])
      .filter((e: any) => new Date(e.date).getFullYear() === year)
      .reduce((s: number, e: any) => s + e.amount, 0)

    const chargesInc = (prop.incidents ?? [])
      .filter((i: any) => {
        const d = new Date(i.date_travaux ?? i.created_at)
        return d.getFullYear() === year && i.est_paye
      })
      .reduce((s: number, i: any) => s + (i.cout_paye || 0), 0)

    const charges = chargesExp + chargesInc
    totalRevGlobal += revenus
    totalChargesGlobal += charges

    rows.push([
      `"${prop.name}"`,
      revenus.toFixed(2),
      charges.toFixed(2),
      (revenus - charges).toFixed(2),
    ].join(';'))
  }

  const totalAnnexesFinal = annexes.reduce((s: number, d: any) => s + (d.cout_paye || 0), 0)
  if (totalAnnexesFinal > 0) {
    rows.push(['"Dépenses annexes de gestion"', '0.00', totalAnnexesFinal.toFixed(2), (-totalAnnexesFinal).toFixed(2)].join(';'))
  }
  rows.push(['"TOTAL"', totalRevGlobal.toFixed(2), (totalChargesGlobal + totalAnnexesFinal).toFixed(2), (totalRevGlobal - totalChargesGlobal - totalAnnexesFinal).toFixed(2)].join(';'))

  const csv = '﻿' + rows.join('\n') // BOM UTF-8 pour Excel

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="propilot-export-${year}.csv"`,
    },
  })
}
