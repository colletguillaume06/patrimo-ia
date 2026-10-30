import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Détache un justificatif d'une dépense/travaux : le retire du tableau
 * `incidents.factures` et supprime le fichier du bucket privé.
 *
 *   POST /api/travaux/facture/delete   body: { incident_id, path }
 *
 * Le contrôle du propriétaire est double : l'incident doit être visible via
 * RLS (client scellé de l'utilisateur), et le chemin du fichier doit commencer
 * par l'id de l'utilisateur connecté.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { incident_id, path } = await req.json().catch(() => ({}))
  if (!incident_id || !path) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }
  if (!String(path).startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // RLS : renvoie null si l'incident n'appartient pas à l'utilisateur.
  const { data: incident } = await supabase
    .from('incidents')
    .select('id, factures')
    .eq('id', incident_id)
    .single()

  if (!incident) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const service = await createServiceClient()
  await service.storage.from('factures').remove([path])

  const current = Array.isArray(incident.factures) ? incident.factures : []
  const next = current.filter((f: any) => f?.path !== path)
  await service.from('incidents')
    .update({ factures: next, facture_url: next[0]?.path ?? null })
    .eq('id', incident_id)

  return NextResponse.json({ factures: next })
}
