import type { SciSimulation } from '@/types'

export function calculateSciSimulation(params: {
  resultat_comptable: number
  regime: 'is' | 'ir'
  taux_marginal?: number
}): SciSimulation {
  const { resultat_comptable, regime, taux_marginal = 0.30 } = params

  if (regime === 'is') {
    // IS : 15% jusqu'à 42 500€, 25% au-delà
    let is_du = 0
    if (resultat_comptable > 0) {
      const tranche_reduite = Math.min(resultat_comptable, 42500)
      const tranche_normale = Math.max(0, resultat_comptable - 42500)
      is_du = tranche_reduite * 0.15 + tranche_normale * 0.25
    }
    const dividendes_disponibles = Math.max(0, resultat_comptable - is_du)

    return { resultat_comptable, is_du, dividendes_disponibles, regime }
  }

  // IR : transparence fiscale, imposition sur quote-part
  const is_du = resultat_comptable * taux_marginal
  return {
    resultat_comptable,
    is_du,
    dividendes_disponibles: Math.max(0, resultat_comptable - is_du),
    regime,
  }
}
