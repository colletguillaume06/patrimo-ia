import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

function csv(rows: string[][]): string {
  return '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}

const CAT_LABELS: Record<string, string> = {
  entretien_reparation: 'Entretien / Réparation',
  amelioration: 'Amélioration',
  travaux_deductibles: 'Travaux déductibles LMNP/BIC',
  travaux_amortissables: 'Travaux amortissables LMNP',
  construction_agrandissement: 'Construction / Agrandissement',
}

const DEDUCTIBLE_IMMÉDIAT: Record<string, string> = {
  entretien_reparation: 'O',
  amelioration: 'Partiel',
  travaux_deductibles: 'O',
  travaux_amortissables: 'N',
  construction_agrandissement: 'N',
}

const AMORTISSABLE: Record<string, string> = {
  entretien_reparation: 'N',
  amelioration: 'O',
  travaux_deductibles: 'N',
  travaux_amortissables: 'O',
  construction_agrandissement: 'N',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = Number(new URL(req.url).searchParams.get('year') ?? new Date().getFullYear())
  const service = await createServiceClient()

  const { data: incidents } = await service
    .from('incidents')
    .select('*, property:properties(name, numero_fiscal)')
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)
    .order('date_travaux', { ascending: true })

  const rows: string[][] = [
    ['Date', 'Bien', 'N° fiscal', 'Entreprise', 'N° facture', 'Description', 'Coût estimé', 'Coût payé', 'Payé (O/N)', 'Catégorie fiscale', 'Déductible immédiat (O/N)', 'Amortissable (O/N)'],
  ]

  for (const inc of incidents ?? []) {
    const cat = inc.categorie_fiscale ?? 'entretien_reparation'
    rows.push([
      inc.date_travaux ? format(new Date(inc.date_travaux), 'dd/MM/yyyy') : format(new Date(inc.created_at), 'dd/MM/yyyy'),
      inc.property?.name ?? '',
      inc.property?.numero_fiscal ?? '',
      inc.nom_entreprise ?? '',
      inc.numero_facture ?? '',
      inc.title + (inc.description ? ` — ${inc.description}` : ''),
      String(inc.cout_estime ?? inc.cost ?? 0),
      String(inc.cout_paye ?? 0),
      inc.est_paye ? 'O' : 'N',
      CAT_LABELS[cat] ?? cat,
      DEDUCTIBLE_IMMÉDIAT[cat] ?? 'N',
      AMORTISSABLE[cat] ?? 'N',
    ])
  }

  return new Response(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="travaux_${year}.csv"`,
    },
  })
}
