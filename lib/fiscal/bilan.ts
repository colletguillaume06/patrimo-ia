// Source unique des calculs fiscaux par bien et par année.
// Utilisée par l'aide à la déclaration, le tableau fiscal, la page fiscalité et les exports,
// afin que TOUS les écrans donnent les mêmes chiffres.
//
// Règles appliquées (revenus fonciers — formulaire 2044, revenus 2025) :
//  211 loyers bruts encaissés (hors provisions de charges)       221 frais d'administration et de gestion
//  222 forfait 20 € par local                                    223 primes d'assurance
//  224 réparations / entretien / amélioration                    227 taxes foncières (hors TEOM récupérée)
//  229 provisions de charges de copropriété payées dans l'année  230 régularisation des provisions déduites N-1
//  240 = 221..229 − 230                                          250 intérêts d'emprunt
//  261 = 215 − 240 − 250                                         420 résultat ; report 2042 : 4BA / 4BB / 4BC
// Déficit foncier : la part due aux intérêts n'est jamais imputable sur le revenu global ;
// le reste l'est dans la limite de 10 700 € (art. 156-I-3° CGI), le surplus est reportable 10 ans sur les revenus fonciers.
// LMNP réel : les amortissements ne peuvent ni créer ni aggraver un déficit (art. 39 C CGI) ; l'excédent est reportable sans limite.
// TEOM refacturée au locataire : non déductible pour le bailleur (BOI-RFPI-BASE-20-50 § 100).

import { moisOccupes } from '@/lib/baux/clauses-fiscales'

export const PLAFOND_DEFICIT_GLOBAL = 10_700

export type Gravite = 'erreur' | 'attention' | 'info'
export interface Alerte { gravite: Gravite; titre: string; detail: string }

export interface BilanBien {
  year: number
  mois: number
  regime: 'foncier' | 'bic' | 'sci_is' | 'autre'
  recettes: {
    loyers: number; provisions: number; airbnb: number; brut: number
    nbPaiements: number; impayes: number; nbImpayes: number
  }
  charges: {
    copro: number; taxeFonciereBrute: number; teomRefacturee: number; taxeFonciere: number
    assurance: number; cfe: number; gestion: number; autres: number
    travauxDeductibles: number; travauxAmortissables: number; travauxNonDeductibles: number
    commissionPlateforme: number; regularisationNMoins1: number
    interets: number; interetsEstimes: boolean; nonDeductibles: number
  }
  amortissements: number
  amortissementsDeductibles: number
  amortissementsReportes: number
  l2044: { l211: number; l215: number; l221: number; l222: number; l223: number; l224: number; l227: number; l229: number; l230: number; l240: number; l250: number; l261: number }
  chargesDeductiblesHorsInterets: number
  chargesDeductibles: number
  resultatAvantAmort: number
  resultat: number
  deficit: { total: number; imputableGlobal: number; reportable: number } | null
  alertes: Alerte[]
}

const num = (v: any) => Number(v) || 0
const r2 = (n: number) => Math.round(n * 100) / 100

/** Mois de détention retenus : jusqu'à aujourd'hui (année en cours) et jusqu'au mois de vente inclus. */
export function moisRetenus(prop: any, year: number, today = new Date()): number {
  let m = year === today.getFullYear() ? today.getMonth() + 1 : year > today.getFullYear() ? 0 : 12
  if (prop.sold_at) {
    const s = new Date(prop.sold_at)
    if (s.getFullYear() < year) return 0
    if (s.getFullYear() === year) m = Math.min(m, s.getMonth() + 1)
  }
  return Math.max(0, m)
}

/** Intérêts annuels estimés d'un prêt à mensualité constante (capital restant dû reconstitué depuis la fin du prêt). */
export function interetsEmprunt(mensualite: number, tauxPct: number | null | undefined, finPret: string | null | undefined, year: number, mois = 12): number | null {
  if (!mensualite || tauxPct == null || !finPret) return null
  const fin = new Date(finPret)
  const n = (fin.getFullYear() - year) * 12 + fin.getMonth() + 1 // mensualités restantes à partir de janvier
  if (n <= 0) return 0
  const r = tauxPct / 100 / 12
  let solde = r === 0 ? mensualite * n : mensualite * (1 - Math.pow(1 + r, -n)) / r
  let interets = 0
  for (let k = 0; k < Math.min(12, mois, n); k++) {
    const i = solde * r
    interets += i
    solde -= mensualite - i
  }
  return r2(interets)
}

