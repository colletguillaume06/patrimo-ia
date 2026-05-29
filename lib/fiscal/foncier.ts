import type { FoncierSimulation } from '@/types'

export function calculateFoncierSimulation(params: {
  revenus_bruts: number
  charges_deductibles: number
  taux_marginal: number
}): FoncierSimulation {
  const { revenus_bruts, charges_deductibles, taux_marginal } = params

  // Micro-foncier : abattement 30%, plafonné à 15 000€ de revenus
  const micro_base = revenus_bruts * 0.70
  const micro_impot = micro_base * taux_marginal

  // Régime réel
  const revenu_net = revenus_bruts - charges_deductibles
  const deficit_foncier = revenu_net < 0 ? Math.abs(revenu_net) : null
  const reel_impot = Math.max(0, revenu_net) * taux_marginal

  return {
    revenus_bruts,
    charges_deductibles,
    revenu_net,
    deficit_foncier,
    micro_impot,
    reel_impot,
    regime_optimal: reel_impot < micro_impot ? 'reel' : 'micro',
    economie: Math.abs(micro_impot - reel_impot),
  }
}
