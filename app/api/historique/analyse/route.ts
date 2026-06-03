import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const rateLimitResponse = await checkRateLimit(user.id)
  if (rateLimitResponse) return rateLimitResponse

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Clé API IA non configurée' }, { status: 503 })
  }

  const fd = await req.formData()
  const file = fd.get('file') as File
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  // ── Parse Excel ──
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'buffer' })

  // Extraire tous les onglets avec leurs en-têtes + 5 premières lignes
  const sheets: Record<string, { headers: string[], rows: any[][] }> = {}
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    if (raw.length === 0) continue
    const headers = raw[0].map(String)
    const rows = raw.slice(1, 6).filter(r => r.some(c => c !== ''))
    sheets[sheetName] = { headers, rows }
  }

  // ── Prompt IA ──
  const sheetsDescription = Object.entries(sheets).map(([name, { headers, rows }]) => `
Onglet: "${name}"
En-têtes: ${headers.join(' | ')}
Exemple de données (5 lignes max):
${rows.map(r => r.join(' | ')).join('\n')}
`).join('\n---\n')

  const prompt = `Tu es un expert en comptabilité immobilière française. Analyse ce fichier Excel et détecte les colonnes correspondant aux données immobilières.

${sheetsDescription}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans explication) avec cette structure exacte:
{
  "type_fichier": "string (description courte du fichier détecté)",
  "confiance": "haute|moyenne|faible",
  "onglets": {
    "nom_onglet": {
      "type": "biens|loyers|depenses|mixte|inconnu",
      "mapping": {
        "nom_bien": "nom exact de la colonne ou null",
        "annee": "nom exact de la colonne ou null",
        "montant": "nom exact de la colonne ou null",
        "date": "nom exact de la colonne ou null",
        "description": "nom exact de la colonne ou null",
        "locataire": "nom exact de la colonne ou null",
        "categorie": "nom exact de la colonne ou null",
        "adresse": "nom exact de la colonne ou null",
        "type_bien": "nom exact de la colonne ou null",
        "surface": "nom exact de la colonne ou null"
      },
      "ligne_debut": 1
    }
  },
  "suggestions": ["suggestion 1", "suggestion 2"]
}`

  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

  const completion = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1500,
  })

  const rawResponse = completion.choices[0]?.message?.content ?? ''

  let analysis: any
  try {
    // Nettoyer la réponse (enlever markdown si présent)
    const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    analysis = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'L\'IA n\'a pas pu analyser ce fichier', raw: rawResponse }, { status: 422 })
  }

  // Retourner l'analyse + l'aperçu des données
  return NextResponse.json({
    analysis,
    sheets,
    filename: file.name,
  })
}
