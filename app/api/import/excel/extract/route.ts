import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXCEL_MAPPING_SYSTEM_PROMPT = `Tu es un expert comptable immobilier français.
On te donne une photo d'un tableau Excel de gestion locative. Il contient des données mélangées sur plusieurs biens immobiliers.

TON TRAVAIL EN 3 ÉTAPES :

ÉTAPE A — IDENTIFIER les colonnes et leur rôle
Analyse chaque colonne et classifie-la :
  - BIEN      : identifie le bien (nom, adresse, type, surface, prix achat, charges, numéro fiscal)
  - BAIL      : infos contrat (locataire, loyer, charges, date début, date fin, dépôt garantie, indice IRL)
  - PAIEMENT  : loyers mensuels (mois, montant, statut, date paiement)
  - INCONNU   : si tu ne sais pas

ÉTAPE B — GROUPER les lignes par bien
Identifie quelle colonne permet de distinguer les biens. Groupe toutes les lignes du même bien.

ÉTAPE C — STRUCTURER en JSON
Retourne UNIQUEMENT ce JSON brut, sans markdown :

{
  "biens": [
    {
      "bien": {
        "name": "Nom ou référence du bien",
        "type": "lmnp|nu|sci|airbnb|commerce",
        "address": null,
        "city": null,
        "postal_code": null,
        "surface_m2": null,
        "purchase_price": null,
        "monthly_charges": 0,
        "property_tax": null,
        "numero_fiscal": null,
        "purchase_year": null
      },
      "bail": {
        "tenant_name": null,
        "tenant_email": null,
        "tenant_phone": null,
        "monthly_rent": 0,
        "monthly_charges": 0,
        "deposit": null,
        "start_date": null,
        "end_date": null,
        "irl_index": null
      },
      "paiements": [
        {
          "mois": "YYYY-MM",
          "amount": 0,
          "due_date": "YYYY-MM-DD",
          "paid_date": null,
          "status": "paid|pending|late|partial",
          "note": null
        }
      ]
    }
  ],
  "colonnes_identifiees": {
    "bien": [],
    "bail": [],
    "paiement": [],
    "inconnu": []
  },
  "nb_biens": 0,
  "avertissements": []
}

RÈGLES ABSOLUES :
- Dates toujours en YYYY-MM-DD. Les dates françaises sont JJ/MM/YYYY.
- Montants : nombre décimal sans symbole. "1 250,50" → 1250.50
- Type de bien : devine selon contexte (meublé=lmnp, vide=nu, saisonnier=airbnb, local=commerce)
- Si info absente : null (jamais "" ni "N/A")
- Status paiement : paid=payé/OK/✓, late=retard/impayé, partial=partiel, pending=vide/prévu
- Retourne UNIQUEMENT le JSON, rien d'autre`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { image_base64 } = body
    if (!image_base64) return NextResponse.json({ error: 'image_base64 requis' }, { status: 400 })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8096,
      system: EXCEL_MAPPING_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: image_base64.replace(/^data:image\/\w+;base64,/, ''),
            },
          },
          {
            type: 'text',
            text: `Analyse ce tableau Excel de gestion locative français.
Identifie chaque bien, son bail actif et tous ses paiements mensuels.
Lis TOUS les montants visibles dans les cellules.
Retourne le JSON structuré demandé.`,
          },
        ],
      }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleanText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

    let extracted: any
    try {
      extracted = JSON.parse(cleanText)
    } catch (e) {
      return NextResponse.json({ error: `JSON invalide retourné par l'IA: ${e}` }, { status: 500 })
    }

    return NextResponse.json(extracted)

  } catch (error: any) {
    console.error('Extract error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
