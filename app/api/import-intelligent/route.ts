import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// ── Extraction texte PDF ──
async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const fn = pdfParse.default ?? pdfParse
    const data = await fn(Buffer.from(buf))
    return data.text.slice(0, 8000)
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
  if (name.includes('assur') || name.includes('police')) return 'assurance'
  if (name.includes('releve') || name.includes('compte') || name.includes('bancaire')) return 'releve_bancaire'
  if (name.includes('acte') || name.includes('vente') || name.includes('notaire')) return 'acte_vente'
  if (name.includes('facture') || name.includes('devis') || name.includes('travaux')) return 'facture_travaux'
  if (name.includes('ifi') || name.includes('fortune') || name.includes('annexe') || name.includes('patrimoine') || name.includes('2042-ifi') || name.includes('2042ifi')) return 'ifi'
  if (name.includes('declaration') || name.includes('déclaration') || name.includes('impot') || name.includes('impôt') || name.includes('2042') || name.includes('2044') || name.includes('2072') || name.includes('avis_imposition') || name.includes('avis imposition') || name.includes('dgfip') || name.includes('cerfa')) return 'declaration_impots'
  if (name.includes('taxe') || name.includes('foncier') || name.includes('avis')) return 'taxe_fonciere'
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

    ifi: `Tu es un expert-comptable français spécialisé en IFI (Impôt sur la Fortune Immobilière). Analyse ce document IFI (formulaire 2042-IFI, annexe biens détenus, état du patrimoine immobilier) et extrais TOUS les biens immobiliers listés avec leurs caractéristiques.

Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "ifi",
  "type_formulaire": "2042_ifi|annexe_biens|etat_patrimoine|autre",
  "annee": null,
  "declarant": { "nom": null, "prenom": null, "adresse": null, "numero_fiscal": null },
  "biens": [
    {
      "adresse": null,
      "ville": null,
      "code_postal": null,
      "nature": "immeuble_bati|immeuble_non_bati|parts_sci|usufruit|autre",
      "nature_detail": null,
      "pleine_propriete": null,
      "fraction_detention": null,
      "bien_mixte": null,
      "fraction_taxable_pourcent": null,
      "date_acquisition": null,
      "prix_acquisition": null,
      "surface_m2": null,
      "surface_terrain_m2": null,
      "nb_pieces": null,
      "valeur_declaree": null,
      "case_formulaire": null,
      "type_patrimo": "lmnp|nu|sci|airbnb|commerce|residence_principale|autre"
    }
  ],
  "valeur_totale_declaree": null,
  "confiance": "haute|moyenne|faible",
  "notes": "observations importantes"
}`,

    declaration_impots: `Tu es un expert-comptable français spécialisé en fiscalité immobilière. Analyse ce document fiscal (avis d'imposition, déclaration 2042/2044/2072 ou tout document DGFiP) et extrais TOUTES les informations importantes pour un propriétaire bailleur.

Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "declaration_impots",
  "type_formulaire": "avis_imposition|2042|2042_c_pro|2044|2044_spe|2072|autre",
  "annee_revenus": null,
  "declarant": { "nom": null, "prenom": null, "adresse": null, "numero_fiscal": null },
  "revenus_fonciers": {
    "revenus_bruts": null,
    "charges_deductibles": null,
    "deficit_foncier": null,
    "revenu_net_foncier": null,
    "cases_2044": { "case_110": null, "case_230": null }
  },
  "revenus_lmnp_bic": {
    "revenus_bruts": null,
    "charges": null,
    "amortissements": null,
    "resultat_net": null,
    "regime": "reel|micro_bic|null"
  },
  "sci": {
    "resultat": null,
    "is_du": null,
    "dividendes": null
  },
  "impots": {
    "revenu_fiscal_reference": null,
    "revenu_net_global": null,
    "impot_brut": null,
    "impot_net_paye": null,
    "tmi_pourcent": null,
    "prelevement_source": null,
    "contributions_sociales": null
  },
  "biens_declares": [
    { "adresse": null, "loyers_bruts": null, "charges": null }
  ],
  "confiance": "haute|moyenne|faible",
  "notes": "observations importantes ou points d'attention"
}`,

    document_general: `Tu es un expert-comptable français. Analyse ce document et détermine d'abord son type, puis extrais toutes les informations utiles pour un propriétaire immobilier.

Types possibles à détecter : bail, diagnostic, taxe_fonciere, assurance, acte_vente, facture_travaux, releve_bancaire, declaration_impots, ifi, quittance, compromis_vente, offre_achat, autre.

Si c'est un document IFI ou déclaration de patrimoine, extrais CHAQUE bien immobilier listé avec : adresse, surface, nb pièces, date acquisition, valeur déclarée.

Réponds UNIQUEMENT en JSON valide:
{
  "type_document": "type_detecte",
  "type_detecte": "description precise du document",
  "biens": [
    {
      "adresse": null,
      "surface_m2": null,
      "nb_pieces": null,
      "date_acquisition": null,
      "valeur_declaree": null,
      "prix_acquisition": null,
      "nature": null
    }
  ],
  "informations": {},
  "confiance": "haute|moyenne|faible"
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
      // Utiliser le modèle vision Groq pour analyser les images directement
      try {
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY non configurée')

        // Pas de compression — image originale pour meilleure lisibilité
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
        const base64 = Buffer.from(buf).toString('base64')
        console.log(`Image originale : ${Math.round(buf.byteLength/1024)}KB`)

        // Appel Claude via Anthropic SDK
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const client = new Anthropic({ apiKey: anthropicKey })

        // Analyse directe — Claude lit l'image librement puis structure
        const message = await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 8000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType as any, data: base64 } },
              { type: 'text', text: `Tu es un expert-comptable français. Analyse ce tableau Excel de suivi locatif.

