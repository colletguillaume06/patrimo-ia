import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstitutions } from '@/lib/nordigen/client'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.NORDIGEN_SECRET_ID) {
    return NextResponse.json({ error: 'Nordigen non configuré — ajoutez NORDIGEN_SECRET_ID et NORDIGEN_SECRET_KEY dans .env.local' }, { status: 503 })
  }

  try {
    const country = new URL(req.url).searchParams.get('country') ?? 'fr'
    const institutions = await getInstitutions(country)

    // Filtrer les principales banques françaises en premier
    const priority = ['BNP_PARIBAS', 'CREDIT_AGRICOLE', 'SOCIETE_GENERALE', 'LCL', 'CAISSE_EPARGNE', 'BANQUE_POPULAIRE', 'CREDIT_MUTUEL', 'LA_BANQUE_POSTALE', 'BOURSORAMA', 'FORTUNEO', 'HSBC', 'ING']

    const sorted = [...institutions].sort((a: any, b: any) => {
      const ai = priority.findIndex(p => a.id.includes(p))
      const bi = priority.findIndex(p => b.id.includes(p))
      if (ai >= 0 && bi < 0) return -1
      if (bi >= 0 && ai < 0) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json(sorted)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
