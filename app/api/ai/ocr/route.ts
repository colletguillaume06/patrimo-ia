import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const property_id = formData.get('property_id') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Only PDF files accepted' }, { status: 400 })

  const service = await createServiceClient()

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `${user.id}/${Date.now()}-${file.name}`

  const { data: uploadData, error: uploadError } = await service.storage
    .from('baux')
    .upload(fileName, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('baux').getPublicUrl(fileName)

  let extractedText = `Bail PDF: ${file.name}`
  if (process.env.LLAMA_PARSE_API_KEY) {
    try {
      const llamaForm = new FormData()
      llamaForm.append('file', file)
      const llamaRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.LLAMA_PARSE_API_KEY}` },
        body: llamaForm,
      })
      if (llamaRes.ok) {
        const llamaData = await llamaRes.json()
        const jobId = llamaData.id
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 3000))
          const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
            headers: { Authorization: `Bearer ${process.env.LLAMA_PARSE_API_KEY}` },
          })
          if (statusRes.ok) {
            const result = await statusRes.json()
            extractedText = result.markdown ?? extractedText
            break
          }
        }
      }
    } catch {}
  }

  const extractionPrompt = `Tu es expert en baux immobiliers français. Analyse ce texte extrait d'un bail et retourne un JSON strict avec exactement ces champs :
{
  "loyer": number|null,
  "charges": number|null,
  "depot_garantie": number|null,
  "date_debut": "YYYY-MM-DD"|null,
  "date_fin": "YYYY-MM-DD"|null,
  "duree_mois": number|null,
  "indice": "irl"|"ilc"|"ilat"|null,
  "clauses_importantes": string[],
  "type_bail": string|null
}

Texte du bail :
${extractedText.slice(0, 8000)}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: extractionPrompt }],
    response_format: { type: 'json_object' },
    max_tokens: 800,
  })

  let parsed_data: any = {}
  try {
    parsed_data = JSON.parse(completion.choices[0].message.content ?? '{}')
    parsed_data.raw_text = extractedText.slice(0, 2000)
  } catch {}

  if (property_id) {
    const activeLeaseId = (await service
      .from('leases')
      .select('id')
      .eq('property_id', property_id)
      .eq('is_active', true)
      .single()).data?.id

    if (activeLeaseId) {
      await service.from('leases').update({ pdf_url: publicUrl, parsed_data }).eq('id', activeLeaseId)
    }
  }

  return NextResponse.json({ pdf_url: publicUrl, parsed_data })
}
