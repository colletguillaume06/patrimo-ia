import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/ratelimit'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const rateLimitResponse = await checkRateLimit(user.id)
  if (rateLimitResponse) return rateLimitResponse

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API non configurée' }, { status: 503 })
  }

  const fd = await req.formData()
  const file = fd.get('file') as File
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const buf = await file.arrayBuffer()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpeg'

  // Compression si > 4MB
  let imgBuffer = Buffer.from(buf)
  if (imgBuffer.byteLength > 4 * 1024 * 1024) {
    imgBuffer = await sharp(imgBuffer).jpeg({ quality: 80 }).toBuffer()
  }
  const base64 = imgBuffer.toString('base64')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
        },
        {
          type: 'text',
          text: `Analyse cette facture ou note de frais française et extrais les informations.
Retourne UNIQUEMENT ce JSON sans markdown :
{
  "fournisseur": "nom de l'entreprise ou prestataire",
  "montant_ttc": 0,
  "montant_ht": null,
  "tva": null,
  "date": "YYYY-MM-DD",
  "description": "description courte des travaux ou services",
  "numero_facture": null,
  "categorie": "travaux_deductibles|travaux_amortissables|charges|assurance|gestion|taxe_fonciere|autre",
  "confiance": "haute|moyenne|faible"
}`
        }
      ]
    }]
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const result = JSON.parse(cleaned)
    return NextResponse.json({ success: true, data: result })
  } catch {
    return NextResponse.json({ error: 'Impossible de lire la facture', raw }, { status: 422 })
  }
}