Ce type de tableau a une structure précise :
- LIGNE 1 (en-tête) : noms des biens (une colonne par bien)
- LIGNES 2-8 (méta-données) : pour chaque bien, plusieurs lignes contenant le NOM DU LOCATAIRE ou de la société, la DATE DU BAIL, le montant CAUTION (ex: "CAUTION 850"), l'INDICE IRL/ICC/IRLC et sa valeur (ex: "IRL 2T2020 130.57"), le NUMÉRO FISCAL (ex: "n° fiscal 061481310130")
- LIGNE LOYER MENSUEL : montant de base du loyer
- LIGNES JANVIER-DÉCEMBRE : paiements mensuels par bien

INSTRUCTIONS :
1. Pour chaque colonne-bien, lis les LIGNES D'EN-TÊTE pour extraire : nom locataire, date bail, caution, IRL/ICC avec valeur, n°fiscal
2. Lis le loyer mensuel de base (souvent répété sur chaque ligne mois)
3. Lis les 12 lignes mensuelles (loyer + notes éventuelles)
4. Note les dépenses ponctuelles (assurances "Macif", "Generali", syndic, etc.)
5. Note les totaux annuels en bas

Retourne UNIQUEMENT ce JSON sans markdown :
{
  "type_document": "tableau_loyers",
  "type_detecte": "description du tableau",
  "annee": null,
  "biens": [
    {
      "nom": "nom exact de la colonne bien",
      "type": "lmnp|nu|sci|airbnb|commerce",
      "locataire": "nom complet du locataire ou société visible dans l'en-tête",
      "date_entree": "date de début du bail en YYYY-MM-DD",
      "loyer_mensuel": 0,
      "charges_mensuelles": 0,
      "depot_garantie": 0,
      "indice_irl": "valeur numérique de l'indice (ex: 130.57)",
      "trimestre_irl": "ex: 2T2020",
      "numero_fiscal": "numéro fiscal exact",
      "loyers_annuel_total": 0,
      "paiements_mensuels": [
        {"mois": "janvier", "loyer": 0, "notes": null}
      ],
      "depenses": [
        {"description": "Macif", "montant": 0, "mois": "mars", "categorie": "assurance"}
      ]
    }
  ],
  "total_loyers_annuel": 0,
  "confiance": "haute|moyenne|faible",
  "notes": null
}` }
            ]
          }]
        })

        const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const visionResult = JSON.parse(cleaned)

        results.push({
          filename: file.name,
          fileType: visionResult.type_document || 'tableau_loyers',
          size: file.size,
          analyse: { ...visionResult, confiance: visionResult.confiance || 'haute' },
          isImage: true,
        })
        continue
      } catch (err: any) {
        const errMsg = err?.message || String(err)
        console.error('Vision error:', errMsg)
        results.push({
          filename: file.name,
          fileType: 'image',
          size: file.size,
          erreur: `Analyse image échouée : ${errMsg}`,
          analyse: { type_document: 'image', confiance: 'faible', erreur_detail: errMsg },
          isImage: true,
        })
        continue
      }
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
