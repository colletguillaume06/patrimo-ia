import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Lecture sécurisée d'une facture de travaux (bucket privé).
 *
 * Le contrôle du propriétaire est délégué à RLS : on lit l'incident avec le
 * client scellé de l'utilisateur connecté. S'il ne le voit pas (facture d'un
 * autre compte), la requête ne renvoie rien → 404. Seul le service, ensuite,
 * génère une URL signée valable quelques minutes.
 *
 *   GET /api/travaux/facture?incident_id=<uuid>
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const incidentId = req.nextUrl.searchParams.get('incident_id')
  if (!incidentId) return NextResponse.json({ error: 'incident_id manquant' }, { status: 400 })

  // RLS filtre sur le propriétaire : un incident non autorisé renvoie null.
  const { data: incident } = await supabase
    .from('incidents')
    .select('facture_url')
    .eq('id', incidentId)
    .single()

  if (!incident?.facture_url) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }

  const service = await createServiceClient()
  const { data, error } = await service.storage
    .from('factures')
    .createSignedUrl(incident.facture_url, 300) // 5 minutes

  if (error || !data) {
    return NextResponse.json({ error: 'Lien indisponible' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
