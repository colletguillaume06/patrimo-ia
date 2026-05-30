import { addMonths, getYear } from 'date-fns'

export interface EcheancePret {
  numero: number
  date: Date
  mensualite: number
  capital_amorti: number
  interets: number
  assurance: number
  capital_restant: number
  total_paye: number
}

export interface PretParams {
  capital: number
  taux_annuel: number      // en % : ex 3.5 pour 3,5%
  duree_mois: number
  date_debut: Date
  assurance_mensuelle?: number
}

export function calculerMensualite(capital: number, taux_annuel: number, duree_mois: number): number {
  if (taux_annuel === 0) return capital / duree_mois
  const t = taux_annuel / 100 / 12
  return capital * t / (1 - Math.pow(1 + t, -duree_mois))
}

export function generateTableauAmortissement(params: PretParams): EcheancePret[] {
  const { capital, taux_annuel, duree_mois, date_debut, assurance_mensuelle = 0 } = params
  const mensualite = Math.round(calculerMensualite(capital, taux_annuel, duree_mois) * 100) / 100
  const t = taux_annuel / 100 / 12
  const echeances: EcheancePret[] = []
  let capital_restant = capital
  let total_paye = 0

  for (let i = 1; i <= duree_mois; i++) {
    const interets = Math.round(capital_restant * t * 100) / 100
    const capital_amorti = Math.round((mensualite - interets) * 100) / 100
    capital_restant = Math.round((capital_restant - capital_amorti) * 100) / 100
    if (i === duree_mois) capital_restant = 0
    total_paye = Math.round((total_paye + mensualite + assurance_mensuelle) * 100) / 100

    echeances.push({
      numero: i,
      date: addMonths(date_debut, i - 1),
      mensualite,
      capital_amorti,
      interets,
      assurance: assurance_mensuelle,
      capital_restant: Math.max(0, capital_restant),
      total_paye,
    })
  }

  return echeances
}

/** Somme des intérêts sur une année fiscale (pour déduction) */
export function getInteretsAnnee(echeances: EcheancePret[], annee: number): number {
  return Math.round(
    echeances
      .filter(e => getYear(e.date) === annee)
      .reduce((s, e) => s + e.interets, 0) * 100
  ) / 100
}

/** Capital restant dû à une date donnée */
export function getCapitalRestant(echeances: EcheancePret[], date: Date): number {
  const e = echeances.find(ec => ec.date >= date)
  return e?.capital_restant ?? 0
}

/** KPIs du prêt */
export function getPretKpis(echeances: EcheancePret[]) {
  const now = new Date()
  const echeanceCourante = echeances.find(e => e.date >= now) ?? echeances[echeances.length - 1]
  const totalInterets = echeances.reduce((s, e) => s + e.interets, 0)
  const coutTotal = echeances.reduce((s, e) => s + e.mensualite + e.assurance, 0)
  return {
    mensualite: echeances[0]?.mensualite ?? 0,
    mensualite_avec_assurance: (echeances[0]?.mensualite ?? 0) + (echeances[0]?.assurance ?? 0),
    capital_restant: echeanceCourante?.capital_restant ?? 0,
    total_interets: Math.round(totalInterets),
    cout_total: Math.round(coutTotal),
    date_fin: echeances[echeances.length - 1]?.date ?? null,
    part_interets_ce_mois: echeanceCourante?.interets ?? 0,
    part_capital_ce_mois: echeanceCourante?.capital_amorti ?? 0,
  }
}
