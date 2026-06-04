import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { year } = await req.json()
  const annee = year || new Date().getFullYear() - 1
  const service = await createServiceClient()

  // Récupérer toutes les données
  const [propsRes, profileRes] = await Promise.all([
    service.from('properties')
      .select(`
        id, name, type, address, city, purchase_price, property_tax, insurance_annual,
        monthly_charges, loan_monthly, numero_fiscal,
        leases(
          tenant_name, monthly_rent, charges, start_date, is_active,
          payments(id, amount, status, due_date, paid_date)
        ),
        expenses(id, amount, date, category, description, deductible)
      `)
      .eq('user_id', user.id),
    service.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  const properties = propsRes.data ?? []
  const ownerName = profileRes.data?.full_name ?? 'Propriétaire'

  // Calculer les données par bien pour l'année
  const biens = properties.map(prop => {
    const leases = prop.leases ?? []
    const activeLease = leases.find((l: any) => l.is_active)
    const allPayments = leases.flatMap((l: any) => (l.payments ?? []))

    const loyersAnnee = allPayments
      .filter((p: any) => p.status === 'paid' && new Date(p.due_date).getFullYear() === annee)
      .reduce((s: number, p: any) => s + p.amount, 0)

    const chargesAnnee = (prop.expenses ?? [])
      .filter((e: any) => new Date(e.date).getFullYear() === annee && e.deductible)
      .reduce((s: number, e: any) => s + e.amount, 0)

    const chargesFixes = (prop.monthly_charges + prop.loan_monthly) * 12 +
      prop.property_tax + prop.insurance_annual

    return {
      ...prop,
      activeLease,
      loyersAnnee,
      chargesDeductibles: chargesAnnee + chargesFixes,
      resultatNet: loyersAnnee - chargesAnnee - chargesFixes,
      depenses: (prop.expenses ?? []).filter((e: any) => new Date(e.date).getFullYear() === annee),
    }
  })

  const totalLoyers = biens.reduce((s, b) => s + b.loyersAnnee, 0)
  const totalCharges = biens.reduce((s, b) => s + b.chargesDeductibles, 0)
  const resultatGlobal = totalLoyers - totalCharges

  // Générer le HTML du dossier
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.4; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm 20mm; }
  .header { border-bottom: 3px solid #1D4ED8; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #1D4ED8; font-weight: bold; }
  .header .sub { color: #475569; font-size: 12px; margin-top: 4px; }
  .synthese { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .kpi { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi .val { font-size: 18px; font-weight: bold; color: #1D4ED8; }
  .kpi .lbl { font-size: 10px; color: #64748B; margin-top: 2px; }
  .kpi.red .val { color: #DC2626; }
  .kpi.green .val { color: #059669; }
  h2 { font-size: 13px; font-weight: bold; color: #1D4ED8; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin: 20px 0 10px; }
  h3 { font-size: 12px; font-weight: bold; color: #0F172A; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1D4ED8; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #F1F5F9; font-size: 10px; }
  tr:nth-child(even) td { background: #F8FAFC; }
  .total-row td { font-weight: bold; background: #EFF6FF !important; border-top: 2px solid #1D4ED8; }
  .green { color: #059669; }
  .red { color: #DC2626; }
  .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
  .tag-lmnp { background: #EFF6FF; color: #1D4ED8; }
  .tag-nu { background: #F0FDF4; color: #166534; }
  .tag-sci { background: #F5F3FF; color: #5B21B6; }
  .tag-airbnb { background: #FFF7ED; color: #9A3412; }
  .tag-commerce { background: #F5F3FF; color: #5B21B6; }
  .footer { margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 10px; text-align: center; color: #94A3B8; font-size: 9px; }
  @media print { .page { padding: 10mm 15mm; } }
</style>
</head>
<body>
<div class="page">

<div class="header">
  <h1>📊 Dossier Comptable ${annee}</h1>
  <div class="sub">${ownerName} · Généré le ${new Date().toLocaleDateString('fr-FR')} · Patrimo IA</div>
</div>

<h2>Synthèse annuelle ${annee}</h2>
<div class="synthese">
  <div class="kpi green"><div class="val">${totalLoyers.toLocaleString('fr-FR')} €</div><div class="lbl">Loyers encaissés</div></div>
  <div class="kpi red"><div class="val">${totalCharges.toLocaleString('fr-FR')} €</div><div class="lbl">Charges déductibles</div></div>
  <div class="kpi ${resultatGlobal >= 0 ? 'green' : 'red'}"><div class="val">${resultatGlobal.toLocaleString('fr-FR')} €</div><div class="lbl">Résultat net</div></div>
</div>

<h2>Détail par bien</h2>
<table>
  <thead>
    <tr>
      <th>Bien</th><th>Type</th><th>Locataire</th><th>Loyers ${annee}</th><th>Charges</th><th>Résultat</th>
    </tr>
  </thead>
  <tbody>
    ${biens.map(b => `
    <tr>
      <td><strong>${b.name}</strong>${b.address ? `<br><span style="color:#94A3B8;font-size:9px">${b.address}, ${b.city || ''}</span>` : ''}</td>
      <td><span class="tag tag-${b.type}">${b.type.toUpperCase()}</span></td>
      <td>${b.activeLease?.tenant_name || '—'}</td>
      <td class="green"><strong>${b.loyersAnnee.toLocaleString('fr-FR')} €</strong></td>
      <td class="red">${b.chargesDeductibles.toLocaleString('fr-FR')} €</td>
      <td class="${b.resultatNet >= 0 ? 'green' : 'red'}"><strong>${b.resultatNet.toLocaleString('fr-FR')} €</strong></td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="3"><strong>TOTAL ${annee}</strong></td>
      <td class="green"><strong>${totalLoyers.toLocaleString('fr-FR')} €</strong></td>
      <td class="red"><strong>${totalCharges.toLocaleString('fr-FR')} €</strong></td>
      <td class="${resultatGlobal >= 0 ? 'green' : 'red'}"><strong>${resultatGlobal.toLocaleString('fr-FR')} €</strong></td>
    </tr>
  </tbody>
</table>

${biens.filter(b => b.depenses.length > 0).map(b => `
<h3>${b.name} — Détail des charges ${annee}</h3>
<table>
  <thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th><th>Déductible</th></tr></thead>
  <tbody>
    ${b.depenses.map((d: any) => `
    <tr>
      <td>${new Date(d.date).toLocaleDateString('fr-FR')}</td>
      <td>${d.description || '—'}</td>
      <td>${d.category}</td>
      <td class="red">${d.amount.toLocaleString('fr-FR')} €</td>
      <td>${d.deductible ? '✓' : '✗'}</td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="3"><strong>Total charges ${b.name}</strong></td>
      <td class="red"><strong>${b.depenses.reduce((s: number, d: any) => s + d.amount, 0).toLocaleString('fr-FR')} €</strong></td>
      <td></td>
    </tr>
  </tbody>
</table>`).join('')}

<div style="margin-top:20px; padding:12px; background:#FFFBEB; border:1px solid #FCD34D; border-radius:8px;">
  <strong>⚠️ Note importante</strong><br>
  Ce document est un récapitulatif indicatif généré par Patrimo IA. Il ne constitue pas un bilan comptable officiel.
  Faites vérifier votre déclaration par un expert-comptable avant dépôt.
</div>

<div class="footer">
  Patrimo IA · Dossier comptable ${annee} · ${ownerName} · Document généré le ${new Date().toLocaleDateString('fr-FR')}
</div>
</div>
</body>
</html>`

  // Retourner le HTML pour impression/PDF côté client
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
