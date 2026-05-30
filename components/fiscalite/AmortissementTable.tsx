import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { DEPRECIATION_COMPONENTS } from '@/lib/fiscal/lmnp'
import type { DepreciationPlan } from '@/types'

interface AmortissementTableProps {
  plans: DepreciationPlan[]
}

export function AmortissementTable({ plans }: AmortissementTableProps) {
  const currentYear = new Date().getFullYear()

  return (
    <GlassCard>
      <h3 className="font-display font-semibold text-text-primary mb-4">Plan d'amortissement</h3>
      <div className="space-y-3">
        {plans.map(plan => {
          const startYear = new Date(plan.start_date).getFullYear()
          const endYear = startYear + plan.duration_years
          const isActive = currentYear >= startYear && currentYear < endYear
          const progress = Math.min(100, ((currentYear - startYear) / plan.duration_years) * 100)
          const label = DEPRECIATION_COMPONENTS[plan.component as keyof typeof DEPRECIATION_COMPONENTS]?.label ?? plan.component

          return (
            <div key={plan.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">{label}</span>
                  {isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-success-bg text-success-text border border-[var(--success)/20]">
                      Actif
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-text-primary">{formatCurrency(plan.annual_amount)}/an</span>
                  <span className="text-xs text-text-secondary ml-2">{plan.duration_years} ans</span>
                </div>
              </div>
              <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>{startYear}</span>
                <span>{Math.round(progress)}%</span>
                <span>{endYear}</span>
              </div>
            </div>
          )
        })}
        {plans.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-4">
            Aucun plan d'amortissement défini
          </p>
        )}
      </div>
    </GlassCard>
  )
}
