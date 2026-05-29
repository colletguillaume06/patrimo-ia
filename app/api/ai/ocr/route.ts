import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY non configurée. L\'OCR nécessite OpenAI.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const property_id = formData.get('property_id') as string | null

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Seuls les PDF sont acceptés' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 10 MB)' }, { status: 400 })

  const service = await createServiceClient()

  // 1. Upload vers Supabase Storage (bucket "baux")
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: uploadError } = await service.storage
    .from('baux')
    .upload(fileName, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    return NextResponse.json(
      { error: `Erreur upload Storage : ${uploadError.message}` },
      { status: 500 }
    )
  }

  const { data: { publicUrl } } = service.storage.from('baux').getPublicUrl(fileName)

  // 2. Extraction texte — LlamaParse si clé dispo, sinon fallback nom de fichier
  let extractedText = `Nom du fichier : ${file.name}\n[Texte non extrait — LlamaParse non configuré]`

  if (process.env.LLAMA_PARSE_API_KEY) {
    try {
      const llamaForm = new FormData()
      llamaForm.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name)

      const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.LLAMA_PARSE_API_KEY}` },
        body: llamaForm,
        signal: AbortSignal.timeout(30000),
      })

      if (!uploadRes.ok) throw new Error(`LlamaParse upload: ${uploadRes.status}`)

      const { id: jobId } = await uploadRes.json()

      // Polling résultat (max 30 secondes)
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const resultRes = await fetch(
          `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
          {
            headers: { Authorization: `Bearer ${process.env.LLAMA_PARSE_API_KEY}` },
            signal: AbortSignal.timeout(10000),
          }
        )
        if (resultRes.ok) {
          const result = await resultRes.json()
          if (result.markdown) {
            extractedText = result.markdown
            break
          }
        }
      }
    } catch (err: any) {
      // LlamaParse failed — continue with GPT-4o sur le nom du fichier uniquement
      console.error('LlamaParse error:', err?.message)
    }
  }

  // 3. Extraction structurée GPT-4o
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const extractionPrompt = `Tu es expert en baux immobiliers français. Analyse ce texte extrait d'un bail et retourne UNIQUEMENT un objet JSON valide avec exactement ces champs (null si non trouvé) :

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

Règles :
- loyer : montant mensuel hors charges en euros
- charges : provisions pour charges mensuelles en euros
- depot_garantie : montant total du dépôt en euros
- indice : "irl" pour habitation, "ilc" pour commerce, "ilat" pour tertiaire
- clauses_importantes : liste de 3-5 clauses notables (ex: "Révision annuelle IRL", "Sous-location interdite")
- type_bail : "habitation meublée" | "habitation nue" | "commercial" | "professionnel"

Texte du bail :
${extractedText.slice(0, 8000)}`

  let parsed_data: any = {}
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: extractionPrompt }],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0,
    })

    parsed_data = JSON.parse(completion.choices[0].message.content ?? '{}')
  } catch (err: any) {
    return NextResponse.json(
      { error: `Erreur extraction GPT-4o : ${err?.message}` },
      { status: 502 }
    )
  }

  // 4. Mise à jour du bail actif si property_id fourni
  if (property_id) {
    const { data: activeLease } = await service
      .from('leases')
      .select('id')
      .eq('property_id', property_id)
      .eq('is_active', true)
      .single()

    if (activeLease) {
      await service.from('leases').update({
        pdf_url: publicUrl,
        parsed_data: { ...parsed_data, raw_text: extractedText.slice(0, 2000) },
      }).eq('id', activeLease.id)
    }
  }

  return NextResponse.json({
    pdf_url: publicUrl,
    parsed_data: { ...parsed_data, raw_text: extractedText.slice(0, 2000) },
  })
}
