import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

function csv(rows: string[][]): string {
  return '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}

const CAT_LABELS: Record<string, string> = {
  interet: 'Intérêts d\'emprunt',
  assurance: 'Assurance PNO',
  assurance_gli: 'Assurance loyers impayés (GLI)',
  taxe: 'Taxe foncière',
  gestion: 'Frais de gestion / agence',
  comptabilite: 'Frais de comptabilité',
  copropriete: 'Charges de copropriété',
  procedure: 'Frais de procédure',
  telecom: 'Télécommunications',
  deplacement: 'Déplacements',
  autre: 'Autre',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = Number(new URL(req.url).searchParams.get('year') ?? new Date().getFullYear())
  const service = await createServiceClient()

  const [{ data: expenses }, { data: properties }] = await Promise.all([
    service
      .from('expenses')
      .select('*, property:properties(name, numero_fiscal)')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date'),
    service
      .from('properties')
      .select('name, numero_fiscal, property_tax, insurance_annual, monthly_charges, loan_monthly')
      .eq('user_id', user.id)
      .order('name'),
  ])

  const rows: string[][] = [
    ['Date', 'Bien', 'N° fiscal', 'Catégorie', 'Sous-catégorie', 'Fournisseur', 'N° facture', 'Montant HT', 'TVA', 'Montant TTC', 'Déductible (O/N)', 'Justificatif (O/N)'],
  ]

  // 1) Lignes saisies manuellement dans la table dépenses (le cas échéant)
  for (const exp of expenses ?? []) {
    rows.push([
      format(new Date(exp.date), 'dd/MM/yyyy'),
      exp.property?.name ?? '',
      exp.property?.numero_fiscal ?? '',
      CAT_LABELS[exp.category] ?? exp.category,
      exp.description ?? '',
      '',
      '',
      String(exp.amount),
      '0',
      String(exp.amount),
      exp.fiscal_deductible ? 'O' : 'N',
      exp.receipt_url ? 'O' : 'N',
    ])
  }

  // 2) Charges récurrentes enregistrées sur la fiche de chaque bien
  //    (taxe foncière, assurance, charges courantes, emprunt) — extraites telles quelles.
  const dec = `31/12/${year}`
  for (const p of properties ?? []) {
    const ligne = (montant: number, cat: string, label: string) => {
      if (!montant || montant <= 0) return
      rows.push([
        dec, p.name ?? '', p.numero_fiscal ?? '', cat, label,
        '', '', String(montant), '0', String(montant), 'O', 'N',
      ])
    }
    ligne(p.property_tax, CAT_LABELS.taxe, 'Taxe foncière annuelle')
    ligne(p.insurance_annual, CAT_LABELS.assurance, 'Assurance PNO annuelle')
    ligne((p.monthly_charges ?? 0) * 12, CAT_LABELS.copropriete, 'Charges courantes (12 mois)')
    ligne((p.loan_monthly ?? 0) * 12, CAT_LABELS.interet, 'Mensualités d\'emprunt (12 mois)')
  }

  return new Response(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="depenses_${year}.csv"`,
    },
  })
}
