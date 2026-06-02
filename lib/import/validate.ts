export interface ValidationErrors {
  bien?: { name?: string; type?: string }
  bail?: { tenant_name?: string; monthly_rent?: string; start_date?: string }
  paiements?: { [index: number]: { amount?: string; due_date?: string; status?: string } }
}

export function validateImportData(data: any): ValidationErrors {
  const errors: ValidationErrors = {}

  // Validate bien
  const bien = data?.bien || {}
  const bienErrors: ValidationErrors['bien'] = {}
  if (!bien.name) bienErrors.name = 'Nom du bien requis'
  if (!bien.type) bienErrors.type = 'Type de bien requis'
  if (Object.keys(bienErrors).length > 0) errors.bien = bienErrors

  // Validate bail
  const bail = data?.bail || {}
  const bailErrors: ValidationErrors['bail'] = {}
  if (!bail.tenant_name) bailErrors.tenant_name = 'Nom du locataire requis'
  if (!bail.monthly_rent && bail.monthly_rent !== 0) bailErrors.monthly_rent = 'Loyer mensuel requis'
  if (!bail.start_date) bailErrors.start_date = 'Date de début requis'
  if (Object.keys(bailErrors).length > 0) errors.bail = bailErrors

  // Validate paiements
  const paiements = data?.paiements || []
  const paiementsErrors: ValidationErrors['paiements'] = {}
  paiements.forEach((p: any, i: number) => {
    const pe: { amount?: string; due_date?: string; status?: string } = {}
    if (p.amount === null || p.amount === undefined) pe.amount = 'Montant requis'
    if (!p.due_date) pe.due_date = 'Date d\'échéance requise'
    if (!p.status) pe.status = 'Statut requis'
    if (Object.keys(pe).length > 0) paiementsErrors[i] = pe
  })
  if (Object.keys(paiementsErrors).length > 0) errors.paiements = paiementsErrors

  return errors
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0
}

export function countProblems(errors: ValidationErrors): number {
  let count = 0
  if (errors.bien) count += Object.keys(errors.bien).length
  if (errors.bail) count += Object.keys(errors.bail).length
  if (errors.paiements) {
    Object.values(errors.paiements).forEach(pe => {
      count += Object.keys(pe).length
    })
  }
  return count
}
