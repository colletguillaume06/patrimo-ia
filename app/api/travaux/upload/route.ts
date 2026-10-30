import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const incident_id = formData.get('incident_id') as string | null

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 15 MB)' }, { status: 400 })

  // Contrôle du propriétaire AVANT toute écriture : la mise à jour se fait
  // ensuite en service_role (RLS contourné), donc c'est ici la seule barrière.
  // On relit l'incident avec le client de l'utilisateur : si RLS ne le lui
  // montre pas, il ne lui appartient pas.
  if (incident_id) {
    const { data: owned } = await supabase
      .from('incidents')
      .select('id')
      .eq('id', incident_id)
      .maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 403 })
  }

  const service = await createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  // Certains navigateurs (notamment sur photos HEIC prises depuis un iPhone)
  // renvoient un file.type vide ou non standard. Un type vide/inconnu se fait
  // rejeter silencieusement par la restriction MIME du bucket : on déduit donc
  // le type depuis l'extension en repli, plutôt que de faire confiance au
  // navigateur.
  const EXT_MIME: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
    heic: 'image/heic', heif: 'image/heic',
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const contentType = file.type && file.type !== 'application/octet-stream'
    ? file.type
    : (EXT_MIME[ext] ?? 'application/octet-stream')

  const { error: uploadError } = await service.storage
    .from('factures')
    .upload(fileName, buffer, { contentType, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Bucket privé : on stocke le CHEMIN interne (préfixé par l'id utilisateur),
  // pas une URL publique. La lecture passe par /api/storage/file qui vérifie le
  // propriétaire et génère une URL signée à durée limitée.
  const entry = { path: fileName, name: file.name, size: file.size }

  if (incident_id) {
    // On APPEND au tableau `factures` (plusieurs justificatifs par dépense).
    const { data: inc } = await service
      .from('incidents')
      .select('factures')
      .eq('id', incident_id)
      .single()
    const current = Array.isArray(inc?.factures) ? inc!.factures : []
    await service.from('incidents')
      .update({ factures: [...current, entry], facture_url: fileName })
      .eq('id', incident_id)
  }

  return NextResponse.json(entry)
}
