import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Upload d'un document lié à un bail (EDL photos, pièces identité, bail signé, etc.)
// Accepte images (jpg/png/webp/heic) et PDF.
// Stocke dans le bucket "documents" et met à jour lease.parsed_data.docs[category]
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const lease_id = formData.get('lease_id') as string | null
  const category = (formData.get('category') as string | null) ?? 'autre'
  // category: edl_sortie_photo | edl_entree_photo | edl_sortie_pdf | edl_entree_pdf
  //           identite | revenus | bail_signe | assurance | caution | autre

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Max 20 MB' }, { status: 400 })

  const allowed = ['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
  if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|pdf)$/i)) {
    return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
  }

  const service = await createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/${lease_id ?? 'no-lease'}/${category}/${Date.now()}-${safeName}`

  const { error: upErr } = await service.storage
    .from('documents')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Bucket privé : on conserve le chemin interne. La lecture passe par
  // /api/storage/file (URL signée + contrôle du propriétaire par préfixe).
  if (lease_id) {
    const { data: lease } = await service
      .from('leases')
      .select('parsed_data')
      .eq('id', lease_id)
      .single()

    const existing = (lease?.parsed_data as any) ?? {}
    const docs = existing.docs ?? {}
    const catList: string[] = Array.isArray(docs[category]) ? docs[category] : []
    catList.push(path)

    await service.from('leases').update({
      parsed_data: { ...existing, docs: { ...docs, [category]: catList } }
    }).eq('id', lease_id)
  }

  return NextResponse.json({ category, path })
}
