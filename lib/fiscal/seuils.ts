/**
 * Seuils fiscaux de la location meublée — revenus 2026.
 *
 * ⚠️ Ces montants évoluent (loi de finances) : les plafonds micro-BIC sont
 * revalorisés tous les 3 ans. Valeurs vérifiées le 2026-08 sur economie.gouv.fr
 * et BOFiP ; la prochaine revalorisation portera sur les revenus 2029.
 *
 * Sources :
 *  - art. 155 IV du CGI — seuil LMP (23 000 €, inchangé)
 *  - art. 50-0 du CGI — micro-BIC ; seuil services porté à 83 600 € pour
 *    les revenus 2026-2028 (contre 77 700 € en 2023-2025)
 *  - loi « Le Meur » (2024) — meublés de tourisme non classés ramenés à
 *    15 000 € de plafond et 30 % d'abattement
 */

export const SEUILS = {
  /** Recettes meublées au-delà desquelles le statut LMP peut s'appliquer. */
  LMP_RECETTES: 23_000,
  /** Micro-BIC — meublé de tourisme NON classé (loi Le Meur). */
  MICRO_TOURISME_NON_CLASSE: { plafond: 15_000, abattement: 0.30 },
  /** Micro-BIC — meublé de tourisme CLASSÉ (seuil services 2026-2028). */
  MICRO_TOURISME_CLASSE: { plafond: 83_600, abattement: 0.50 },
  /** Micro-BIC — location meublée longue durée (seuil services 2026-2028). */
  MICRO_LONGUE_DUREE: { plafond: 83_600, abattement: 0.50 },
} as const

/** Part du plafond à partir de laquelle on prévient l'utilisateur. */
const SEUIL_ALERTE = 0.8

export type NiveauSeuil = 'ok' | 'proche' | 'depasse'

export interface EtatSeuil {
  label: string
  recettes: number
  plafond: number
  pct: number
  niveau: NiveauSeuil
  message: string
}

function niveauDe(recettes: number, plafond: number): NiveauSeuil {
  if (recettes > plafond) return 'depasse'
  if (recettes >= plafond * SEUIL_ALERTE) return 'proche'
  return 'ok'
}

/**
 * Seuil LMP : s'apprécie sur TOUTES les recettes meublées du foyer fiscal
 * (Airbnb + LMNP longue durée cumulés), et non bien par bien. Il porte sur les
 * recettes BRUTES encaissées (loyers + charges), avant toute déduction.
 *
 * Le basculement en LMP exige DEUX conditions cumulatives : dépasser 23 000 €
 * ET que ces recettes excèdent les autres revenus d'activité du foyer. L'app ne
 * connaissant pas ces autres revenus, on se limite à signaler la 1re condition.
 */
export function evaluerSeuilLmp(recettesMeubleesTotal: number): EtatSeuil {
  const plafond = SEUILS.LMP_RECETTES
  const niveau = niveauDe(recettesMeubleesTotal, plafond)
  return {
    label: 'Statut LMP (professionnel)',
    recettes: recettesMeubleesTotal,
    plafond,
    pct: plafond > 0 ? (recettesMeubleesTotal / plafond) * 100 : 0,
    niveau,
    message:
      niveau === 'depasse'
        ? `Vos recettes meublées dépassent ${plafond.toLocaleString('fr-FR')} €. Vous basculez en LMP uniquement si elles excèdent aussi vos autres revenus d'activité (salaires, pensions…) — à vérifier.`
        : niveau === 'proche'
          ? `Vous approchez de ${plafond.toLocaleString('fr-FR')} € de recettes meublées, 1re condition du statut LMP.`
          : `Recettes meublées cumulées sous le seuil de ${plafond.toLocaleString('fr-FR')} €.`,
  }
}

/**
 * Compare le coût fiscal d'un meublé de tourisme classé vs non classé.
 *
 * Deux effets se cumulent :
 *  1. l'abattement micro-BIC (30 % non classé / 50 % classé) ;
 *  2. le plafond : au-delà de 15 000 €, un non classé perd le micro-BIC et
 *     bascule au régime réel — le comparatif ne vaut alors plus (on le signale).
 *
 * `tauxGlobal` = TMI + prélèvements sociaux (18,6 % depuis la LFSS 2026 pour
 * la location meublée non professionnelle).
 */
export function comparerClassement(recettes: number, tauxGlobal: number) {
  const nc = SEUILS.MICRO_TOURISME_NON_CLASSE
  const c = SEUILS.MICRO_TOURISME_CLASSE

  const baseNonClasse = recettes * (1 - nc.abattement)
  const baseClasse = recettes * (1 - c.abattement)
  const impotNonClasse = baseNonClasse * tauxGlobal
  const impotClasse = baseClasse * tauxGlobal

  return {
    recettes,
    baseNonClasse,
    baseClasse,
    impotNonClasse,
    impotClasse,
    economie: impotNonClasse - impotClasse,
    /** Au-delà du plafond non classé, le micro-BIC n'est plus ouvert sans classement. */
    nonClasseHorsMicro: recettes > nc.plafond,
    plafondNonClasse: nc.plafond,
    plafondClasse: c.plafond,
  }
}

/**
 * Plafonds micro-BIC : contrairement au seuil LMP, ils s'apprécient PAR
 * catégorie d'activité, avec des abattements distincts.
 */
export function evaluerSeuilMicroBic(
  categorie: 'tourisme_non_classe' | 'tourisme_classe' | 'longue_duree',
  recettes: number,
): EtatSeuil {
  const cfg =
    categorie === 'tourisme_non_classe' ? SEUILS.MICRO_TOURISME_NON_CLASSE
    : categorie === 'tourisme_classe' ? SEUILS.MICRO_TOURISME_CLASSE
    : SEUILS.MICRO_LONGUE_DUREE

  const label =
    categorie === 'tourisme_non_classe' ? 'Micro-BIC — meublé de tourisme non classé'
    : categorie === 'tourisme_classe' ? 'Micro-BIC — meublé de tourisme classé'
    : 'Micro-BIC — location meublée longue durée'

  const niveau = niveauDe(recettes, cfg.plafond)
  const pctAbattement = Math.round(cfg.abattement * 100)

  return {
    label,
    recettes,
    plafond: cfg.plafond,
    pct: cfg.plafond > 0 ? (recettes / cfg.plafond) * 100 : 0,
    niveau,
    message:
      niveau === 'depasse'
        ? `Au-delà de ${cfg.plafond.toLocaleString('fr-FR')} €, le régime réel devient obligatoire (fin de l'abattement de ${pctAbattement} %).`
        : niveau === 'proche'
          ? `Vous approchez de ${cfg.plafond.toLocaleString('fr-FR')} €. Au-delà, passage au régime réel.`
          : `Sous le plafond de ${cfg.plafond.toLocaleString('fr-FR')} € — abattement de ${pctAbattement} % applicable.`,
  }
}
