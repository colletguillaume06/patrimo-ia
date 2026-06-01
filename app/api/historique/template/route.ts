import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const wb = XLSX.utils.book_new()

  // ── Mode d'emploi ──
  const modeEmploi = [
    ['PATRIMO IA — Import historique complet'],
    [''],
    ['Ce fichier permet de pré-remplir TOUTES les sections de Patrimo IA :'],
    ['  ✓ Fiches biens (adresse, surface, prêt, fiscalité, assurance)'],
    ['  ✓ Baux et locataires (loyer, charges, dépôt, IRL, dates)'],
    ['  ✓ Historique des loyers encaissés par année'],
    ['  ✓ Dépenses et charges par année'],
    ['  ✓ Travaux réalisés ou planifiés'],
    ['  ✓ Diagnostics obligatoires (DPE, amiante, plomb...)'],
    [''],
    ['Comment remplir :'],
    ['1. Remplissez chaque onglet avec vos données (remplacez les exemples)'],
    ['2. Laissez vide ce que vous ne connaissez pas — ce n\'est pas bloquant'],
    ['3. Le nom du bien doit être IDENTIQUE dans tous les onglets'],
    ['4. Importez dans Patrimo IA → Historique → Importer'],
    [''],
    ['Formats :'],
    ['- Dates : JJ/MM/AAAA ou AAAA-MM-JJ'],
    ['- Montants : chiffres sans symbole € ni espace (ex: 1200.50)'],
    ['- Types de bien : lmnp | nu | sci | airbnb | commerce'],
  ]
  const wsME = XLSX.utils.aoa_to_sheet(modeEmploi)
  wsME['!cols'] = [{ wch: 70 }]
  XLSX.utils.book_append_sheet(wb, wsME, 'Mode d\'emploi')

  // ── Onglet 1 : BIENS ──
  const biensData = [
    [
      'Nom du bien*', 'Adresse*', 'Ville*', 'Code postal', 'Type*',
      'Surface (m²)', 'Nb pièces', 'Étage', 'Prix achat (€)', 'Année achat',
      'Loyer mensuel HC (€)', 'Charges mensuelles (€)', 'Taxe foncière annuelle (€)',
      'Assurance annuelle (€)', 'DPE (A/B/C/D/E/F/G)',
      'Banque prêt', 'Capital emprunté (€)', 'Taux annuel (%)', 'Durée prêt (mois)',
      'Date 1ère échéance prêt', 'Assurance prêt mensuelle (€)',
      'Syndic (nom)', 'Charges copropriété trimestrielles (€)', 'Tantièmes',
    ],
    [
      'Appartement Lyon 3', '12 rue de la Paix', 'Lyon', '69003', 'lmnp',
      65, 3, 2, 180000, 2019,
      850, 120, 900,
      350, 'C',
      'BNP Paribas', 150000, 2.5, 240,
      '01/10/2019', 45,
      'Foncia', 360, 120,
    ],
    [
      'Maison Bordeaux', '5 allée des Roses', 'Bordeaux', '33000', 'nu',
      95, 4, 0, 250000, 2021,
      1200, 200, 1500,
      420, 'D',
      'Crédit Agricole', 200000, 3.2, 300,
      '01/06/2021', 60,
      '', 0, 0,
    ],
  ]
  const wsBiens = XLSX.utils.aoa_to_sheet(biensData)
  wsBiens['!cols'] = Array(biensData[0].length).fill({ wch: 22 })
  XLSX.utils.book_append_sheet(wb, wsBiens, 'Biens')

  // ── Onglet 2 : BAUX ──
  const bauxData = [
    [
      'Nom du bien*', 'Nom locataire*', 'Prénom locataire', 'Email locataire', 'Téléphone locataire',
      'Loyer mensuel HC (€)*', 'Charges mensuelles (€)', 'Dépôt de garantie (€)',
      'Date début bail*', 'Date fin bail', 'Bail actif (oui/non)',
      'Indice IRL signature', 'Trimestre IRL', 'Garant (nom)',
    ],
    [
      'Appartement Lyon 3', 'Martin', 'Sophie', 'sophie.martin@email.com', '06 12 34 56 78',
      850, 120, 1700,
      '01/09/2022', '', 'oui',
      '147.88', 'T2 2026', '',
    ],
    [
      'Maison Bordeaux', 'Dupont', 'Jean', 'jean.dupont@email.com', '06 98 76 54 32',
      1200, 200, 1200,
      '01/04/2021', '', 'oui',
      '147.88', 'T2 2026', 'Dupont Pierre',
    ],
  ]
  const wsBaux = XLSX.utils.aoa_to_sheet(bauxData)
  wsBaux['!cols'] = Array(bauxData[0].length).fill({ wch: 22 })
  XLSX.utils.book_append_sheet(wb, wsBaux, 'Baux')

  // ── Onglet 3 : LOYERS ──
  const loyersData = [
    ['Nom du bien*', 'Année*', 'Loyers encaissés (€)*', 'Mois non loués', 'Notes'],
    ['Appartement Lyon 3', 2022, 9800, 1, 'Vacant août'],
    ['Appartement Lyon 3', 2023, 10200, 0, ''],
    ['Appartement Lyon 3', 2024, 10400, 0, ''],
    ['Maison Bordeaux', 2022, 13200, 0, ''],
    ['Maison Bordeaux', 2023, 13800, 0, ''],
    ['Maison Bordeaux', 2024, 14400, 0, ''],
  ]
  const wsLoyers = XLSX.utils.aoa_to_sheet(loyersData)
  wsLoyers['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 22 }, { wch: 16 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsLoyers, 'Loyers')

  // ── Onglet 4 : DÉPENSES ──
  const depensesData = [
    ['Nom du bien*', 'Année*', 'Catégorie*', 'Description', 'Montant (€)*', 'Date (optionnel)'],
    ['Appartement Lyon 3', 2022, 'charges', 'Charges copropriété', 1440, ''],
    ['Appartement Lyon 3', 2022, 'travaux_deductibles', 'Peinture salon', 2500, '15/03/2022'],
    ['Appartement Lyon 3', 2023, 'assurance', 'Assurance PNO', 350, ''],
    ['Appartement Lyon 3', 2024, 'taxe_fonciere', 'Taxe foncière 2024', 900, ''],
    ['Maison Bordeaux', 2022, 'charges', 'Taxe foncière', 1200, ''],
    ['Maison Bordeaux', 2023, 'travaux_deductibles', 'Chaudière neuve', 4500, '10/05/2023'],
    ['', '', '', '', '', ''],
    ['Catégories disponibles :', 'charges', 'travaux_deductibles', 'travaux_amortissables', 'assurance', ''],
    ['', 'gestion', 'taxe_fonciere', 'comptabilite', 'divers', ''],
  ]
  const wsDepenses = XLSX.utils.aoa_to_sheet(depensesData)
  wsDepenses['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 25 }, { wch: 30 }, { wch: 14 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsDepenses, 'Dépenses')

  // ── Onglet 5 : TRAVAUX ──
  const travauxData = [
    [
      'Nom du bien*', 'Titre*', 'Description', 'Date travaux', 'Date fin (optionnel)',
      'Montant estimé (€)', 'Montant payé (€)', 'Entreprise', 'Statut',
      'Catégorie fiscale',
    ],
    [
      'Appartement Lyon 3', 'Rénovation salle de bain', 'Remplacement baignoire + faïence', '10/03/2023', '25/03/2023',
      4500, 4200, 'Plomberie Martin', 'termine',
      'deductible',
    ],
    [
      'Appartement Lyon 3', 'Peinture chambres', 'Deux chambres repeintes en blanc', '01/07/2024', '03/07/2024',
      1200, 1200, 'Artisan Dubois', 'termine',
      'deductible',
    ],
    [
      'Maison Bordeaux', 'Chaudière gaz', 'Remplacement chaudière ancienne', '15/05/2023', '15/05/2023',
      4500, 4500, 'Chauffage Pro', 'termine',
      'deductible',
    ],
    [
      'Maison Bordeaux', 'Toiture à refaire', 'Devis en cours', '01/09/2025', '',
      12000, 0, '', 'planifie',
      'amortissable',
    ],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Statuts :', 'planifie', 'en_cours', 'termine', '', '', '', '', '', ''],
    ['Catégories fiscales :', 'deductible', 'amortissable', 'non_deductible', '', '', '', '', '', ''],
  ]
  const wsTravaux = XLSX.utils.aoa_to_sheet(travauxData)
  wsTravaux['!cols'] = Array(travauxData[0].length).fill({ wch: 22 })
  XLSX.utils.book_append_sheet(wb, wsTravaux, 'Travaux')

  // ── Onglet 6 : DIAGNOSTICS ──
  const diagData = [
    ['Nom du bien*', 'Type*', 'Résultat / Classe', 'Date réalisation*', 'Date expiration', 'Cabinet'],
    ['Appartement Lyon 3', 'dpe', 'C', '15/06/2022', '15/06/2032', 'Diagexpert Lyon'],
    ['Appartement Lyon 3', 'amiante', 'négatif', '15/06/2022', '', 'Diagexpert Lyon'],
    ['Appartement Lyon 3', 'plomb', 'négatif', '15/06/2022', '', 'Diagexpert Lyon'],
    ['Appartement Lyon 3', 'electricite', 'conforme', '15/06/2022', '15/06/2025', 'Diagexpert Lyon'],
    ['Maison Bordeaux', 'dpe', 'D', '10/03/2021', '10/03/2031', 'Diag Sud-Ouest'],
    ['Maison Bordeaux', 'gaz', 'conforme', '10/03/2021', '10/03/2024', 'Diag Sud-Ouest'],
    ['', '', '', '', '', ''],
    ['Types :', 'dpe', 'amiante', 'plomb', 'electricite', 'gaz'],
    ['', 'erp', 'termites', 'bruit', 'assainissement', ''],
  ]
  const wsDiag = XLSX.utils.aoa_to_sheet(diagData)
  wsDiag['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsDiag, 'Diagnostics')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="patrimo-ia-import-complet.xlsx"',
    },
  })
}
