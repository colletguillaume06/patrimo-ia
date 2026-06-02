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
  const results = { biens: 0, baux: 0, loyers: 0, travaux: 0, diagnostics: 0, depenses: 0, transactions: 0, declarations: 0, errors: [] as string[] }
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

      // ── TABLEAU LOYERS IMAGE (photo d'un tableau Excel perso) ──
      else if (a.type_document === 'tableau_loyers' || (doc.isImage && a.biens?.length > 0 && a.type_document !== 'ifi')) {
        for (const bien of (a.biens ?? [])) {
          if (!bien.nom && !bien.adresse) continue
          const nomBien = bien.nom || bien.adresse || 'Bien importé'
          const propId = await getOrCreate(nomBien, {
            address: bien.adresse || '',
            city: '',
            type: bien.type || 'nu',
            surface_m2: parseNum(bien.surface_m2) || null,
          })
          if (!propId) continue

          // Créer le bail si locataire présent
          if (bien.locataire && parseNum(bien.loyer_mensuel) > 0) {
            let leaseId: string | null = null
            const { data: ex } = await supabase.from('leases').select('id').eq('property_id', propId).eq('tenant_name', bien.locataire).single()
            if (ex) {
              leaseId = ex.id
            } else {
              const { data: nl } = await supabase.from('leases').insert({
                property_id: propId,
                tenant_name: bien.locataire,
                monthly_rent: parseNum(bien.loyer_mensuel),
                monthly_charges: parseNum(bien.charges_mensuelles) || 0,
                deposit: parseNum(bien.depot_garantie) || null,
                start_date: parseDate(bien.date_entree) || new Date().toISOString().split('T')[0],
                is_active: true,
                irl_index: parseNum(bien.indice_irl) || null,
              }).select('id').single()
              leaseId = nl?.id ?? null
              if (nl) results.baux++
            }

            // Créer les paiements mensuels si disponibles
            if (leaseId && bien.paiements_mensuels?.length > 0) {
              const annee = Number(a.annee) || new Date().getFullYear()
              const moisMap: Record<string, number> = { janvier:1,fevrier:2,mars:3,avril:4,mai:5,juin:6,juillet:7,aout:8,septembre:9,octobre:10,novembre:11,decembre:12 }
              const payments = bien.paiements_mensuels
                .filter((p: any) => p.loyer && parseNum(p.loyer) > 0)
                .map((p: any) => ({
                  lease_id: leaseId,
                  amount: parseNum(p.loyer),
                  due_date: `${annee}-${String(moisMap[p.mois?.toLowerCase()] || 1).padStart(2,'0')}-01`,
                  paid_date: `${annee}-${String(moisMap[p.mois?.toLowerCase()] || 1).padStart(2,'0')}-05`,
                  status: 'paid',
                  notes: p.notes || `Historique ${annee}`,
                }))
              if (payments.length > 0) {
                const { error } = await supabase.from('payments').insert(payments)
                if (!error) results.loyers += payments.length
              }
            } else if (leaseId && parseNum(bien.loyers_annuel_total) > 0) {
              // Sinon créer 12 paiements mensuels depuis le total annuel
              const annee = Number(a.annee) || new Date().getFullYear()
              const mensuel = Math.round(parseNum(bien.loyers_annuel_total) / 12)
              const payments = Array.from({ length: 12 }, (_, i) => ({
                lease_id: leaseId,
                amount: mensuel,
                due_date: `${annee}-${String(i + 1).padStart(2,'0')}-01`,
                paid_date: `${annee}-${String(i + 1).padStart(2,'0')}-05`,
                status: 'paid',
                notes: `Historique ${annee}`,
              }))
              const { error } = await supabase.from('payments').insert(payments)
              if (!error) results.loyers += 12
            }
          }

          // Créer les dépenses si présentes
          if (bien.depenses?.length > 0) {
            for (const dep of bien.depenses) {
              if (!parseNum(dep.montant)) continue
              const annee = Number(a.annee) || new Date().getFullYear()
              await supabase.from('expenses').insert({
                property_id: propId,
                amount: parseNum(dep.montant),
                date: parseDate(dep.date) || `${annee}-06-15`,
                category: dep.categorie || 'charges',
                description: dep.description || dep.categorie || 'Dépense importée',
                deductible: true,
              })
              results.depenses++
            }
          }
        }
      }

      // ── FORMULAIRE IFI ──
      else if (a.type_document === 'ifi') {
        const biens = a.biens ?? []
        for (const bien of biens) {
          if (!bien.adresse && !bien.valeur_declaree) continue
          const nomBien = doc.nom_bien || bien.adresse || 'Bien IFI importé'
          const adresse = bien.adresse || ''
          const ville = bien.ville || ''

          if (bienMap[nomBien]) {
            // Mettre à jour le bien existant avec les infos IFI
            await supabase.from('properties').update({
              address: adresse || undefined,
              city: ville || undefined,
              surface_m2: parseNum(bien.surface_m2) || undefined,
              nb_pieces: parseNum(bien.nb_pieces) || undefined,
              purchase_price: parseNum(bien.prix_acquisition) || undefined,
            }).eq('id', bienMap[nomBien])
          } else {
            const { data, error } = await supabase.from('properties').insert({
              user_id: user.id,
              name: nomBien,
              address: adresse,
              city: ville,
              postal_code: bien.code_postal || '',
              type: bien.type_patrimo || 'nu',
              surface_m2: parseNum(bien.surface_m2) || null,
              nb_pieces: parseNum(bien.nb_pieces) || null,
              purchase_price: parseNum(bien.prix_acquisition) || null,
              purchase_year: bien.date_acquisition ? new Date(parseDate(bien.date_acquisition) || '').getFullYear() || null : null,
              monthly_charges: 0,
              loan_monthly: 0,
              property_tax: 0,
              insurance_annual: 0,
            }).select('id').single()
            if (error) { results.errors.push(`IFI bien "${nomBien}": ${error.message}`); continue }
            bienMap[nomBien] = data.id
            results.biens++
          }
        }
      }

      // ── DÉCLARATION FISCALE ──
      else if (a.type_document === 'declaration_impots') {
        const annee = Number(a.annee_revenus) || new Date().getFullYear() - 1

        const { error } = await supabase.from('declarations_fiscales').insert({
          user_id: user.id,
          annee,
          type: a.type_formulaire || 'autre',
          revenus_fonciers: parseNum(a.revenus_fonciers?.revenus_bruts) || null,
          charges_deductibles: parseNum(a.revenus_fonciers?.charges_deductibles) || null,
          deficit_foncier: parseNum(a.revenus_fonciers?.deficit_foncier) || null,
          revenu_net_global: parseNum(a.impots?.revenu_net_global) || null,
          impots_payes: parseNum(a.impots?.impot_net_paye) || null,
          tmi: parseNum(a.impots?.tmi_pourcent) || null,
          revenu_bic_lmnp: parseNum(a.revenus_lmnp_bic?.revenus_bruts) || null,
          amortissements: parseNum(a.revenus_lmnp_bic?.amortissements) || null,
          resultat_sci: parseNum(a.sci?.resultat) || null,
          donnees_brutes: a,
        })

        if (error) {
          results.errors.push(`Déclaration ${annee}: ${error.message}`)
        } else {
          results.declarations++

          // Créer aussi les dépenses par bien si disponibles
          if (a.biens_declares?.length > 0) {
            for (const bien of a.biens_declares) {
              if (!bien.adresse) continue
              const nomBien = doc.nom_bien || bien.adresse
              const propId = await getOrCreate(nomBien, { address: bien.adresse })
              if (!propId) continue

              if (parseNum(bien.charges) > 0) {
                await supabase.from('expenses').insert({
                  property_id: propId,
                  amount: parseNum(bien.charges),
                  date: `${annee}-12-31`,
                  category: 'charges',
                  description: `Charges déductibles ${annee} (déclaration 2044)`,
                  deductible: true,
                })
                results.depenses++
              }
            }
          }
        }
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
    message: `Import terminé : ${results.biens} biens, ${results.baux} baux, ${results.declarations} déclarations, ${results.diagnostics} diagnostics, ${results.travaux} travaux, ${results.depenses} dépenses, ${results.transactions} transactions`,
  })
}
