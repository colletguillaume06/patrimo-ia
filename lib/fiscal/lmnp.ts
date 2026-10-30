import type { DepreciationPlan, LmnpSimulation } from '@/types'

export function calculateLmnpSimulation(params: {
  recettes: number
  charges_reelles: number
  amortissements: number
  taux_marginal: number
}): LmnpSimulation {
  const { recettes, charges_reelles, amortissements, taux_marginal } = params

  // LMNP (BIC non professionnel) : imposé à l'IR (taux_marginal) + prélèvements sociaux (18,6%)
  // LFSS 2026 (art. 12) : CSG sur les revenus du capital relevée de 9,2% à 10,6% au 01/01/2026,
  // rétroactive à l'imposition des revenus 2025. Les revenus de location meublée non professionnelle
  // n'entrent PAS dans l'exception qui maintient 17,2% (contrairement aux revenus fonciers et aux
  // plus-values immobilières) → prélèvements sociaux globaux désormais à 18,6% (9,2%→10,6% de CSG
  // + 0,5% CRDS + 7,5% prélèvement de solidarité).
  const taux_global = taux_marginal + 0.186

  const abattement = 0.50
  const micro_bic_base = recettes * (1 - abattement)
  const micro_bic_impot = micro_bic_base * taux_global

  const resultat_bic = recettes - charges_reelles - amortissements
  const impot_estime = Math.max(0, resultat_bic) * taux_global

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
  gros_oeuvre:    { label: 'Gros œuvre / Structure',       duration: 80, pct: 0.50, color: 'bg-blue-400',   amortissable: true  },
  facade:         { label: 'Façade / Étanchéité',          duration: 30, pct: 0.10, color: 'bg-cyan-400',   amortissable: true  },
  toiture:        { label: 'Toiture',                      duration: 25, pct: 0.05, color: 'bg-indigo-400', amortissable: true  },
  installations:  { label: 'Installations (élec, plomb.)', duration: 20, pct: 0.08, color: 'bg-purple-400', amortissable: true  },
  agencement:     { label: 'Agencements intérieurs',       duration: 12, pct: 0.12, color: 'bg-emerald-400',amortissable: true  },
  mobilier:       { label: 'Mobilier & équipements',       duration: 7,  pct: 0,    color: 'bg-amber-400',  amortissable: true  },
  frais_acq:      { label: 'Frais d\'acquisition',         duration: 40, pct: 0,    color: 'bg-rose-400',   amortissable: true  },
  terrain:        { label: 'Terrain (non amortissable)',   duration: 0,  pct: 0.15, color: 'bg-slate-400',  amortissable: false },
} as const

export type DepreciationComponentKey = keyof typeof DEPRECIATION_COMPONENTS
