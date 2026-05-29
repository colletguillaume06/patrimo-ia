import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())

  const service = await createServiceClient()

  const { data: properties } = await service
    .from('properties')
    .select(`
      id, name, type, city,
      leases(id, tenant_name, monthly_rent, is_active,
        payments(amount, due_date, paid_date, status)
      ),
      expenses(amount, category, description, date, fiscal_deductible)
    `)
    .eq('user_id', user.id)

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

  // Résumé par bien
  rows.push('')
  rows.push('=== RÉSUMÉ PAR BIEN ===')
  rows.push(['Bien', 'Revenus bruts (€)', 'Charges (€)', 'Résultat (€)'].join(';'))

  for (const prop of properties ?? []) {
    const revenus = (prop.leases ?? [])
      .flatMap((l: any) => l.payments ?? [])
      .filter((p: any) => p.status === 'paid' && new Date(p.due_date).getFullYear() === year)
      .reduce((s: number, p: any) => s + p.amount, 0)

    const charges = (prop.expenses ?? [])
      .filter((e: any) => new Date(e.date).getFullYear() === year)
      .reduce((s: number, e: any) => s + e.amount, 0)

    rows.push([
      `"${prop.name}"`,
      revenus.toFixed(2),
      charges.toFixed(2),
      (revenus - charges).toFixed(2),
    ].join(';'))
  }

  const csv = '﻿' + rows.join('\n') // BOM UTF-8 pour Excel

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="propilot-export-${year}.csv"`,
    },
  })
}
