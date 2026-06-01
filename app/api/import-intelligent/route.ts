import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// ── Extraction texte PDF ──
async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(Buffer.from(buf))
    return data.text.slice(0, 8000) // Limiter pour le prompt IA
  } catch {
    return ''
  }
}

// ── Détection type de fichier ──
function detectFileType(filename: string, ext: string): string {
  const name = filename.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'excel'
  if (name.includes('bail') || name.includes('contrat') || name.includes('location')) return 'bail'
  if (name.includes('dpe') || name.includes('diagnostic') || name.includes('diag')) return 'diagnostic'
  if (name.includes('taxe') || name.includes('foncier') || name.includes('avis')) return 'taxe_fonciere'
  if (name.includes('assur') || name.includes('police')) return 'assurance'
  if (name.includes('releve') || name.includes('compte') || name.includes('bancaire') || ext === 'csv') return 'releve_bancaire'
  if (name.includes('acte') || name.includes('vente') || name.includes('notaire')) return 'acte_vente'
  if (name.includes('facture') || name.includes('devis') || name.includes('travaux')) return 'facture_travaux'
  return 'document_general'
}

// ── Analyse IA d'un document ──
async function analyseDocument(text: string, fileType: string, filename: string): Promise<any> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

  const prompts: Record<string, string> = {
    bail: `Analyse ce bail immobilier français et extrais les informations. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "bail",
  "bien": { "adresse": null, "ville": null, "code_postal": null, "surface_m2": null, "nb_pieces": null, "type_logement": null },
  "bailleur": { "nom": null, "adresse": null },
  "locataire": { "nom": null, "prenom": null, "email": null, "telephone": null },
  "bail": { "loyer_hc": null, "charges": null, "depot_garantie": null, "date_debut": null, "date_fin": null, "duree": null, "type_bail": null, "indice_irl": null },
  "garant": { "nom": null },
  "confiance": "haute|moyenne|faible"
}`,

    diagnostic: `Analyse ce rapport de diagnostic immobilier français et extrais les informations. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "diagnostic",
  "bien": { "adresse": null, "ville": null },
  "diagnostics": [
    { "type": "dpe|amiante|plomb|electricite|gaz|erp|termites|bruit|assainissement", "resultat": null, "valeur_dpe": null, "date_realisation": null, "date_expiration": null, "cabinet": null }
  ],
  "confiance": "haute|moyenne|faible"
}`,

    taxe_fonciere: `Analyse cet avis de taxe foncière français. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "taxe_fonciere",
  "bien": { "adresse": null, "ville": null },
  "taxe": { "montant_annuel": null, "annee": null },
  "confiance": "haute|moyenne|faible"
}`,

    assurance: `Analyse cette attestation ou police d'assurance immobilière française. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "assurance",
  "bien": { "adresse": null },
  "assurance": { "compagnie": null, "prime_annuelle": null, "type": "pno|hab|garantie_loyers|autre", "date_debut": null, "date_fin": null },
  "confiance": "haute|moyenne|faible"
}`,

    acte_vente: `Analyse cet acte de vente immobilier français. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "acte_vente",
  "bien": { "adresse": null, "ville": null, "code_postal": null, "surface_m2": null, "type_bien": null },
  "achat": { "prix": null, "date": null, "frais_notaire": null },
  "vendeur": { "nom": null },
  "acquereur": { "nom": null },
  "confiance": "haute|moyenne|faible"
}`,

    facture_travaux: `Analyse cette facture ou devis de travaux immobiliers. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "facture_travaux",
  "bien": { "adresse": null },
  "travaux": { "titre": null, "description": null, "entreprise": null, "montant_ht": null, "montant_ttc": null, "date": null, "categorie_fiscale": "deductible|amortissable|non_deductible" },
  "confiance": "haute|moyenne|faible"
}`,

    releve_bancaire: `Analyse ce relevé bancaire et extrais les transactions pouvant être des loyers ou revenus locatifs. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "releve_bancaire",
  "transactions": [
    { "date": null, "libelle": null, "montant": null, "type": "credit|debit" }
  ],
  "periode": { "debut": null, "fin": null },
  "confiance": "haute|moyenne|faible"
}`,

    document_general: `Analyse ce document immobilier français et extrais toutes les informations utiles pour un propriétaire bailleur. Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "inconnu",
  "type_detecte": "description du type de document détecté",
  "informations": {},
  "confiance": "faible"
}`,
  }

  const prompt = `${prompts[fileType] || prompts.document_general}

Voici le contenu du document "${filename}":
---
${text}
---

Réponds UNIQUEMENT avec le JSON, sans markdown ni explication. Si une valeur n'est pas trouvée, utilise null.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { type_document: fileType, confiance: 'faible', erreur: 'Parsing IA échoué' }
  }
}

// ── Route principale ──
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Clé IA non configurée' }, { status: 503 })
  }

  const fd = await req.formData()
  const files = fd.getAll('files') as File[]
  if (!files.length) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const results: any[] = []

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const fileType = detectFileType(file.name, ext)
    const buf = await file.arrayBuffer()

    let text = ''
    let excelData: any = null

    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(buf, { type: 'buffer' })
      const sheetsPreview: any = {}
      const sheetsContent: string[] = []
      for (const name of wb.SheetNames) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' }) as any[][]
        const headers = raw[0]?.map(String) ?? []
        const rows = raw.slice(1, 6)
        sheetsPreview[name] = { headers, rows }
        sheetsContent.push(`Onglet "${name}":\nEn-têtes: ${headers.join(' | ')}\n${rows.map(r => r.join(' | ')).join('\n')}`)
      }
      text = sheetsContent.join('\n\n').slice(0, 6000)
      excelData = { type: 'excel', sheetNames: wb.SheetNames, sheets: sheetsPreview }
    } else if (ext === 'csv') {
      // Pour les CSV : parser les colonnes et afficher le mapping
      const csvText = (await file.text()).slice(0, 6000)
      const lines = csvText.split('\n').filter(l => l.trim())
      const sep = lines[0]?.includes(';') ? ';' : ','
      const headers = lines[0]?.split(sep).map(h => h.trim().replace(/"/g, '')) ?? []
      const rows = lines.slice(1, 6).map(l => l.split(sep).map(c => c.trim().replace(/"/g, '')))
      excelData = { type: 'csv', sheets: { [file.name]: { headers, rows } }, sheetNames: [file.name] }
      text = `Fichier CSV:\nEn-têtes: ${headers.join(' | ')}\n${rows.map(r => r.join(' | ')).join('\n')}`
    } else if (ext === 'txt' || ext === 'xml' || ext === 'ofx' || ext === 'qfx') {
      text = (await file.text()).slice(0, 6000)
    } else if (ext === 'pdf') {
      text = await extractPdfText(buf)
    } else if (ext === 'doc' || ext === 'docx') {
      // Extraction texte basique depuis docx (ZIP XML)
      try {
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(buf)
        const xmlFile = zip.file('word/document.xml')
        if (xmlFile) {
          const xml = await xmlFile.async('text')
          text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000)
        }
      } catch { text = '' }
    } else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
      // Pour les images, on envoie directement à Groq vision si disponible
      // Sinon on note que c'est une image non lisible en texte
      text = `[Image: ${file.name}] — Document image, extraction de texte non disponible. Analyse visuelle recommandée.`
    } else {
      text = await file.text().catch(() => '')
    }

    if (!text.trim()) {
      results.push({ filename: file.name, fileType, erreur: 'Impossible de lire le contenu du fichier', confiance: 'faible' })
      continue
    }

    // Pour Excel/CSV → retourner directement les colonnes pour mapping manuel
    if (excelData && (ext === 'xlsx' || ext === 'xls' || ext === 'csv')) {
      // Quand même demander à l'IA de proposer un mapping des colonnes
      let mappingIA: any = null
      try {
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
        const completion = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Voici un fichier tabular immobilier. Propose un mapping des colonnes vers les champs Patrimo IA.
${text}

Réponds UNIQUEMENT en JSON:
{
  "type_detect": "loyers|depenses|travaux|baux|biens|transactions_bancaires|mixte",
  "confiance": "haute|moyenne|faible",
  "mapping_suggere": {
    "nom_bien": "nom exact colonne ou null",
    "annee": "nom exact colonne ou null",
    "montant": "nom exact colonne ou null",
    "date": "nom exact colonne ou null",
    "description": "nom exact colonne ou null",
    "locataire": "nom exact colonne ou null",
    "categorie": "nom exact colonne ou null"
  },
  "explication": "courte explication de ce que contient ce fichier"
}`
          }],
          temperature: 0.1,
          max_tokens: 800,
        })
        const raw = completion.choices[0]?.message?.content ?? ''
        mappingIA = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      } catch { mappingIA = null }

      results.push({
        filename: file.name,
        fileType: 'excel',
        size: file.size,
        needsMapping: true,
        excelData,
        mappingIA,
        analyse: {
          type_document: 'excel',
          confiance: mappingIA?.confiance ?? 'moyenne',
          type_detecte: mappingIA?.type_detect ?? 'inconnu',
          explication: mappingIA?.explication ?? 'Fichier tabular — mappez les colonnes ci-dessous',
          mapping_suggere: mappingIA?.mapping_suggere ?? {},
        },
      })
      continue
    }

    const analyse = await analyseDocument(text, fileType, file.name)

    results.push({
      filename: file.name,
      fileType,
      size: file.size,
      analyse,
      excelData,
    })
  }

  return NextResponse.json({ results })
}
