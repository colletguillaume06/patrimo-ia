import { addYears, addMonths, differenceInDays } from 'date-fns'

export type DiagType = 'dpe' | 'amiante' | 'plomb' | 'electricite' | 'gaz' | 'erp' | 'termites' | 'bruit' | 'assainissement'
export type DPELettre = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const DIAG_LABELS: Record<DiagType, string> = {
  dpe: 'DPE (Diagnostic de Performance Énergétique)',
  amiante: 'Diagnostic Amiante',
  plomb: 'CREP (Plomb)',
  electricite: 'Diagnostic Électricité',
  gaz: 'Diagnostic Gaz',
  erp: 'État des Risques et Pollutions (ERP)',
  termites: 'Diagnostic Termites',
  bruit: 'Diagnostic Bruit',
  assainissement: 'Diagnostic Assainissement',
}

export const DIAG_OBLIGATOIRE: Record<DiagType, string[]> = {
  dpe: ['tous'],
  amiante: ['avant 1997'],
  plomb: ['avant 1949'],
  electricite: ['> 15 ans'],
  gaz: ['> 15 ans'],
  erp: ['tous'],
  termites: ['zones à risque'],
  bruit: ['zones A, B, C1, C2'],
  assainissement: ['non raccordé réseau'],
}

/**
 * Calcule la date d'expiration légale selon le type de diagnostic et le résultat.
 */
export function calculerExpiration(type: DiagType, dateRealisation: Date, resultat?: string): Date | null {
  switch (type) {
    case 'dpe': return addYears(dateRealisation, 10)
    case 'amiante': return resultat === 'positif' ? addYears(dateRealisation, 3) : null // illimité si négatif
    case 'plomb': return resultat === 'positif' ? addYears(dateRealisation, 1) : null // illimité si négatif
    case 'electricite': return addYears(dateRealisation, 6)
    case 'gaz': return addYears(dateRealisation, 6)
    case 'erp': return addMonths(dateRealisation, 6)
    case 'termites': return addMonths(dateRealisation, 6)
    case 'bruit': return addMonths(dateRealisation, 6)
    case 'assainissement': return addYears(dateRealisation, 3)
    default: return addYears(dateRealisation, 1)
  }
}

export interface DiagStatut {
  statut: 'valide' | 'alerte' | 'urgent' | 'expire' | 'illimite'
  jours_restants: number | null
  color: string
  bg: string
  label: string
}

export function getStatutDiag(dateExpiration: Date | null): DiagStatut {
  if (!dateExpiration) return { statut: 'illimite', jours_restants: null, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Illimité' }

  const now = new Date()
  const jours = differenceInDays(dateExpiration, now)

  if (jours < 0) return { statut: 'expire', jours_restants: jours, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Expiré' }
  if (jours <= 30) return { statut: 'urgent', jours_restants: jours, color: 'text-red-400', bg: 'bg-red-400/10', label: `Expire J-${jours}` }
  if (jours <= 90) return { statut: 'alerte', jours_restants: jours, color: 'text-amber-400', bg: 'bg-amber-400/10', label: `Expire dans ${Math.round(jours / 30)} mois` }
  return { statut: 'valide', jours_restants: jours, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Valide' }
}

export const DPE_COLORS: Record<DPELettre, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-700', text: 'text-white', label: 'A — Très performant' },
  B: { bg: 'bg-green-500', text: 'text-white', label: 'B — Performant' },
  C: { bg: 'bg-green-400', text: 'text-white', label: 'C — Assez performant' },
  D: { bg: 'bg-yellow-400', text: 'text-black', label: 'D — Assez peu performant' },
  E: { bg: 'bg-orange-400', text: 'text-white', label: 'E — Peu performant' },
  F: { bg: 'bg-red-400', text: 'text-white', label: 'F — Très peu performant' },
  G: { bg: 'bg-red-700', text: 'text-white', label: 'G — Extrêmement peu performant' },
}
