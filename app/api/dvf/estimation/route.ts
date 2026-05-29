import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  city: z.string(),
  postal_code: z.string(),
  surface_m2: z.number().positive(),
  property_id: z.string().uuid(),
})

interface DvfMutation {
  valeur_fonciere: string
  surface_reelle_bati: string
  date_mutation: string
  type_local: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { city, postal_code, surface_m2 } = parsed.data

  try {
    // API DVF (Données de Valeurs Foncières) — data.gouv.fr
    const dept = postal_code.slice(0, 2)
    const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${new Date().getFullYear() - 1}/departements/${dept}.csv.gz`

    // Alternative : API géorisques pour l'estimation
    // On utilise l'API DVF light via api.data.gouv.fr
    const dvfRes = await fetch(
      `https://api.priximmobilier.notaires.fr/api/v1/biens/ventes?codePostal=${postal_code}&nbResultats=20`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    )

    let prixM2Moyen = null
    let nbTransactions = 0
    let valeurEstimee = null

    if (dvfRes.ok) {
      const data = await dvfRes.json()
      const ventes = data.results ?? data ?? []
      if (Array.isArray(ventes) && ventes.length > 0) {
        const prixM2List = ventes
          .filter((v: any) => v.prix_m2 || (v.prix && v.surface))
          .map((v: any) => v.prix_m2 ?? (v.prix / v.surface))
          .filter((p: number) => p > 500 && p < 50000)

        if (prixM2List.length > 0) {
          prixM2Moyen = Math.round(prixM2List.reduce((s: number, p: number) => s + p, 0) / prixM2List.length)
          nbTransactions = prixM2List.length
          valeurEstimee = Math.round(prixM2Moyen * surface_m2)
        }
      }
    }

    // Fallback : estimation via prix moyen par ville (données statiques 2025)
    if (!prixM2Moyen) {
      const prixVilles: Record<string, number> = {
        '75': 9800, '69': 4800, '13': 3900, '06': 5200, '31': 4100,
        '33': 4600, '67': 4000, '59': 2800, '44': 4200, '34': 3800,
        '76': 2900, '38': 3500, '54': 2400, '21': 2600, '35': 3700,
      }
      const dept = postal_code.slice(0, 2)
      prixM2Moyen = prixVilles[dept] ?? 3200
      nbTransactions = 0
      valeurEstimee = Math.round(prixM2Moyen * surface_m2)
    }

    return NextResponse.json({
      valeur_estimee: valeurEstimee,
      prix_m2_moyen: prixM2Moyen,
      nb_transactions: nbTransactions,
      source: nbTransactions > 0 ? 'DVF / Notaires' : 'Estimation statistique',
      city,
      postal_code,
      surface_m2,
    })
  } catch {
    // Fallback estimation statistique
    const prixVilles: Record<string, number> = {
      '75': 9800, '69': 4800, '13': 3900, '06': 5200, '31': 4100,
    }
    const dept = postal_code.slice(0, 2)
    const prixM2Moyen = prixVilles[dept] ?? 3200
    return NextResponse.json({
      valeur_estimee: Math.round(prixM2Moyen * surface_m2),
      prix_m2_moyen: prixM2Moyen,
      nb_transactions: 0,
      source: 'Estimation statistique',
      city, postal_code, surface_m2,
    })
  }
}