/** Catégorie fiscale d'une dépense : les « charges personnalisées » sont reconnues d'après leur libellé. */
export function categorieDepense(e: { category?: string; description?: string | null }): string {
  const c = e.category ?? ''
  if (c !== 'charge_annuelle') return c
  const d = (e.description ?? '').toLowerCase()
  if (/taxes?\s*fonci/.test(d)) return 'taxe'
  if (/assurance|pno|\bgli\b/.test(d)) return 'assurance'
  if (/\bcfe\b|cotisation fonci[eè]re des entreprises/.test(d)) return 'cfe'
  if (/syndic|copro|appel de fonds/.test(d)) return 'copro'
  if (/int[ée]r[eê]ts?.*(pr[eê]t|emprunt)|emprunt/.test(d)) return 'interet'
  return c
}

const CAT_GESTION = ['gestion', 'honoraires', 'frais_gestion', 'comptable', 'frais_bancaires']
const CAT_TRAVAUX_DED = ['entretien_reparation', 'travaux_deductibles']

export function bilanBien(prop: any, year: number, today = new Date()): BilanBien {
  const mois = moisRetenus(prop, year, today)
  const f = mois / 12
  const type = prop.type as string
  const regime: BilanBien['regime'] =
    type === 'lmnp' || type === 'airbnb' ? 'bic'
    : type === 'sci' && prop.sci_regime === 'is' ? 'sci_is'
    : type === 'nu' || type === 'commerce' || type === 'sci' ? 'foncier'
    : 'autre'
  const alertes: Alerte[] = []
  const debutAnnee = new Date(year, 0, 1), finAnnee = new Date(year, 11, 31)
  const cutoff = year === today.getFullYear() ? today : finAnnee

  const baux: any[] = prop.leases ?? []
  const bauxAnnee = baux.filter(l => (!l.start_date || new Date(l.start_date) <= finAnnee) && (!l.end_date || new Date(l.end_date) >= debutAnnee))

  // ── Recettes (loyers « reçus » dont l'échéance tombe dans l'année) ──
  let loyers = 0, provisions = 0, impayes = 0, nbPaiements = 0, nbImpayes = 0
  for (const l of baux) {
    for (const p of l.payments ?? []) {
      const d = new Date(p.due_date)
      if (d.getFullYear() !== year) continue
      const ch = Math.min(num(p.amount), num(l.charges))
      if (p.status === 'paid') { loyers += num(p.amount) - ch; provisions += ch; nbPaiements++ }
      else if (d <= cutoff && (p.status === 'late' || p.status === 'pending' || p.status === 'partial')) { impayes += num(p.amount); nbImpayes++ }
    }
  }
  const airbnb = (prop.airbnb_bookings ?? [])
    .filter((b: any) => new Date(b.check_in).getFullYear() === year && new Date(b.check_in) <= cutoff)
    .reduce((s: number, b: any) => s + num(b.total_revenue), 0)
  const recettes = { loyers: r2(loyers), provisions: r2(provisions), airbnb: r2(airbnb), brut: r2(loyers + provisions + airbnb), nbPaiements, impayes: r2(impayes), nbImpayes }

  // ── Dépenses enregistrées ──
  const exp = (prop.expenses ?? []).filter((e: any) => new Date(e.date).getFullYear() === year && new Date(e.date) <= cutoff).map((e: any) => ({ ...e, category: categorieDepense(e) }))
  const somme = (cats: string[]) => exp.filter((e: any) => cats.includes(e.category) && e.fiscal_deductible !== false).reduce((s: number, e: any) => s + num(e.amount), 0)
  const a = (cats: string[]) => exp.some((e: any) => cats.includes(e.category))
  const nonDeductibles = exp.filter((e: any) => e.fiscal_deductible === false).reduce((s: number, e: any) => s + num(e.amount), 0)
  const estCopro = (e: any) => ['copro', 'syndic'].includes(e.category)
  const connues = ['taxe', 'assurance', 'cfe', 'interet', 'travaux', 'copro', 'syndic', ...CAT_GESTION]
  const autres = exp.filter((e: any) => !connues.includes(e.category) && !estCopro(e) && e.fiscal_deductible !== false).reduce((s: number, e: any) => s + num(e.amount), 0)

  // Taxe foncière, assurance, CFE : montant payé si enregistré, sinon montant de la fiche (au prorata)
  const taxeFonciereBrute = a(['taxe']) ? somme(['taxe']) : num(prop.property_tax) * f
  const assurance = a(['assurance']) ? somme(['assurance']) : num(prop.insurance_annual) * f
  const cfe = type === 'lmnp' || type === 'airbnb' ? (a(['cfe']) ? somme(['cfe']) : num(prop.cfe_annuelle) * f) : 0
  const gestion = somme(CAT_GESTION)
  // Charges de copropriété : appels de fonds réellement saisis (catégorie copro/syndic ou charge personnalisée « syndic/copro »)
  // si présents, sinon provisions mensuelles de la fiche (jamais les deux, pour éviter le double comptage).
  const coproSaisie = exp.filter((e: any) => estCopro(e) && e.fiscal_deductible !== false)
  const copro = coproSaisie.length > 0 ? coproSaisie.reduce((s: number, e: any) => s + num(e.amount), 0) : num(prop.monthly_charges) * mois

  // TEOM / taxe foncière refacturée
  let teom = 0
  let tfClause = false
  for (const l of bauxAnnee) {
    const pd = l.parsed_data ?? {}
    const occ = moisOccupes(l.start_date, l.end_date, year)
    const reel = pd.regularisation_history?.[String(year)]?.lignes
    const teomReel = Array.isArray(reel) && reel.some((x: any) => x?.teom)
      ? reel.filter((x: any) => x?.teom).reduce((s: number, x: any) => s + num(x.montant), 0) : null
    if (pd.teom_refacturee) teom += teomReel ?? num(pd.teom_montant) * occ / 12
    if (type === 'commerce' && pd.taxe_fonciere_refacturee) tfClause = true
  }
  const teomRefacturee = tfClause ? taxeFonciereBrute : Math.min(taxeFonciereBrute, teom)
  const taxeFonciere = Math.max(0, taxeFonciereBrute - teomRefacturee)

  // Travaux (table incidents) : payés dans l'année uniquement
  const incidents: any[] = prop.incidents ?? []
  const dateInc = (i: any) => new Date(i.date_travaux ?? i.created_at)
  const payes = incidents.filter(i => i.est_paye && num(i.cout_paye) > 0 && dateInc(i).getFullYear() === year && dateInc(i) <= cutoff)
  let travauxDeductibles = somme(['travaux']), travauxAmortissables = 0, travauxNonDeductibles = 0
  for (const i of payes) {
    const c = i.categorie_fiscale ?? 'travaux_deductibles'
    const m = num(i.cout_paye)
    if (CAT_TRAVAUX_DED.includes(c)) travauxDeductibles += m
    else if (c === 'amelioration') { if (regime === 'foncier') travauxDeductibles += m; else travauxAmortissables += m }
    else if (c === 'travaux_amortissables') travauxAmortissables += m
    else if (c === 'construction_agrandissement') travauxNonDeductibles += m
  }
  const nbTravauxImpayes = incidents.filter(i => !i.est_paye && num(i.cout_estime) > 0 && dateInc(i).getFullYear() === year).length

  const commissionPlateforme = type === 'airbnb' ? airbnb * (num(prop.airbnb_platform_fees) / 100) : 0

  // Régularisation N-1 des provisions de copropriété (ligne 230, foncier)
  let reg = 0, regManquante = false
  if (regime === 'foncier' && copro > 0) {
    for (const l of baux) {
      const h = l.parsed_data?.regularisation_history?.[String(year - 1)]
      if (h?.lignes) reg += h.lignes.filter((x: any) => !x.teom && !x.tf).reduce((s: number, x: any) => s + num(x.montant), 0)
      else if (l.start_date && new Date(l.start_date) < new Date(year - 1, 11, 31) && (!l.end_date || new Date(l.end_date) >= new Date(year - 1, 0, 1)) && num(l.charges) > 0) regManquante = true
    }
  }

  // Intérêts d'emprunt
  let interets = somme(['interet']), interetsEstimes = false
  if (!a(['interet']) && num(prop.loan_monthly) > 0 && mois > 0) {
    const est = interetsEmprunt(num(prop.loan_monthly), prop.loan_rate, prop.loan_end_date, year, mois)
    if (est == null) {
      alertes.push({ gravite: 'attention', titre: 'Intérêts d\'emprunt non calculables', detail: `Renseignez le taux et la date de fin du prêt de « ${prop.name} » (fiche du bien), ou saisissez les intérêts réels de l'attestation bancaire (dépense de catégorie « interet »). Ils ne sont pas comptés pour l'instant.` })
    } else { interets = est; interetsEstimes = true }
  }

  // Amortissements (BIC / SCI IS) — au prorata l'année de vente
  const amortissements = regime === 'bic' || regime === 'sci_is'
    ? (prop.depreciation_plans ?? []).reduce((t: number, p: any) => {
      const s = new Date(p.start_date).getFullYear()
      return year >= s && year < s + p.duration_years ? t + num(p.annual_amount) : t
    }, 0) * (prop.sold_at && new Date(prop.sold_at).getFullYear() === year ? mois / 12 : 1)
    : 0

  // ── Cumuls & résultat ──
  const l222 = regime === 'foncier' && bauxAnnee.length > 0 ? 20 : 0
  const l221 = gestion + autres
  const l240 = l221 + l222 + assurance + travauxDeductibles + taxeFonciere + copro - reg
  const chargesBic = copro + taxeFonciere + assurance + cfe + gestion + autres + travauxDeductibles + commissionPlateforme
  const chargesHI = regime === 'foncier' ? l240 : chargesBic
  const chargesDeductibles = chargesHI + interets
  const brut = regime === 'foncier' ? recettes.loyers + airbnb : recettes.brut
  const resultatAvantAmort = brut - chargesDeductibles
  const amortDed = regime === 'foncier' ? 0 : Math.min(amortissements, Math.max(0, resultatAvantAmort))
  const resultat = resultatAvantAmort - amortDed

  const l2044 = {
    l211: r2(recettes.loyers), l215: r2(recettes.loyers + airbnb), l221: r2(l221), l222: r2(l222), l223: r2(assurance), l224: r2(travauxDeductibles),
    l227: r2(taxeFonciere), l229: r2(copro), l230: r2(reg), l240: r2(l240), l250: r2(interets), l261: r2(resultatAvantAmort),
  }

  let deficit: BilanBien['deficit'] = null
  if (resultat < 0) {
    const total = -resultat
    if (regime === 'foncier') {
      const defHorsInterets = Math.min(total, Math.max(0, l240 - brut))
      const imputableGlobal = Math.min(defHorsInterets, PLAFOND_DEFICIT_GLOBAL)
      deficit = { total: r2(total), imputableGlobal: r2(imputableGlobal), reportable: r2(total - imputableGlobal) }
    } else deficit = { total: r2(total), imputableGlobal: 0, reportable: r2(total) }
  }

  // ── Points d'attention ──
  if (nbPaiements === 0 && airbnb === 0 && mois > 0) alertes.push({ gravite: 'attention', titre: 'Aucun loyer encaissé enregistré', detail: `Aucun paiement « reçu » en ${year} : les recettes déclarées sont nulles. Vérifiez la page Loyers.` })
  if (nbImpayes > 0) alertes.push({ gravite: 'info', titre: `${nbImpayes} loyer(s) échu(s) non encaissé(s) — ${r2(impayes)} €`, detail: 'Les loyers impayés ne sont pas imposables tant qu\'ils ne sont pas encaissés : ils ne sont pas inclus.' })
  if (!a(['taxe']) && num(prop.property_tax) === 0 && mois > 0) alertes.push({ gravite: 'attention', titre: 'Taxe foncière non renseignée', detail: 'Ajoutez-la sur la fiche du bien ou dans « Charges annuelles » : charge déductible importante (hors TEOM récupérée).' })
  if (regManquante) alertes.push({ gravite: 'attention', titre: `Régularisation des charges ${year - 1} non saisie`, detail: `Ligne 230 : les provisions de copropriété déduites en ${year - 1} se régularisent avec les charges réelles récupérables. Saisissez la régularisation ${year - 1} (Baux → Régularisation) : sinon la ligne 230 reste à 0.` })
  if (teomRefacturee > 0) alertes.push({ gravite: 'info', titre: `TEOM refacturée : ${r2(teomRefacturee)} € exclue de la taxe foncière déduite`, detail: 'Supportée par le locataire, elle n\'est pas déductible (BOI-RFPI-BASE-20-50 § 100).' })
  if (interetsEstimes) alertes.push({ gravite: 'info', titre: `Intérêts d'emprunt estimés : ${r2(interets)} €`, detail: 'Calculés d\'après mensualité, taux et date de fin du prêt. Remplacez par le montant exact de l\'attestation bancaire (dépense « interet »).' })
  if (travauxNonDeductibles > 0) alertes.push({ gravite: 'attention', titre: `Construction/agrandissement : ${r2(travauxNonDeductibles)} € non déduits`, detail: 'Non déductibles du revenu : ils s\'ajoutent au prix de revient (plus-value).' })
  if (travauxAmortissables > 0 && regime !== 'foncier') alertes.push({ gravite: 'info', titre: `Travaux à amortir : ${r2(travauxAmortissables)} €`, detail: 'Non déduits d\'un coup : à intégrer à un plan d\'amortissement.' })
  if (nbTravauxImpayes > 0) alertes.push({ gravite: 'info', titre: `${nbTravauxImpayes} travaux non marqués « payés »`, detail: 'Seules les dépenses payées dans l\'année sont déduites.' })
  if (nonDeductibles > 0) alertes.push({ gravite: 'info', titre: `${r2(nonDeductibles)} € de dépenses marquées non déductibles`, detail: 'Exclues du calcul.' })
  if (regime === 'bic' && amortissements === 0 && prop.lmnp_regime === 'reel') alertes.push({ gravite: 'attention', titre: 'Aucun amortissement en réel', detail: 'L\'amortissement du bien et du mobilier est le principal avantage du LMNP réel : créez un plan d\'amortissement.' })
  if (amortissements - amortDed > 0.5) alertes.push({ gravite: 'info', titre: `Amortissements reportés : ${r2(amortissements - amortDed)} €`, detail: 'Ils ne peuvent pas créer de déficit : l\'excédent est reporté sans limite de durée (à tracer en 2033-B).' })
  if (deficit && regime === 'foncier') alertes.push({ gravite: 'info', titre: `Déficit foncier : ${deficit.total} €`, detail: `Imputable sur le revenu global : ${deficit.imputableGlobal} € (plafond ${PLAFOND_DEFICIT_GLOBAL} €, hors part due aux intérêts). Reportable 10 ans sur les revenus fonciers : ${deficit.reportable} €. Maintien en location 3 ans exigé.` })
  if (prop.sold_at && new Date(prop.sold_at).getFullYear() === year) alertes.push({ gravite: 'attention', titre: 'Bien vendu cette année', detail: 'Revenus et charges arrêtés à la date de vente. Plus-value : déclaration 2048-IM (établie par le notaire) ; ligne 460 de la 2044 pour la cessation.' })
  if (type === 'lmnp' && cfe === 0 && mois > 0) alertes.push({ gravite: 'info', titre: 'CFE non renseignée', detail: 'La CFE est déductible en LMNP. Renseignez-la dans « Charges annuelles » (exonération possible la 1re année et sous 5 000 € de recettes).' })

  return {
    year, mois, regime, recettes,
    charges: {
      copro: r2(copro), taxeFonciereBrute: r2(taxeFonciereBrute), teomRefacturee: r2(teomRefacturee), taxeFonciere: r2(taxeFonciere), assurance: r2(assurance), cfe: r2(cfe),
      gestion: r2(gestion), autres: r2(autres), travauxDeductibles: r2(travauxDeductibles), travauxAmortissables: r2(travauxAmortissables), travauxNonDeductibles: r2(travauxNonDeductibles),
      commissionPlateforme: r2(commissionPlateforme), regularisationNMoins1: r2(reg), interets: r2(interets), interetsEstimes, nonDeductibles: r2(nonDeductibles),
    },
    amortissements: r2(amortissements), amortissementsDeductibles: r2(amortDed), amortissementsReportes: r2(amortissements - amortDed),
    l2044, chargesDeductiblesHorsInterets: r2(chargesHI), chargesDeductibles: r2(chargesDeductibles),
    resultatAvantAmort: r2(resultatAvantAmort), resultat: r2(resultat), deficit, alertes,
  }
}
