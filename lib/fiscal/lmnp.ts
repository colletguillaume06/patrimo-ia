import type { DepreciationPlan, LmnpSimulation } from '@/types'

export function calculateLmnpSimulation(params: {
  recettes: number
  charges_reelles: number
  amortissements: number
  taux_marginal: number
}): LmnpSimulation {
  const { recettes, charges_reelles, amortissements, taux_marginal } = params

  const abattement = 0.50
  const micro_bic_base = recettes * (1 - abattement)
  const micro_bic_impot = micro_bic_base * taux_marginal

  const resultat_bic = recettes - charges_reelles - amortissements
  const impot_estime = Math.max(0, resultat_bic) * taux_marginal

  return {
    recettes,
    charges_reelles,
    amortissements,
    resultat_bic,
    impot_estime,
    regime: impot_estime < micro_bic_impot ? 'reel' : 'micro',
    micro_bic_base,
    micro_bic_impot,
    economie_regime_reel: micro_bic_impot - impot_estime,
  }
}

export function calculateDepreciation(plans: DepreciationPlan[]): number {
  const currentYear = new Date().getFullYear()
  return plans.reduce((total, plan) => {
    const startYear = new Date(plan.start_date).getFullYear()
    const endYear = startYear + plan.duration_years
    if (currentYear >= startYear && currentYear < endYear) {
      return total + plan.annual_amount
    }
    return total
  }, 0)
}

export const DEPRECIATION_COMPONENTS = {
  gros_oeuvre: { label: 'Gros œuvre', duration: 80, pct: 0.55 },
  toiture: { label: 'Toiture', duration: 25, pct: 0.10 },
  agencement: { label: 'Agencements', duration: 15, pct: 0.20 },
  mobilier: { label: 'Mobilier', duration: 10, pct: 0.10 },
  terrain: { label: 'Terrain (non amortissable)', duration: 0, pct: 0.15 },
} as const
