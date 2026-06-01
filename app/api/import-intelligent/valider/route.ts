import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function parseDate(raw: any): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

function parseNum(raw: any): number {
  if (!raw) return 0
  return parseFloat(String(raw).replace(/[^\d.,]/g, '').replace(',', '.')) || 0
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { documents } = await req.json()
  const results = { biens: 0, baux: 0, travaux: 0, diagnostics: 0, depenses: 0, transactions: 0, errors: [] as string[] }
  const bienMap: Record<string, string> = {}

  // Récupérer biens existants
  const { data: props } = await supabase.from('properties').select('id, name').eq('user_id', user.id)
  props?.forEach(p => { bienMap[p.name] = p.id })

  const getOrCreate = async (nom: string, extra: any = {}): Promise<string | null> => {
    if (!nom) return null
    if (bienMap[nom]) {
      // Mettre à jour si nouvelles infos
      if (Object.keys(extra).length > 0) {
        await supabase.from('properties').update(extra).eq('id', bienMap[nom])
      }
      return bienMap[nom]
    }
    const { data, error } = await supabase.from('properties').insert({
      user_id: user.id, name: nom,
      address: extra.address || '', city: extra.city || '',
      type: extra.type || 'nu',
      monthly_charges: extra.monthly_charges || 0,
      loan_monthly: 0, property_tax: 0, insurance_annual: 0,
      ...extra,
    }).select('id').single()
    if (error) { results.errors.push(`Bien "${nom}": ${error.message}`); return null }
    bienMap[nom] = data.id
    results.biens++
    return data.id
  }

  for (const doc of documents) {
    if (!doc.actif || !doc.analyse) continue
    const a = doc.analyse

    try {
      // ── BAIL ──
      if (a.type_document === 'bail') {
        const adresse = a.bien?.adresse || 'Bien importé'
        const nomBien = doc.nom_bien || adresse
        const propId = await getOrCreate(nomBien, {
          address: a.bien?.adresse || '',
          city: a.bien?.ville || '',
          postal_code: a.bien?.code_postal || '',
          surface_m2: parseNum(a.bien?.surface_m2) || null,
          type: a.bail?.type_bail?.toLowerCase() || 'nu',
          monthly_charges: parseNum(a.bail?.charges),
        })
        if (!propId) continue

        const locataire = [a.locataire?.prenom, a.locataire?.nom].filter(Boolean).join(' ') || 'Locataire'
        const { error } = await supabase.from('leases').insert({
          property_id: propId,
          tenant_name: locataire,
          tenant_email: a.locataire?.email || null,
          tenant_phone: a.locataire?.telephone || null,
          monthly_rent: parseNum(a.bail?.loyer_hc),
          monthly_charges: parseNum(a.bail?.charges),
          deposit: parseNum(a.bail?.depot_garantie),
          start_date: parseDate(a.bail?.date_debut) || new Date().toISOString().split('T')[0],
          end_date: parseDate(a.bail?.date_fin),
          is_active: true,
          irl_index: parseNum(a.bail?.indice_irl) || null,
          guarantor_name: a.garant?.nom || null,
        })
        if (!error) results.baux++
        else results.errors.push(`Bail: ${error.message}`)
      }

      // ── DIAGNOSTIC ──
      else if (a.type_document === 'diagnostic') {
        const nomBien = doc.nom_bien || a.bien?.adresse || 'Bien importé'
        const propId = await getOrCreate(nomBien, {
          address: a.bien?.adresse || '',
          city: a.bien?.ville || '',
        })
        if (!propId) continue

        const validTypes = ['dpe', 'amiante', 'plomb', 'electricite', 'gaz', 'erp', 'termites', 'bruit', 'assainissement']
        for (const diag of (a.diagnostics || [])) {
          if (!diag.type || !validTypes.includes(diag.type)) continue
          const dateReal = parseDate(diag.date_realisation)
          if (!dateReal) continue
          const { error } = await supabase.from('diagnostics').insert({
            property_id: propId,
            type: diag.type,
            resultat: diag.resultat || null,
            valeur_dpe: diag.valeur_dpe ? String(diag.valeur_dpe).toUpperCase().slice(0, 1) : null,
            date_realisation: dateReal,
            date_expiration: parseDate(diag.date_expiration),
            cabinet: diag.cabinet || null,
          })
          if (!error) results.diagnostics++
        }
      }

      // ── TAXE FONCIÈRE ──
      else if (a.type_document === 'taxe_fonciere') {
        const nomBien = doc.nom_bien || a.bien?.adresse || 'Bien importé'
        const propId = await getOrCreate(nomBien, { address: a.bien?.adresse || '' })
        if (!propId) continue

        const montant = parseNum(a.taxe?.montant_annuel)
        if (montant > 0) {
          await supabase.from('properties').update({ property_tax: montant }).eq('id', propId)
          const annee = Number(a.taxe?.annee) || new Date().getFullYear()
          const { error } = await supabase.from('expenses').insert({
            property_id: propId, amount: montant,
            date: `${annee}-10-15`, category: 'taxe_fonciere',
            description: `Taxe foncière ${annee}`, deductible: true,
          })
          if (!error) results.depenses++
        }
      }

      // ── ASSURANCE ──
      else if (a.type_document === 'assurance') {
        const nomBien = doc.nom_bien || a.bien?.adresse || 'Bien importé'
        const propId = await getOrCreate(nomBien, { address: a.bien?.adresse || '' })
        if (!propId) continue

        const prime = parseNum(a.assurance?.prime_annuelle)
        if (prime > 0) {
          await supabase.from('properties').update({ insurance_annual: prime }).eq('id', propId)
          const { error } = await supabase.from('expenses').insert({
            property_id: propId, amount: prime,
            date: parseDate(a.assurance?.date_debut) || new Date().toISOString().split('T')[0],
            category: 'assurance',
            description: `Assurance ${a.assurance?.compagnie || ''} ${a.assurance?.type || ''}`.trim(),
            deductible: true,
          })
          if (!error) results.depenses++
        }
      }

      // ── ACTE DE VENTE ──
      else if (a.type_document === 'acte_vente') {
        const adresse = a.bien?.adresse || 'Bien importé'
        const nomBien = doc.nom_bien || adresse
        await getOrCreate(nomBien, {
          address: a.bien?.adresse || '',
          city: a.bien?.ville || '',
          postal_code: a.bien?.code_postal || '',
          surface_m2: parseNum(a.bien?.surface_m2) || null,
          type: a.bien?.type_bien?.toLowerCase() || 'nu',
          purchase_price: parseNum(a.achat?.prix) || null,
        })
      }

      // ── FACTURE TRAVAUX ──
      else if (a.type_document === 'facture_travaux') {
        const nomBien = doc.nom_bien || a.bien?.adresse || 'Bien importé'
        const propId = await getOrCreate(nomBien, { address: a.bien?.adresse || '' })
        if (!propId) continue

        const montant = parseNum(a.travaux?.montant_ttc || a.travaux?.montant_ht)
        if (!montant) continue

        const validCats = ['deductible', 'amortissable', 'non_deductible']
        const catFiscale = a.travaux?.categorie_fiscale || 'deductible'

        const { error } = await supabase.from('incidents').insert({
          property_id: propId,
          title: a.travaux?.titre || 'Travaux importés',
          description: a.travaux?.description || '',
          date_travaux: parseDate(a.travaux?.date) || new Date().toISOString().split('T')[0],
          actual_cost: montant,
          company: a.travaux?.entreprise || null,
          status: 'termine',
          fiscal_category: validCats.includes(catFiscale) ? catFiscale : 'deductible',
        })
        if (!error) results.travaux++
        else results.errors.push(`Travaux: ${error.message}`)
      }

      // ── RELEVÉ BANCAIRE ──
      else if (a.type_document === 'releve_bancaire') {
        const credits = (a.transactions || []).filter((t: any) => t.type === 'credit' && parseNum(t.montant) > 0)
        for (const tx of credits) {
          const { error } = await supabase.from('rapprochement_transactions').insert({
            user_id: user.id,
            date: parseDate(tx.date) || new Date().toISOString().split('T')[0],
            libelle: tx.libelle || 'Transaction importée',
            montant: parseNum(tx.montant),
            statut: 'non_rapproché',
          })
          if (!error) results.transactions++
        }
      }

    } catch (err: any) {
      results.errors.push(`${doc.filename}: ${err.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Import terminé : ${results.biens} biens, ${results.baux} baux, ${results.diagnostics} diagnostics, ${results.travaux} travaux, ${results.depenses} dépenses, ${results.transactions} transactions`,
  })
}
