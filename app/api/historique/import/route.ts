import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

function parseDate(raw: any): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

function parseNum(raw: any): number {
  return parseFloat(String(raw ?? '0').replace(',', '.').replace(/\s/g, '')) || 0
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const fd = await req.formData()
  const file = fd.get('file') as File
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'buffer' })

  const results = {
    biens: 0, baux: 0, loyers: 0,
    depenses: 0, travaux: 0, diagnostics: 0,
    errors: [] as string[],
  }

  const bienMap: Record<string, string> = {}

  // Récupérer biens existants
  const { data: existingProps } = await supabase.from('properties').select('id, name').eq('user_id', user.id)
  existingProps?.forEach(p => { bienMap[p.name] = p.id })

  // ── Helper : créer bien si inexistant ──
  const getOrCreateBien = async (nom: string): Promise<string | null> => {
    if (bienMap[nom]) return bienMap[nom]
    const { data, error } = await supabase.from('properties').insert({
      user_id: user.id, name: nom, address: '', city: '', type: 'nu',
      monthly_charges: 0, loan_monthly: 0, property_tax: 0, insurance_annual: 0,
    }).select('id').single()
    if (error) { results.errors.push(`Bien "${nom}": ${error.message}`); return null }
    bienMap[nom] = data.id
    results.biens++
    return data.id
  }

  // ── ONGLET BIENS ──
  if (wb.Sheets['Biens']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Biens'], { defval: '' }) as any[]
    for (const r of rows) {
      const nom = String(r['Nom du bien*'] || r['Nom du bien'] || '').trim()
      if (!nom || nom.startsWith('Catégories') || nom.startsWith('Types')) continue

      const type = String(r['Type*'] || r['Type'] || 'nu').toLowerCase().trim()
      const validTypes = ['lmnp', 'nu', 'sci', 'airbnb', 'commerce']

      const payload: any = {
        user_id: user.id,
        name: nom,
        address: String(r['Adresse*'] || r['Adresse'] || ''),
        city: String(r['Ville*'] || r['Ville'] || ''),
        postal_code: String(r['Code postal'] || ''),
        type: validTypes.includes(type) ? type : 'nu',
        surface_m2: parseNum(r['Surface (m²)']) || null,
        nb_pieces: parseNum(r['Nb pièces']) || null,
        floor: parseNum(r['Étage']) || null,
        purchase_price: parseNum(r['Prix achat (€)']) || null,
        purchase_year: parseNum(r['Année achat']) || null,
        monthly_charges: parseNum(r['Charges mensuelles (€)']),
        property_tax: parseNum(r['Taxe foncière annuelle (€)']),
        insurance_annual: parseNum(r['Assurance annuelle (€)']),
        dpe_lettre: String(r['DPE (A/B/C/D/E/F/G)'] || '').trim().toUpperCase() || null,
        loan_monthly: parseNum(r['Capital emprunté (€)']) > 0
          ? Math.round(parseNum(r['Capital emprunté (€)']) * (parseNum(r['Taux annuel (%)']) / 100 / 12) / (1 - Math.pow(1 + parseNum(r['Taux annuel (%)']) / 100 / 12, -parseNum(r['Durée prêt (mois)'])))) || 0
          : 0,
        pret_banque: String(r['Banque prêt'] || '') || null,
        pret_capital: parseNum(r['Capital emprunté (€)']) || null,
        pret_taux_annuel: parseNum(r['Taux annuel (%)']) || null,
        pret_duree_mois: parseNum(r['Durée prêt (mois)']) || null,
        pret_date_debut: parseDate(r['Date 1ère échéance prêt']),
        pret_assurance_mensuelle: parseNum(r['Assurance prêt mensuelle (€)']) || 0,
        copro_syndic_nom: String(r['Syndic (nom)'] || '') || null,
        copro_charges_trimestrielles: parseNum(r['Charges copropriété trimestrielles (€)']) || null,
        copro_tantiemes: parseNum(r['Tantièmes']) || null,
      }

      if (bienMap[nom]) {
        // Mettre à jour le bien existant
        const { error } = await supabase.from('properties').update(payload).eq('id', bienMap[nom])
        if (error) results.errors.push(`Mise à jour bien "${nom}": ${error.message}`)
      } else {
        const { data, error } = await supabase.from('properties').insert(payload).select('id').single()
        if (error) { results.errors.push(`Bien "${nom}": ${error.message}`); continue }
        bienMap[nom] = data.id
        results.biens++
      }
    }
  }

  // ── ONGLET BAUX ──
  if (wb.Sheets['Baux']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Baux'], { defval: '' }) as any[]
    for (const r of rows) {
      const nom = String(r['Nom du bien*'] || r['Nom du bien'] || '').trim()
      const locNom = String(r['Nom locataire*'] || r['Nom locataire'] || '').trim()
      if (!nom || !locNom) continue

      const propId = await getOrCreateBien(nom)
      if (!propId) continue

      const actif = String(r['Bail actif (oui/non)'] || 'oui').toLowerCase() === 'oui'
      const { error } = await supabase.from('leases').upsert({
        property_id: propId,
        tenant_name: `${r['Prénom locataire'] || ''} ${locNom}`.trim(),
        tenant_email: String(r['Email locataire'] || '') || null,
        tenant_phone: String(r['Téléphone locataire'] || '') || null,
        monthly_rent: parseNum(r['Loyer mensuel HC (€)*'] || r['Loyer mensuel HC (€)']),
        monthly_charges: parseNum(r['Charges mensuelles (€)']),
        deposit: parseNum(r['Dépôt de garantie (€)']),
        start_date: parseDate(r['Date début bail*'] || r['Date début bail']) ?? new Date().toISOString().split('T')[0],
        end_date: parseDate(r['Date fin bail']) || null,
        is_active: actif,
        irl_index: parseNum(r['Indice IRL signature']) || null,
        guarantor_name: String(r['Garant (nom)'] || '') || null,
      }, { onConflict: 'property_id,tenant_name' })

      if (error) results.errors.push(`Bail "${nom}/${locNom}": ${error.message}`)
      else results.baux++
    }
  }

  // ── ONGLET LOYERS ──
  if (wb.Sheets['Loyers']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Loyers'], { defval: '' }) as any[]
    for (const r of rows) {
      const nom = String(r['Nom du bien*'] || r['Nom du bien'] || '').trim()
      const annee = parseNum(r['Année*'] || r['Année'])
      const total = parseNum(r['Loyers encaissés (€)*'] || r['Loyers encaissés (€)'])
      if (!nom || !annee || !total) continue

      const propId = await getOrCreateBien(nom)
      if (!propId) continue

      const moisVacants = parseNum(r['Mois non loués']) || 0
      const moisLoues = 12 - moisVacants
      const mensuel = Math.round(total / (moisLoues || 12))

      // Trouver ou créer un bail
      const { data: lease } = await supabase.from('leases').select('id').eq('property_id', propId).limit(1).single()
      let leaseId = lease?.id ?? null
      if (!leaseId) {
        const { data: nl } = await supabase.from('leases').insert({
          property_id: propId, tenant_name: 'Locataire historique',
          monthly_rent: mensuel, start_date: `${annee}-01-01`, is_active: false,
        }).select('id').single()
        leaseId = nl?.id ?? null
      }
      if (!leaseId) continue

      const payments = []
      for (let m = 1; m <= 12; m++) {
        if (moisVacants > 0 && m > moisLoues) continue
        payments.push({
          lease_id: leaseId,
          amount: mensuel,
          due_date: `${annee}-${String(m).padStart(2, '0')}-01`,
          paid_date: `${annee}-${String(m).padStart(2, '0')}-05`,
          status: 'paid',
          notes: `Historique ${annee}`,
        })
      }
      if (payments.length > 0) {
        const { error } = await supabase.from('payments').insert(payments)
        if (!error) results.loyers += payments.length
        else results.errors.push(`Loyers "${nom}" ${annee}: ${error.message}`)
      }
    }
  }

  // ── ONGLET DÉPENSES ──
  if (wb.Sheets['Dépenses']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Dépenses'], { defval: '' }) as any[]
    for (const r of rows) {
      const nom = String(r['Nom du bien*'] || r['Nom du bien'] || '').trim()
      const annee = parseNum(r['Année*'] || r['Année'])
      const montant = parseNum(r['Montant (€)*'] || r['Montant (€)'])
      const cat = String(r['Catégorie*'] || r['Catégorie'] || 'charges').trim()
      if (!nom || !annee || !montant || cat.startsWith('Catégories')) continue

      const propId = await getOrCreateBien(nom)
      if (!propId) continue

      const dateRaw = r['Date (optionnel)'] || r['Date']
      const date = parseDate(dateRaw) ?? `${annee}-06-15`
      const description = String(r['Description'] || cat)
      const deductible = ['charges', 'travaux_deductibles', 'assurance', 'gestion', 'taxe_fonciere', 'comptabilite'].includes(cat)

      const { error } = await supabase.from('expenses').insert({
        property_id: propId, amount: montant, date, category: cat, description, deductible,
      })
      if (!error) results.depenses++
      else results.errors.push(`Dépense "${description}": ${error.message}`)
    }
  }

  // ── ONGLET TRAVAUX ──
  if (wb.Sheets['Travaux']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Travaux'], { defval: '' }) as any[]
    for (const r of rows) {
      const nom = String(r['Nom du bien*'] || r['Nom du bien'] || '').trim()
      const titre = String(r['Titre*'] || r['Titre'] || '').trim()
      if (!nom || !titre || titre.startsWith('Statuts') || titre.startsWith('Catégories')) continue

      const propId = await getOrCreateBien(nom)
      if (!propId) continue

      const statut = String(r['Statut'] || 'termine').toLowerCase()
      const catFiscale = String(r['Catégorie fiscale'] || 'deductible').toLowerCase()
      const validStatuts = ['planifie', 'en_cours', 'termine']
      const validCats = ['deductible', 'amortissable', 'non_deductible']

      const { error } = await supabase.from('incidents').insert({
        property_id: propId,
        title: titre,
        description: String(r['Description'] || ''),
        date_travaux: parseDate(r['Date travaux']) ?? new Date().toISOString().split('T')[0],
        date_fin: parseDate(r['Date fin (optionnel)']) || null,
        estimated_cost: parseNum(r['Montant estimé (€)']) || null,
        actual_cost: parseNum(r['Montant payé (€)']) || null,
        company: String(r['Entreprise'] || '') || null,
        status: validStatuts.includes(statut) ? statut : 'termine',
        fiscal_category: validCats.includes(catFiscale) ? catFiscale : 'deductible',
      })
      if (!error) results.travaux++
      else results.errors.push(`Travaux "${titre}": ${error.message}`)
    }
  }

  // ── ONGLET DIAGNOSTICS ──
  if (wb.Sheets['Diagnostics']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Diagnostics'], { defval: '' }) as any[]
    const validTypes = ['dpe', 'amiante', 'plomb', 'electricite', 'gaz', 'erp', 'termites', 'bruit', 'assainissement']

    for (const r of rows) {
      const nom = String(r['Nom du bien*'] || r['Nom du bien'] || '').trim()
      const type = String(r['Type*'] || r['Type'] || '').toLowerCase().trim()
      const dateReal = parseDate(r['Date réalisation*'] || r['Date réalisation'])
      if (!nom || !type || !dateReal || !validTypes.includes(type) || nom.startsWith('Types')) continue

      const propId = await getOrCreateBien(nom)
      if (!propId) continue

      const resultat = String(r['Résultat / Classe'] || '').trim()
      const valeurDPE = type === 'dpe' ? resultat.toUpperCase().slice(0, 1) : null

      const { error } = await supabase.from('diagnostics').insert({
        property_id: propId,
        type,
        resultat: resultat || null,
        valeur_dpe: ['A','B','C','D','E','F','G'].includes(valeurDPE ?? '') ? valeurDPE : null,
        date_realisation: dateReal,
        date_expiration: parseDate(r['Date expiration']) || null,
        cabinet: String(r['Cabinet'] || '') || null,
      })
      if (!error) results.diagnostics++
      else results.errors.push(`Diag "${type}" sur "${nom}": ${error.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Import terminé : ${results.biens} biens, ${results.baux} baux, ${results.loyers} paiements, ${results.depenses} dépenses, ${results.travaux} travaux, ${results.diagnostics} diagnostics`,
  })
}
