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

  const service = await createServiceClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: uploadError } = await service.storage
    .from('factures')
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('factures').getPublicUrl(fileName)

  if (incident_id) {
    await service.from('incidents').update({ facture_url: publicUrl }).eq('id', incident_id)
  }

  return NextResponse.json({ url: publicUrl })
}
