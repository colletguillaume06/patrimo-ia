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

function cleanAmount(val: any): number {
  if (!val) return 0
  return parseFloat(String(val).replace(/\s/g, '').replace(',', '.')) || 0
}

function cleanDate(val: any): string | null {
  if (!val) return null
  const s = String(val).trim()
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y.length === 2 ? '20' + y : y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

export interface ImportResult {
  success: boolean
  biens_importes: number
  baux_crees: number
  paiements_crees: number
  details: ImportedItem[]
  avertissements: string[]
}

export interface ImportedItem {
  bien_nom: string
  property_id: string
  lease_id: string | null
  nb_paiements: number
  statut: 'ok' | 'erreur'
  erreur?: string
}

export async function importExcelToSupabase(
  imageBase64: string,
  userId: string,
  supabase: any
): Promise<ImportResult> {

  // ── 1. EXTRACTION IA ──
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
            data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
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

  // ── 2. PARSE JSON ──
  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleanText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

  let extracted: any
  try {
    extracted = JSON.parse(cleanText)
  } catch (e) {
    throw new Error(`JSON invalide retourné par l'IA: ${e}`)
  }

  // ── 3. INSÉRER EN BASE ──
  const results: ImportedItem[] = []
  let baux_crees = 0
  let paiements_crees = 0

  for (const item of (extracted.biens || [])) {
    try {
      const bienData = item.bien
      if (!bienData?.name) continue

      // A — Créer ou retrouver le bien
      const { data: existingProp } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', bienData.name)
        .maybeSingle()

      let propertyId: string

      if (existingProp) {
        propertyId = existingProp.id
        // Mettre à jour uniquement les champs non nuls
        const updates: any = {}
        if (bienData.address) updates.address = bienData.address
        if (bienData.city) updates.city = bienData.city
        if (bienData.surface_m2) updates.surface_m2 = cleanAmount(bienData.surface_m2)
        if (bienData.purchase_price) updates.purchase_price = cleanAmount(bienData.purchase_price)
        if (bienData.numero_fiscal) updates.numero_fiscal = bienData.numero_fiscal
        if (Object.keys(updates).length > 0) {
          await supabase.from('properties').update(updates).eq('id', propertyId)
        }
      } else {
        const { data: newProp, error: propError } = await supabase
          .from('properties')
          .insert({
            user_id: userId,
            name: bienData.name,
            type: bienData.type || 'nu',
            address: bienData.address || '',
            city: bienData.city || '',
            postal_code: bienData.postal_code || null,
            surface_m2: cleanAmount(bienData.surface_m2) || null,
            purchase_price: cleanAmount(bienData.purchase_price) || null,
            monthly_charges: cleanAmount(bienData.monthly_charges) || 0,
            property_tax: cleanAmount(bienData.property_tax) || 0,
            insurance_annual: 0,
            loan_monthly: 0,
            numero_fiscal: bienData.numero_fiscal || null,
            purchase_year: bienData.purchase_year || null,
          })
          .select('id')
          .single()

        if (propError) {
          results.push({ bien_nom: bienData.name, property_id: '', lease_id: null, nb_paiements: 0, statut: 'erreur', erreur: propError.message })
          continue
        }
        propertyId = newProp.id
      }

      // B — Créer ou mettre à jour le bail
      let leaseId: string | null = null
      const bailData = item.bail

      if (bailData?.tenant_name) {
        const { data: existingLease } = await supabase
          .from('leases')
          .select('id')
          .eq('property_id', propertyId)
          .ilike('tenant_name', bailData.tenant_name)
          .maybeSingle()

        if (existingLease) {
          leaseId = existingLease.id
          await supabase.from('leases').update({
            monthly_rent: cleanAmount(bailData.monthly_rent),
            charges: cleanAmount(bailData.monthly_charges) || 0,
            deposit: cleanAmount(bailData.deposit) || null,
            
          }).eq('id', leaseId)
        } else {
          const startDate = cleanDate(bailData.start_date) || `${new Date().getFullYear()}-01-01`
          const { data: newLease, error: leaseError } = await supabase
            .from('leases')
            .insert({
              property_id: propertyId,
              tenant_name: bailData.tenant_name,
              tenant_email: bailData.tenant_email || null,
              tenant_phone: bailData.tenant_phone || null,
              monthly_rent: cleanAmount(bailData.monthly_rent),
              charges: cleanAmount(bailData.monthly_charges) || 0,
              deposit: cleanAmount(bailData.deposit) || null,
              start_date: startDate,
              end_date: cleanDate(bailData.end_date),
              is_active: true,
              
            })
            .select('id')
            .single()

          if (!leaseError && newLease) {
            leaseId = newLease.id
            baux_crees++
          }
        }
      }

      // C — Créer les paiements
      let nbPay = 0
      if (leaseId && item.paiements?.length > 0) {
        for (const pay of item.paiements) {
          if (!pay.due_date && !pay.mois) continue

          const dueDate = pay.due_date
            ? cleanDate(pay.due_date)
            : pay.mois ? `${pay.mois}-01` : null
          if (!dueDate) continue

          const { data: existingPay } = await supabase
            .from('payments')
            .select('id')
            .eq('lease_id', leaseId)
            .eq('due_date', dueDate)
            .maybeSingle()

          if (!existingPay) {
            const { error: payError } = await supabase.from('payments').insert({
              lease_id: leaseId,
              amount: cleanAmount(pay.amount) || cleanAmount(bailData?.monthly_rent) || 0,
              due_date: dueDate,
              paid_date: cleanDate(pay.paid_date),
              status: pay.status || 'pending',
              notes: pay.note || null,
            })
            if (!payError) { nbPay++; paiements_crees++ }
          }
        }
      }

      results.push({ bien_nom: bienData.name, property_id: propertyId, lease_id: leaseId, nb_paiements: nbPay, statut: 'ok' })

    } catch (err: any) {
      results.push({ bien_nom: item.bien?.name || '?', property_id: '', lease_id: null, nb_paiements: 0, statut: 'erreur', erreur: err.message })
    }
  }

  return {
    success: true,
    biens_importes: results.filter(r => r.statut === 'ok').length,
    baux_crees,
    paiements_crees,
    details: results,
    avertissements: extracted.avertissements || [],
  }
}
