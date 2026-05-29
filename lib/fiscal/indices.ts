export const IRL_T1_2025 = 141.36
export const ILC_T1_2025 = 131.14
export const ILAT_T1_2025 = 138.17

export function calculateRevisionIRL(loyerActuel: number, ancienIndice: number): number {
  return Math.round((loyerActuel * IRL_T1_2025) / ancienIndice * 100) / 100
}

export function calculateRevisionILC(loyerActuel: number, ancienIndice: number): number {
  return Math.round((loyerActuel * ILC_T1_2025) / ancienIndice * 100) / 100
}

export function calculateRevisionILAT(loyerActuel: number, ancienIndice: number): number {
  return Math.round((loyerActuel * ILAT_T1_2025) / ancienIndice * 100) / 100
}

export function getIndexLabel(index: string): string {
  const labels: Record<string, string> = {
    irl: 'IRL (Indice de Référence des Loyers)',
    ilc: 'ILC (Indice des Loyers Commerciaux)',
    ilat: 'ILAT (Indice des Loyers des Activités Tertiaires)',
  }
  return labels[index] ?? index.toUpperCase()
}
