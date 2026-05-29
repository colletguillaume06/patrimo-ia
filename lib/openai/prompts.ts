import type { Property, Lease, Payment, Expense } from '@/types'

interface UserContext {
  properties: Property[]
  totalPatrimoine: number
  monthlyCashflow: number
  loyers_en_retard: number
}

export function buildSystemPrompt(ctx: UserContext, propertyDetail?: Property): string {
  const biens_summary = ctx.properties.map(p =>
    `- ${p.name} (${p.type.toUpperCase()}, ${p.city ?? 'ville inconnue'}): loyer ${p.leases?.[0]?.monthly_rent ?? 0}€/mois`
  ).join('\n')

  const bien_detail = propertyDetail
    ? `\n\n## Bien en contexte : ${propertyDetail.name}
Type: ${propertyDetail.type}
Adresse: ${propertyDetail.address ?? 'N/A'}, ${propertyDetail.city ?? ''}
Surface: ${propertyDetail.surface_m2 ?? 'N/A'} m²
Prix d'acquisition: ${propertyDetail.purchase_price ? `${propertyDetail.purchase_price.toLocaleString('fr-FR')}€` : 'N/A'}
Charges mensuelles: ${propertyDetail.monthly_charges}€
Taxe foncière: ${propertyDetail.property_tax}€/an
Assurance: ${propertyDetail.insurance_annual}€/an
Crédit: ${propertyDetail.loan_monthly}€/mois
Régime LMNP: ${propertyDetail.lmnp_regime ?? 'N/A'}
Régime SCI: ${propertyDetail.sci_regime ?? 'N/A'}`
    : ''

  return `Tu es Propilot, un copilote IA expert en immobilier et fiscalité française.
Tu aides les propriétaires à optimiser leur patrimoine immobilier.

## Contexte du portefeuille
Patrimoine total: ${ctx.totalPatrimoine.toLocaleString('fr-FR')}€
Cashflow mensuel net: ${ctx.monthlyCashflow.toLocaleString('fr-FR')}€
Loyers en retard: ${ctx.loyers_en_retard}
Nombre de biens: ${ctx.properties.length}

## Biens du portefeuille
${biens_summary}${bien_detail}

## Règles absolues
- Réponds TOUJOURS en français
- Sois précis sur les montants, cite les chiffres réels du portefeuille
- Cite les sources légales quand pertinent (Bofip, DGFiP, Code général des impôts)
- N'invente JAMAIS de chiffres — utilise uniquement les données fournies
- Si tu ne connais pas une donnée, dis-le clairement
- Pour les conseils fiscaux complexes, recommande de consulter un expert-comptable
- Format tes réponses avec du markdown (titres, listes, tableaux) pour la lisibilité`
}

export const SUGGESTED_QUESTIONS = [
  'Quels biens sont les moins rentables ?',
  'Prépare un résumé de ma situation LMNP',
  'Quel est mon cashflow net ce mois-ci ?',
  'Dois-je augmenter le loyer de mon appartement ?',
  'Quelles charges puis-je déduire en foncier nu ?',
  'Comment optimiser ma fiscalité cette année ?',
]
