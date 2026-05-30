import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function csv(rows: string[][]): string {
  return '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = Number(new URL(req.url).searchParams.get('year') ?? new Date().getFullYear())
  const service = await createServiceClient()

  const { data: properties } = await service
    .from('properties')
    .select('id, name, address, city, numero_fiscal, leases(id, tenant_name, monthly_rent, charges)')
    .eq('user_id', user.id)

  const { data: payments } = await service
    .from('payments')
    .select('*, lease:leases(tenant_name, monthly_rent, charges, property_id)')
    .gte('due_date', `${year}-01-01`)
    .lte('due_date', `${year}-12-31`)
    .order('due_date')

  const propMap = Object.fromEntries((properties ?? []).map(p => [p.id, p]))

  const rows: string[][] = [
    ['Mois', 'Bien', 'Adresse', 'N° fiscal', 'Locataire', 'Loyer HC', 'Charges', 'Total CC', 'Statut', 'Date encaissement'],
  ]

  for (const pay of payments ?? []) {
    const prop = propMap[pay.lease?.property_id ?? '']
    const mois = format(new Date(pay.due_date), 'MMMM yyyy', { locale: fr })
    const loyer_hc = pay.lease?.monthly_rent ?? 0
    const charges = pay.lease?.charges ?? 0
    const total = loyer_hc + charges
    const statut = pay.status === 'paid' ? 'Payé' : pay.status === 'late' ? 'En retard' : pay.status === 'partial' ? 'Partiel' : 'En attente'

    rows.push([
      mois,
      prop?.name ?? 'Inconnu',
      [prop?.address, prop?.city].filter(Boolean).join(', '),
      prop?.numero_fiscal ?? '',
      pay.lease?.tenant_name ?? '',
      String(loyer_hc),
      String(charges),
      String(total),
      statut,
      pay.paid_date ? format(new Date(pay.paid_date), 'dd/MM/yyyy') : '',
    ])
  }

  return new Response(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="revenus_${year}.csv"`,
    },
  })
}
