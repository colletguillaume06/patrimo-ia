import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Variables détectées automatiquement dans le texte du bail
const VARIABLE_PATTERNS = [
  // Noms/prénoms génériques
  { regex: /M\.\s+[A-Z][A-ZÀ-ÿ\s]+(?=,|\s+demeur)/g, tag: '{bailleur_nom}', label: 'Nom du bailleur' },
  { regex: /Mme\s+[A-Z][A-ZÀ-ÿ\s]+(?=,|\s+demeur)/g, tag: '{bailleur_nom}', label: 'Nom du bailleur' },
  // Dates de début/fin
  { regex: /(?:à compter du|prenant effet le|à partir du)\s+\d{1,2}(?:er)?\s+\w+\s+\d{4}/gi, tag: '{date_debut}', label: 'Date de début' },
  // Montants loyer
  { regex: /(?:loyer mensuel|loyer de)\s+\d[\d\s]*(?:,\d+)?\s*(?:euros?|€)/gi, tag: '{loyer_hc} €', label: 'Loyer mensuel' },
  // Dépôt de garantie
  { regex: /(?:dépôt de garantie|caution)\s+de\s+\d[\d\s]*(?:,\d+)?\s*(?:euros?|€)/gi, tag: '{depot} €', label: 'Dépôt de garantie' },
]

const VARIABLE_SUGGESTIONS = [
  { tag: '{bailleur_nom}', label: 'Votre nom', example: 'Nicole Collet' },
  { tag: '{bailleur_adresse}', label: 'Votre adresse', example: '18 rue Lepic, 75018 Paris' },
  { tag: '{locataire_nom}', label: 'Nom du locataire', example: 'Sophie Martin' },
  { tag: '{locataire_adresse}', label: 'Adresse du locataire', example: '5 rue Victor Hugo, Nice' },
  { tag: '{adresse_bien}', label: 'Adresse du bien', example: '10 Promenade des Anglais, Nice' },
  { tag: '{date_debut}', label: 'Date de début', example: '1er juillet 2026' },
  { tag: '{date_fin}', label: 'Date de fin', example: '30 juin 2027' },
  { tag: '{duree}', label: 'Durée', example: '1 an' },
  { tag: '{loyer_hc}', label: 'Loyer HC (€)', example: '950' },
  { tag: '{charges}', label: 'Charges (€)', example: '80' },
  { tag: '{depot}', label: 'Dépôt de garantie (€)', example: '1 900' },
  { tag: '{indice_irl}', label: 'Indice IRL', example: '147.88 (T2 2026)' },
  { tag: '{ville_signature}', label: 'Ville de signature', example: 'Nice' },
  { tag: '{date_signature}', label: 'Date de signature', example: '15 juin 2026' },
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const nom = formData.get('nom') as string || 'Mon modèle'
  const type_bail = formData.get('type_bail') as string || 'meuble'

  if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 })

  // Lire le contenu
  let contenu = ''
  if (file.type === 'application/pdf') {
    // Si PDF et LlamaParse dispo
    if (process.env.LLAMA_PARSE_API_KEY) {
      try {
        const llamaForm = new FormData()
        llamaForm.append('file', new Blob([await file.arrayBuffer()], { type: 'application/pdf' }), file.name)
        const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.LLAMA_PARSE_API_KEY}` },
          body: llamaForm,
          signal: AbortSignal.timeout(30000),
        })
        if (uploadRes.ok) {
          const { id: jobId } = await uploadRes.json()
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 3000))
            const resultRes = await fetch(
              `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
              { headers: { Authorization: `Bearer ${process.env.LLAMA_PARSE_API_KEY}` } }
            )
            if (resultRes.ok) { const r = await resultRes.json(); if (r.markdown) { contenu = r.markdown; break } }
          }
        }
      } catch {}
    }
    if (!contenu) return NextResponse.json({ error: 'PDF non supporté sans LlamaParse. Convertissez en .txt d\'abord.' }, { status: 400 })
  } else {
    // .txt ou .html
    contenu = await file.text()
  }

  // Uploader le fichier original en storage
  const service = await createServiceClient()
  const fileName = `${user.id}/${Date.now()}-${file.name}`
  const { data: uploadData } = await service.storage
    .from('modeles-baux')
    .upload(fileName, await file.arrayBuffer(), { contentType: file.type, upsert: true })
  const { data: { publicUrl } } = service.storage.from('modeles-baux').getPublicUrl(fileName)

  // Détecter les variables déjà présentes dans le texte (format {variable})
  const detectedVars = contenu.match(/\{[a-z_]+\}/g) ?? []
  const uniqueVars = [...new Set(detectedVars)]

  // Sauvegarder le modèle
  const { data: modele, error } = await service.from('modeles_baux').insert({
    user_id: user.id,
    nom,
    type_bail,
    contenu,
    variables: uniqueVars,
    file_url: publicUrl,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    modele,
    variables_detectees: uniqueVars,
    suggestions: VARIABLE_SUGGESTIONS,
    preview: contenu.slice(0, 500),
  })
}
