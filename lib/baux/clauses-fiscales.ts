// Clauses fiscales de refacturation au locataire — règles légales appliquées.
//
// BAIL D'HABITATION (loi n° 89-462 du 6 juillet 1989, art. 23 ; décret n° 87-713 du 26 août 1987) :
//   seules la taxe d'enlèvement des ordures ménagères (TEOM) et la taxe de balayage sont récupérables
//   sur le locataire ; « toutes les autres taxes restent à la charge exclusive du propriétaire »,
//   donc la taxe foncière n'est PAS refacturable. Les frais de gestion de la TEOM restent à la
//   charge du bailleur (déductibles — BOI-RFPI-BASE-20-50 § 100).
//
// BAIL COMMERCIAL (art. L145-40-2 et R145-35 du Code de commerce, loi Pinel) :
//   le bail doit contenir un inventaire limitatif des charges, impôts et taxes ; la taxe foncière
//   (et ses taxes additionnelles) peut être refacturée si le bail le prévoit ; la TEOM exige une
//   stipulation expresse (Cass. 3e civ., 13 sept. 2018, n° 17-22.498). Les impôts dont le bailleur est
//   redevable (ex. CET/CVAE du bailleur), ses honoraires de gestion et les grosses réparations
//   de l'art. 606 du Code civil ne peuvent pas être refacturés.
//
// Fiscalité du bailleur : une taxe refacturée au locataire n'est pas une charge supportée par le
// bailleur, elle est donc exclue de ses charges déductibles (revenus fonciers / BIC).

export const estBailCommercial = (typeBien?: string | null) => typeBien === 'commerce'

interface BailClauses { is_active?: boolean; parsed_data?: any }

/**
 * Part annuelle de la taxe foncière (avis complet, TEOM incluse) refacturée au locataire,
 * donc non déductible pour le bailleur.
 * Habitation : uniquement la TEOM récupérable (hors frais de gestion) ; la clause « taxe foncière »
 * d'anciens baux d'habitation est ignorée car illégale.
 */
export function taxeFonciereRefacturee(
  typeBien: string | null | undefined,
  taxeFonciereAnnuelle: number,
  baux: BailClauses[],
  annee?: number,
): number {
  const actifs = (baux ?? []).filter(b => b.is_active)
  const teom = (baux ?? [])
    .filter(b => b.parsed_data?.teom_refacturee && (b.is_active || teomReelleRegularisee(b.parsed_data, annee) !== null))
    .reduce((s, b) => s + (teomReelleRegularisee(b.parsed_data, annee) ?? (Number(b.parsed_data?.teom_montant) || 0)), 0)
  if (estBailCommercial(typeBien)) {
    if (actifs.some(b => b.parsed_data?.taxe_fonciere_refacturee)) return taxeFonciereAnnuelle
    return Math.min(taxeFonciereAnnuelle, teom)
  }
  return Math.min(taxeFonciereAnnuelle, teom)
}

/** Une ancienne clause « taxe foncière refacturée » sur un bail d'habitation est sans effet légal. */
export function clauseTaxeFonciereInapplicable(typeBien: string | null | undefined, parsed: any): boolean {
  return !estBailCommercial(typeBien) && !!parsed?.taxe_fonciere_refacturee
}

/**
 * TEOM réellement refacturée pour une année, d'après la régularisation enregistrée
 * (lignes marquées `teom`). null si aucune régularisation avec ligne TEOM pour cette année.
 */
export function teomReelleRegularisee(parsed: any, annee?: number): number | null {
  if (!annee) return null
  const lignes = parsed?.regularisation_history?.[String(annee)]?.lignes
  if (!Array.isArray(lignes)) return null
  const l = lignes.filter((x: any) => x?.teom)
  if (l.length === 0) return null
  return l.reduce((s: number, x: any) => s + (Number(x.montant) || 0), 0)
}

/** Nombre de mois d'occupation d'un bail sur une année civile (mois entamés comptés si présent au 1er du mois). */
export function moisOccupes(start?: string | null, end?: string | null, annee?: number): number {
  const y = annee ?? new Date().getFullYear()
  let n = 0
  for (let m = 0; m < 12; m++) {
    const debut = new Date(y, m, 1), fin = new Date(y, m + 1, 0)
    if (start && new Date(start) > fin) continue
    if (end && new Date(end) <= debut) continue
    n++
  }
  return n
}
