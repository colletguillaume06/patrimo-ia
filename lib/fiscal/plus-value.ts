import { differenceInYears } from 'date-fns'

export interface PlusValueParams {
  prix_achat: number
  frais_acquisition: number       // montant réel ou 7.5% forfait
  travaux_non_deductibles: number // construction/agrandissement
  prix_vente: number
  date_acquisition: Date
  date_vente: Date
  type_bien: 'nu' | 'lmnp' | 'sci' | 'airbnb' | 'commerce'
  amortissements_pris?: number    // LMNP uniquement — reprise
}

export interface PlusValueResult {
  prix_revient: number
  pv_brute: number
  annees_detention: number
  // Abattements IR
  abattement_ir_pct: number
  pv_imposable_ir: number
  impot_ir: number
  exonere_ir: boolean
  // Abattements PS
  abattement_ps_pct: number
  pv_imposable_ps: number
  impot_ps: number
  exonere_ps: boolean
  // Total
  impot_total: number
  net_vendeur: number
  // LMNP spécifique
  reprise_amortissements: number
  note_lmnp?: string
}

function abattementIR(annees: number): number {
  if (annees < 6) return 0
  if (annees <= 21) return (annees - 5) * 6
  if (annees === 22) return (16 * 6) + 4
  return 100
}

function abattementPS(annees: number): number {
  if (annees < 6) return 0
  if (annees <= 11) return (annees - 5) * 1.65
  if (annees === 12) return (6 * 1.65) + 1.6
  if (annees <= 30) return (6 * 1.65) + 1.6 + ((annees - 12) * 9)
  return 100
}

export function calculatePlusValue(params: PlusValueParams): PlusValueResult {
  const {
    prix_achat, frais_acquisition, travaux_non_deductibles,
    prix_vente, date_acquisition, date_vente, type_bien,
    amortissements_pris = 0,
  } = params

  const prix_revient = prix_achat + frais_acquisition + travaux_non_deductibles
  let pv_brute = prix_vente - prix_revient

  // LMNP : reprise des amortissements (art. 151 septies B du CGI ne s'applique pas pour non-pros)
  // Pour LMNP non professionnel : pas de reprise amortissements sur la PV
  // Mais les amortissements réduisent le prix de revient comptable
  const reprise_amortissements = type_bien === 'lmnp' ? amortissements_pris : 0
  // En LMNP non pro : la PV est calculée sans tenir compte des amortissements (régime des particuliers)

  const annees = differenceInYears(date_vente, date_acquisition)

  const ab_ir_pct = Math.min(100, abattementIR(annees))
  const ab_ps_pct = Math.min(100, abattementPS(annees))

  const exonere_ir = ab_ir_pct >= 100
  const exonere_ps = ab_ps_pct >= 100

  const pv_imposable_ir = exonere_ir ? 0 : Math.max(0, pv_brute * (1 - ab_ir_pct / 100))
  const pv_imposable_ps = exonere_ps ? 0 : Math.max(0, pv_brute * (1 - ab_ps_pct / 100))

  const impot_ir = Math.round(pv_imposable_ir * 0.19)
  const impot_ps = Math.round(pv_imposable_ps * 0.172)
  const impot_total = impot_ir + impot_ps

  return {
    prix_revient,
    pv_brute: Math.round(pv_brute),
    annees_detention: annees,
    abattement_ir_pct: Math.round(ab_ir_pct * 10) / 10,
    pv_imposable_ir: Math.round(pv_imposable_ir),
    impot_ir,
    exonere_ir,
    abattement_ps_pct: Math.round(ab_ps_pct * 10) / 10,
    pv_imposable_ps: Math.round(pv_imposable_ps),
    impot_ps,
    exonere_ps,
    impot_total,
    net_vendeur: Math.round(prix_vente - impot_total),
    reprise_amortissements,
    note_lmnp: type_bien === 'lmnp' && amortissements_pris > 0
      ? `En LMNP non professionnel, la plus-value est calculée comme pour un particulier (régime des PV immobilières). Les amortissements (${amortissements_pris.toLocaleString('fr-FR')}€) n'augmentent pas la PV imposable.`
      : undefined,
  }
}

export const PALIERS_ABATTEMENT = [
  { annee: 5, ir: 0, ps: 0, label: 'Avant 6 ans' },
  { annee: 6, ir: 6, ps: 1.65, label: '6 ans' },
  { annee: 10, ir: 30, ps: 8.25, label: '10 ans' },
  { annee: 15, ir: 60, ps: 16.5, label: '15 ans' },
  { annee: 20, ir: 90, ps: 27, label: '20 ans' },
  { annee: 22, ir: 100, ps: 41.8, label: '22 ans (exo IR)' },
  { annee: 30, ir: 100, ps: 100, label: '30 ans (exo totale)' },
]
