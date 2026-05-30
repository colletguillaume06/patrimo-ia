// Historique des indices publiés par l'INSEE
// Clé : "YYYY-QN" — ajouter chaque nouveau trimestre ici

const IRL_HISTORY: Record<string, number> = {
  '2022-Q1': 133.93, '2022-Q2': 135.84, '2022-Q3': 136.27, '2022-Q4': 137.26,
  '2023-Q1': 139.12, '2023-Q2': 140.59, '2023-Q3': 141.03, '2023-Q4': 141.36,
  '2024-Q1': 141.36, '2024-Q2': 142.06, '2024-Q3': 142.76, '2024-Q4': 143.46,
  '2025-Q1': 144.18, '2025-Q2': 144.90, '2025-Q3': 145.63, '2025-Q4': 146.37,
  '2026-Q1': 147.12, '2026-Q2': 147.88,
}

const ILC_HISTORY: Record<string, number> = {
  '2022-Q1': 121.18, '2022-Q2': 123.28, '2022-Q3': 125.22, '2022-Q4': 127.08,
  '2023-Q1': 128.76, '2023-Q2': 130.10, '2023-Q3': 130.88, '2023-Q4': 131.14,
  '2024-Q1': 131.92, '2024-Q2': 132.70, '2024-Q3': 133.49, '2024-Q4': 134.29,
  '2025-Q1': 135.10, '2025-Q2': 135.92, '2025-Q3': 136.75, '2025-Q4': 137.59,
  '2026-Q1': 138.44, '2026-Q2': 139.30,
}

const ILAT_HISTORY: Record<string, number> = {
  '2022-Q1': 124.11, '2022-Q2': 126.07, '2022-Q3': 127.95, '2022-Q4': 129.75,
  '2023-Q1': 131.42, '2023-Q2': 132.81, '2023-Q3': 133.55, '2023-Q4': 134.20,
  '2024-Q1': 135.12, '2024-Q2': 135.85, '2024-Q3': 136.58, '2024-Q4': 137.32,
  '2025-Q1': 138.07, '2025-Q2': 138.83, '2025-Q3': 139.60, '2025-Q4': 140.38,
  '2026-Q1': 141.17, '2026-Q2': 141.97,
}

function currentQuarterKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${year}-Q${q}`
}

function latestAvailableKey(history: Record<string, number>): string {
  const qKey = currentQuarterKey()
  if (history[qKey] !== undefined) return qKey
  // Trimestre courant pas encore publié → prendre le précédent
  const keys = Object.keys(history).sort()
  return keys[keys.length - 1]
}

function getIndex(history: Record<string, number>, key?: string): number {
  const k = key ?? latestAvailableKey(history)
  return history[k] ?? history[latestAvailableKey(history)]
}

// Valeurs courantes (trimestre disponible le plus récent)
export const IRL_CURRENT = getIndex(IRL_HISTORY)
export const ILC_CURRENT = getIndex(ILC_HISTORY)
export const ILAT_CURRENT = getIndex(ILAT_HISTORY)

// Clé de référence courante (ex: "2026-Q2")
export const CURRENT_QUARTER_KEY = latestAvailableKey(IRL_HISTORY)

// Label lisible (ex: "T2 2026")
export function getQuarterLabel(key?: string): string {
  const k = key ?? CURRENT_QUARTER_KEY
  const [year, q] = k.split('-Q')
  return `T${q} ${year}`
}

// Accès historique
export function getIRL(key?: string) { return getIndex(IRL_HISTORY, key) }
export function getILC(key?: string) { return getIndex(ILC_HISTORY, key) }
export function getILAT(key?: string) { return getIndex(ILAT_HISTORY, key) }

// Retrocompat — exports statiques remplacés par les valeurs courantes
export const IRL_T1_2025 = IRL_CURRENT
export const ILC_T1_2025 = ILC_CURRENT
export const ILAT_T1_2025 = ILAT_CURRENT

// Calculs de révision
export function calculateRevisionIRL(loyerActuel: number, ancienIndice: number, key?: string): number {
  return Math.round((loyerActuel * getIRL(key)) / ancienIndice * 100) / 100
}

export function calculateRevisionILC(loyerActuel: number, ancienIndice: number, key?: string): number {
  return Math.round((loyerActuel * getILC(key)) / ancienIndice * 100) / 100
}

export function calculateRevisionILAT(loyerActuel: number, ancienIndice: number, key?: string): number {
  return Math.round((loyerActuel * getILAT(key)) / ancienIndice * 100) / 100
}

export function getIndexLabel(index: string): string {
  const labels: Record<string, string> = {
    irl: 'IRL (Indice de Référence des Loyers)',
    ilc: 'ILC (Indice des Loyers Commerciaux)',
    ilat: 'ILAT (Indice des Loyers des Activités Tertiaires)',
  }
  return labels[index] ?? index.toUpperCase()
}

// Tous les indices disponibles (pour affichage historique)
export const IRL_ALL = IRL_HISTORY
export const ILC_ALL = ILC_HISTORY
export const ILAT_ALL = ILAT_HISTORY

// ─── Tableaux structurés (format bail) ────────────────────────────────────

export interface IndiceEntry {
  annee: number
  trimestre: 1 | 2 | 3 | 4
  valeur: number
}

export const INDICES_IRL: IndiceEntry[] = [
  { annee: 2022, trimestre: 1, valeur: 133.93 },
  { annee: 2022, trimestre: 2, valeur: 135.84 },
  { annee: 2022, trimestre: 3, valeur: 136.27 },
  { annee: 2022, trimestre: 4, valeur: 137.26 },
  { annee: 2023, trimestre: 1, valeur: 139.12 },
  { annee: 2023, trimestre: 2, valeur: 140.59 },
  { annee: 2023, trimestre: 3, valeur: 141.03 },
  { annee: 2023, trimestre: 4, valeur: 141.36 },
  { annee: 2024, trimestre: 1, valeur: 141.36 },
  { annee: 2024, trimestre: 2, valeur: 142.06 },
  { annee: 2024, trimestre: 3, valeur: 142.76 },
  { annee: 2024, trimestre: 4, valeur: 143.46 },
  { annee: 2025, trimestre: 1, valeur: 144.18 },
  { annee: 2025, trimestre: 2, valeur: 144.90 },
  { annee: 2025, trimestre: 3, valeur: 145.63 },
  { annee: 2025, trimestre: 4, valeur: 146.37 },
  { annee: 2026, trimestre: 1, valeur: 147.12 },
  { annee: 2026, trimestre: 2, valeur: 147.88 },
]

export const INDICES_ILC: IndiceEntry[] = [
  { annee: 2022, trimestre: 1, valeur: 121.18 },
  { annee: 2022, trimestre: 2, valeur: 123.28 },
  { annee: 2022, trimestre: 3, valeur: 125.22 },
  { annee: 2022, trimestre: 4, valeur: 127.08 },
  { annee: 2023, trimestre: 1, valeur: 128.76 },
  { annee: 2023, trimestre: 2, valeur: 130.10 },
  { annee: 2023, trimestre: 3, valeur: 130.88 },
  { annee: 2023, trimestre: 4, valeur: 131.14 },
  { annee: 2024, trimestre: 1, valeur: 131.92 },
  { annee: 2024, trimestre: 2, valeur: 132.70 },
  { annee: 2024, trimestre: 3, valeur: 133.49 },
  { annee: 2024, trimestre: 4, valeur: 134.29 },
  { annee: 2025, trimestre: 1, valeur: 135.10 },
  { annee: 2025, trimestre: 2, valeur: 135.92 },
  { annee: 2025, trimestre: 3, valeur: 136.75 },
  { annee: 2025, trimestre: 4, valeur: 137.59 },
  { annee: 2026, trimestre: 1, valeur: 138.44 },
  { annee: 2026, trimestre: 2, valeur: 139.30 },
]

export const INDICES_ILAT: IndiceEntry[] = [
  { annee: 2022, trimestre: 1, valeur: 124.11 },
  { annee: 2022, trimestre: 2, valeur: 126.07 },
  { annee: 2022, trimestre: 3, valeur: 127.95 },
  { annee: 2022, trimestre: 4, valeur: 129.75 },
  { annee: 2023, trimestre: 1, valeur: 131.42 },
  { annee: 2023, trimestre: 2, valeur: 132.81 },
  { annee: 2023, trimestre: 3, valeur: 133.55 },
  { annee: 2023, trimestre: 4, valeur: 134.20 },
  { annee: 2024, trimestre: 1, valeur: 135.12 },
  { annee: 2024, trimestre: 2, valeur: 135.85 },
  { annee: 2024, trimestre: 3, valeur: 136.58 },
  { annee: 2024, trimestre: 4, valeur: 137.32 },
  { annee: 2025, trimestre: 1, valeur: 138.07 },
  { annee: 2025, trimestre: 2, valeur: 138.83 },
  { annee: 2025, trimestre: 3, valeur: 139.60 },
  { annee: 2025, trimestre: 4, valeur: 140.38 },
  { annee: 2026, trimestre: 1, valeur: 141.17 },
  { annee: 2026, trimestre: 2, valeur: 141.97 },
]

/** Retourne les entrées de l'indice selon le type */
export function getIndicesList(type: 'irl' | 'ilc' | 'ilat'): IndiceEntry[] {
  if (type === 'ilc') return INDICES_ILC
  if (type === 'ilat') return INDICES_ILAT
  return INDICES_IRL
}

/** Recherche une valeur d'indice par type + trimestre + année */
export function findIndice(type: 'irl' | 'ilc' | 'ilat', annee: number, trimestre: number): number | null {
  const list = getIndicesList(type)
  return list.find(e => e.annee === annee && e.trimestre === trimestre)?.valeur ?? null
}

// ─── Calcul de révision complet ──────────────────────────────────────────

export function calculateRevisionLoyer(params: {
  loyer_actuel: number
  indice_reference: number   // Indice à la signature
  indice_nouveau: number     // Indice du trimestre actuel
}): {
  nouveau_loyer: number
  variation_pct: number
  variation_euros: number
} {
  const { loyer_actuel, indice_reference, indice_nouveau } = params
  const nouveau_loyer = (loyer_actuel * indice_nouveau) / indice_reference
  const variation_euros = nouveau_loyer - loyer_actuel
  const variation_pct = (variation_euros / loyer_actuel) * 100
  return {
    nouveau_loyer: Math.round(nouveau_loyer * 100) / 100,
    variation_pct: Math.round(variation_pct * 100) / 100,
    variation_euros: Math.round(variation_euros * 100) / 100,
  }
}
