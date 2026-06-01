import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const wb = XLSX.utils.book_new()

  // ── Onglet 1 : MODE D'EMPLOI ──
  const modeEmploi = [
    ['PATRIMO IA — Import historique'],
    [''],
    ['Comment utiliser ce fichier :'],
    ['1. Remplissez l\'onglet "Biens" avec vos biens immobiliers'],
    ['2. Remplissez l\'onglet "Loyers" avec vos loyers encaissés par an'],
    ['3. Remplissez l\'onglet "Dépenses" avec vos charges et travaux par an'],
    ['4. Importez ce fichier dans Patrimo IA → Historique → Importer'],
    [''],
    ['Notes importantes :'],
    ['- Respectez le format des colonnes (ne supprimez pas les en-têtes)'],
    ['- Les montants sont en euros, sans le symbole €'],
    ['- Les années doivent être au format 4 chiffres (ex: 2023)'],
    ['- Le nom du bien doit être identique dans tous les onglets'],
  ]
  const wsModeEmploi = XLSX.utils.aoa_to_sheet(modeEmploi)
  wsModeEmploi['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsModeEmploi, 'Mode d\'emploi')

  // ── Onglet 2 : BIENS ──
  const biensData = [
    ['Nom du bien', 'Adresse', 'Ville', 'Type', 'Surface (m²)', 'Prix d\'achat (€)', 'Année d\'achat', 'Loyer mensuel actuel HC (€)', 'Charges mensuelles (€)'],
    ['Appartement Lyon 3', '12 rue de la Paix', 'Lyon', 'lmnp', 65, 180000, 2019, 850, 120],
    ['Maison Bordeaux', '5 allée des Roses', 'Bordeaux', 'nu', 95, 250000, 2021, 1200, 200],
    ['', '', '', '', '', '', '', '', ''],
    ['Types disponibles : lmnp | nu | sci | airbnb | commerce', '', '', '', '', '', '', '', ''],
  ]
  const wsBiens = XLSX.utils.aoa_to_sheet(biensData)
  wsBiens['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsBiens, 'Biens')

  // ── Onglet 3 : LOYERS ──
  const loyersData = [
    ['Nom du bien', 'Année', 'Loyers encaissés (€)', 'Mois non loués', 'Nom du locataire', 'Notes'],
    ['Appartement Lyon 3', 2022, 9800, 1, 'Martin Sophie', 'Vacant août'],
    ['Appartement Lyon 3', 2023, 10200, 0, 'Martin Sophie', ''],
    ['Appartement Lyon 3', 2024, 10400, 0, 'Martin Sophie', ''],
    ['Maison Bordeaux', 2022, 13200, 0, 'Dupont Jean', ''],
    ['Maison Bordeaux', 2023, 13800, 0, 'Dupont Jean', ''],
    ['Maison Bordeaux', 2024, 14400, 0, 'Dupont Jean', ''],
  ]
  const wsLoyers = XLSX.utils.aoa_to_sheet(loyersData)
  wsLoyers['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsLoyers, 'Loyers')

  // ── Onglet 4 : DÉPENSES ──
  const depensesData = [
    ['Nom du bien', 'Année', 'Catégorie', 'Description', 'Montant (€)'],
    ['Appartement Lyon 3', 2022, 'charges', 'Charges copropriété', 1440],
    ['Appartement Lyon 3', 2022, 'travaux_deductibles', 'Peinture salon', 2500],
    ['Appartement Lyon 3', 2023, 'charges', 'Charges copropriété', 1440],
    ['Appartement Lyon 3', 2023, 'assurance', 'Assurance PNO', 380],
    ['Appartement Lyon 3', 2024, 'charges', 'Charges copropriété', 1500],
    ['Maison Bordeaux', 2022, 'charges', 'Taxe foncière', 1200],
    ['Maison Bordeaux', 2023, 'travaux_deductibles', 'Chaudière neuve', 4500],
    ['Maison Bordeaux', 2024, 'charges', 'Taxe foncière', 1250],
    ['', '', '', '', ''],
    ['Catégories : charges | travaux_deductibles | travaux_amortissables | assurance | gestion | taxe_fonciere | autre', '', '', '', ''],
  ]
  const wsDepenses = XLSX.utils.aoa_to_sheet(depensesData)
  wsDepenses['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 25 }, { wch: 30 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsDepenses, 'Dépenses')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="patrimo-ia-import-historique.xlsx"',
    },
  })
}
