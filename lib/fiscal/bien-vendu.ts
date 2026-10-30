// Gestion fiscale des biens vendus (sold_at renseigné).
// Règle : un bien vendu en année N reste déclaré pour les années <= N (prorata en N), et disparaît après N.

interface BienLike {
  sold_at?: string | null
  monthly_charges?: number | null
  property_tax?: number | null
  insurance_annual?: number | null
  loan_monthly?: number | null
  leases?: { monthly_rent?: number | null; start_date: string; end_date?: string | null; is_active?: boolean }[]
}

const DAY = 86_400_000
const utc = (s: string) => Date.parse(s.slice(0, 10) + 'T00:00:00Z')

/** Le bien est-il à déclarer pour cette année ? (non vendu, ou vendu cette année ou plus tard) */
export function detenuSurAnnee(bien: BienLike, year: number): boolean {
  if (!bien.sold_at) return true
  return new Date(bien.sold_at).getFullYear() >= year
}

/** Part de l'année détenue (1 si non vendu ou vendu après l'année ; prorata en année de vente). */
export function fractionAnneeDetenue(bien: BienLike, year: number): number {
  if (!bien.sold_at) return 1
  const soldYear = new Date(bien.sold_at).getFullYear()
  if (soldYear > year) return 1
  if (soldYear < year) return 0
  const debut = Date.UTC(year, 0, 1)
  const fin = Date.UTC(year + 1, 0, 1)
  const jours = Math.min(fin, utc(bien.sold_at) + DAY) - debut
  return Math.max(0, Math.min(1, jours / (fin - debut)))
}

/**
 * Loyers annuels d'un bien VENDU : somme des loyers mensuels × mois d'occupation sur l'année,
 * en tenant compte des baux désormais clos (fin de bail ramenée à la date de vente).
 */
export function loyersBienVendu(bien: BienLike, year: number): number {
  if (!bien.sold_at) return 0
  const debutAnnee = Date.UTC(year, 0, 1)
  const finAnnee = Date.UTC(year + 1, 0, 1)
  const vente = utc(bien.sold_at) + DAY
  let total = 0
  for (const l of bien.leases ?? []) {
    const debut = Math.max(utc(l.start_date), debutAnnee)
    const fin = Math.min(l.end_date ? utc(l.end_date) + DAY : finAnnee, finAnnee, vente)
    if (fin > debut) total += (l.monthly_rent ?? 0) * ((fin - debut) / DAY) / (365 / 12)
  }
  return Math.round(total * 100) / 100
}

/** Charges fixes annuelles (mensuelles ×12, taxe foncière, assurance, prêt), proratisées l'année de vente. */
export function chargesFixesAnnuelles(bien: BienLike, year: number, avecPret = false): number {
  const base = (bien.monthly_charges ?? 0) * 12 + (bien.property_tax ?? 0) + (bien.insurance_annual ?? 0)
    + (avecPret ? (bien.loan_monthly ?? 0) * 12 : 0)
  return base * fractionAnneeDetenue(bien, year)
}
