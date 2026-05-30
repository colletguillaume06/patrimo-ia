import { addMonths, subMonths, differenceInDays, differenceInMonths } from 'date-fns'

export interface Lease {
  id: string
  end_date: string | null
  start_date: string
  notice_months: number | null
  etat_lieux_sortie_date: string | null
  depot_garantie_restitue_le: string | null
  deposit: number
  type?: string
}

/** Date limite pour donner congé (préavis légal avant fin bail) */
export function getDateLimiteCongé(lease: Lease): Date | null {
  if (!lease.end_date) return null
  const mois = lease.notice_months ?? 3
  return subMonths(new Date(lease.end_date), mois)
}

/** Statut de reconduction tacite */
export function getStatutReconduction(lease: Lease): {
  statut: 'ok' | 'alerte' | 'urgent' | 'reconduit'
  jours_restants: number
  message: string
} {
  const dateLimite = getDateLimiteCongé(lease)
  if (!dateLimite) return { statut: 'ok', jours_restants: 999, message: 'Bail sans date de fin' }

  const now = new Date()
  const jours = differenceInDays(dateLimite, now)

  if (jours < 0) return { statut: 'reconduit', jours_restants: jours, message: 'Délai de congé dépassé — bail reconduit tacitement' }
  if (jours <= 30) return { statut: 'urgent', jours_restants: jours, message: `URGENT — dernière chance de donner congé (J-${jours})` }
  if (jours <= 90) return { statut: 'alerte', jours_restants: jours, message: `Souhaitez-vous donner congé ? (J-${jours} avant date limite)` }
  return { statut: 'ok', jours_restants: jours, message: 'Bail en cours' }
}

/** Date limite légale de restitution du DG */
export function getDateLimiteRestitutionDG(etatDesLieuxDate: Date, avecReserves: boolean): Date {
  return avecReserves ? addMonths(etatDesLieuxDate, 2) : addMonths(etatDesLieuxDate, 1)
}

/** Statut DG */
export function getStatutDepotGarantie(lease: Lease): {
  statut: 'non_renseigne' | 'a_restituer' | 'urgent' | 'depasse' | 'restitue'
  message: string
  date_limite?: Date
} {
  if (lease.depot_garantie_restitue_le) return { statut: 'restitue', message: 'DG restitué' }
  if (!lease.etat_lieux_sortie_date) return { statut: 'non_renseigne', message: 'Pas de sortie enregistrée' }

  const sortie = new Date(lease.etat_lieux_sortie_date)
  const dateLimite = addMonths(sortie, 2) // 2 mois par défaut (avec réserves)
  const now = new Date()
  const jours = differenceInDays(dateLimite, now)

  if (jours < 0) return { statut: 'depasse', message: 'DG non restitué — majoration 10%/mois applicable', date_limite: dateLimite }
  if (jours <= 7) return { statut: 'urgent', message: `DG à restituer dans ${jours} jours`, date_limite: dateLimite }
  return { statut: 'a_restituer', message: `DG à restituer avant le ${dateLimite.toLocaleDateString('fr-FR')}`, date_limite: dateLimite }
}

/** Assurance locataire statut */
export function getStatutAssurance(expiration: string | null): 'valide' | 'expire_bientot' | 'expiree' | 'manquante' {
  if (!expiration) return 'manquante'
  const exp = new Date(expiration)
  const now = new Date()
  const jours = differenceInDays(exp, now)
  if (jours < 0) return 'expiree'
  if (jours <= 60) return 'expire_bientot'
  return 'valide'
}
