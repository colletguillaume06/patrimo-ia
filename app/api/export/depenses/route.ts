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

  const { data: expenses } = await service
    .from('expenses')
    .select('*, property:properties(name, numero_fiscal)')
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .order('date')

  // Filter only non-travaux expenses (properties expenses from expenses table)
  const rows: string[][] = [
    ['Date', 'Bien', 'N° fiscal', 'Catégorie', 'Sous-catégorie', 'Fournisseur', 'N° facture', 'Montant HT', 'TVA', 'Montant TTC', 'Déductible (O/N)', 'Justificatif (O/N)'],
  ]

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

  return new Response(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="depenses_${year}.csv"`,
    },
  })
}
