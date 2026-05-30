import { GlassCard } from '@/components/ui/GlassCard'
import { SimulationCard } from '@/components/fiscalite/SimulationCard'
import { AmortissementTable } from '@/components/fiscalite/AmortissementTable'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { NumeroFiscalBadge } from '@/components/biens/NumeroFiscalBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { calculateLmnpSimulation, calculateDepreciation } from '@/lib/fiscal/lmnp'
import type { Property, Lease, DepreciationPlan, Expense } from '@/types'

interface ProfileLMNPProps {
  property: Property & {
    active_lease: Lease | null
    expenses_ytd: Expense[]
    depreciation_plans: DepreciationPlan[]
    gross_yield: number | null
    monthly_cashflow: number | null
  }
}

export function ProfileLMNP({ property: p }: ProfileLMNPProps) {
  const recettes = (p.active_lease?.monthly_rent ?? 0) * 12
  const charges = p.expenses_ytd.reduce((s, e) => s + e.amount, 0) + p.monthly_charges * 12 + p.loan_monthly * 12 + p.property_tax + p.insurance_annual
  const amortissements = calculateDepreciation(p.depreciation_plans)

  const simulation = calculateLmnpSimulation({
    recettes,
    charges_reelles: charges,
    amortissements,
    taux_marginal: 0.30,
  })

  const resultat = recettes - charges - amortissements

  return (
    <div className="space-y-6">
      {/* Hero */}
      <GlassCard glow="green" className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <ProfileBadge type="lmnp" />
            <h2 className="font-display font-bold text-2xl text-text-primary mt-2">{p.name}</h2>
            <p className="text-text-tertiary text-sm">{p.address}, {p.city}</p>
            <div className="mt-2">
              <NumeroFiscalBadge numero_fiscal={p.numero_fiscal ?? null} property_id={p.id} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary mb-0.5">Régime</p>
            <span className="text-sm font-semibold text-success-text uppercase">{p.lmnp_regime ?? 'Non défini'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Loyer mensuel', value: p.active_lease ? formatCurrency(p.active_lease.monthly_rent) : '—', color: 'text-text-primary' },
            { label: 'Rendement brut', value: p.gross_yield ? formatPct(p.gross_yield) : '—', color: 'text-success-text' },
            { label: 'Cashflow net', value: p.monthly_cashflow !== null ? formatCurrency(p.monthly_cashflow) : '—', color: (p.monthly_cashflow ?? 0) >= 0 ? 'text-success-text' : 'text-red-400' },
            { label: 'Résultat BIC', value: formatCurrency(resultat), color: resultat <= 0 ? 'text-blue-400' : 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-secondary/50 rounded-xl p-3">
              <p className="text-xs text-text-secondary mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Résultat BIC détaillé */}
      <GlassCard>
        <h3 className="font-display font-semibold text-text-primary mb-4">Résultat BIC {new Date().getFullYear()}</h3>
        <div className="space-y-3">
          {[
            { label: 'Recettes locatives', value: recettes, color: 'text-success-text' },
            { label: 'Charges réelles', value: -charges, color: 'text-red-400' },
            { label: 'Amortissements', value: -amortissements, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-text-secondary">{label}</span>
              <span className={`text-sm font-semibold ${color}`}>
                {value >= 0 ? '+' : ''}{formatCurrency(value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-text-primary">Résultat BIC</span>
            <span className={`text-base font-bold ${resultat <= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {formatCurrency(resultat)}
            </span>
          </div>
        </div>
        {resultat <= 0 && (
          <div className="mt-3 p-3 bg-blue-400/5 border border-blue-400/20 rounded-lg">
            <p className="text-xs text-blue-400">
              ✅ Résultat quasi-nul grâce aux amortissements — optimisation fiscale LMNP réel réussie
            </p>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SimulationCard simulation={simulation} type="lmnp" />
        <AmortissementTable plans={p.depreciation_plans} />
      </div>
    </div>
  )
}
