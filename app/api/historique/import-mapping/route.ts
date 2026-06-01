import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { fileBase64, filename, mapping } = await req.json()

  // Reconstituer le fichier depuis base64
  const buf = Buffer.from(fileBase64, 'base64')
  const wb = XLSX.read(buf, { type: 'buffer' })

  const results = { biens: 0, loyers: 0, depenses: 0, errors: [] as string[] }
  const bienMap: Record<string, string> = {}

  // Récupérer les biens existants
  const { data: existingProps } = await supabase.from('properties').select('id, name').eq('user_id', user.id)
  existingProps?.forEach(p => { bienMap[p.name] = p.id })

  for (const [sheetName, sheetMapping] of Object.entries(mapping) as [string, any][]) {
    if (!sheetMapping.actif) continue
    const ws = wb.Sheets[sheetName]
    if (!ws) continue

    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]

    for (const row of rows) {
      const get = (col: string | null) => col ? (row[col] ?? '') : ''

      if (sheetMapping.type === 'biens') {
        const nom = String(get(sheetMapping.nom_bien)).trim()
        if (!nom || bienMap[nom]) continue

        const { data, error } = await supabase.from('properties').insert({
          user_id: user.id,
          name: nom,
          address: String(get(sheetMapping.adresse)) || '',
          city: '',
          type: String(get(sheetMapping.type_bien)).toLowerCase() || 'nu',
          surface_m2: Number(get(sheetMapping.surface)) || null,
          purchase_price: null,
          monthly_charges: 0,
          loan_monthly: 0,
          property_tax: 0,
          insurance_annual: 0,
        }).select('id').single()

        if (error) { results.errors.push(`Bien "${nom}": ${error.message}`); continue }
        bienMap[nom] = data.id
        results.biens++
      }

      else if (sheetMapping.type === 'loyers') {
        const nom = String(get(sheetMapping.nom_bien)).trim()
        const montantRaw = get(sheetMapping.montant)
        const montant = parseFloat(String(montantRaw).replace(',', '.').replace(/\s/g, ''))
        if (!nom || isNaN(montant) || montant <= 0) continue

        // Créer le bien si inconnu
        if (!bienMap[nom]) {
          const { data } = await supabase.from('properties').insert({
            user_id: user.id, name: nom, address: '', city: '', type: 'nu',
            monthly_charges: 0, loan_monthly: 0, property_tax: 0, insurance_annual: 0,
          }).select('id').single()
          if (data) { bienMap[nom] = data.id; results.biens++ }
        }

        const propId = bienMap[nom]
        if (!propId) continue

        const anneeRaw = get(sheetMapping.annee)
        const dateRaw = get(sheetMapping.date)
        const annee = anneeRaw ? Number(anneeRaw) : (dateRaw ? new Date(dateRaw).getFullYear() : new Date().getFullYear())
        const locataire = String(get(sheetMapping.locataire)) || 'Locataire historique'

        // Bail
        let leaseId: string | null = null
        const { data: ex } = await supabase.from('leases').select('id').eq('property_id', propId).eq('tenant_name', locataire).single()
        if (ex) {
          leaseId = ex.id
        } else {
          const { data: nl } = await supabase.from('leases').insert({
            property_id: propId, tenant_name: locataire,
            monthly_rent: Math.round(montant / 12),
            start_date: `${annee}-01-01`, is_active: false,
          }).select('id').single()
          leaseId = nl?.id ?? null
        }

        if (!leaseId) continue

        // Paiements mensuels
        const mensuel = Math.round(montant / 12)
        const payments = Array.from({ length: 12 }, (_, i) => ({
          lease_id: leaseId,
          amount: mensuel,
          due_date: `${annee}-${String(i + 1).padStart(2, '0')}-01`,
          paid_date: `${annee}-${String(i + 1).padStart(2, '0')}-05`,
          status: 'paid',
          notes: `Historique ${annee}`,
        }))

        const { error } = await supabase.from('payments').insert(payments)
        if (!error) results.loyers += 12
        else results.errors.push(`Loyers "${nom}" ${annee}: ${error.message}`)
      }

      else if (sheetMapping.type === 'depenses') {
        const nom = String(get(sheetMapping.nom_bien)).trim()
        const montantRaw = get(sheetMapping.montant)
        const montant = parseFloat(String(montantRaw).replace(',', '.').replace(/\s/g, ''))
        if (!nom || isNaN(montant) || montant <= 0) continue

        if (!bienMap[nom]) {
          const { data } = await supabase.from('properties').insert({
            user_id: user.id, name: nom, address: '', city: '', type: 'nu',
            monthly_charges: 0, loan_monthly: 0, property_tax: 0, insurance_annual: 0,
          }).select('id').single()
          if (data) { bienMap[nom] = data.id; results.biens++ }
        }

        const propId = bienMap[nom]
        if (!propId) continue

        const anneeRaw = get(sheetMapping.annee)
        const dateRaw = get(sheetMapping.date)
        const annee = anneeRaw ? Number(anneeRaw) : (dateRaw ? new Date(dateRaw).getFullYear() : new Date().getFullYear())
        const description = String(get(sheetMapping.description)) || 'Dépense importée'
        const categorie = String(get(sheetMapping.categorie)) || 'charges'

        const { error } = await supabase.from('expenses').insert({
          property_id: propId,
          amount: montant,
          date: `${annee}-06-15`,
          category: categorie,
          description,
          deductible: true,
        })
        if (!error) results.depenses++
        else results.errors.push(`Dépense "${description}": ${error.message}`)
      }
    }
  }

  return NextResponse.json({ success: true, results, message: `Import terminé : ${results.biens} biens, ${results.loyers} paiements, ${results.depenses} dépenses` })
}
