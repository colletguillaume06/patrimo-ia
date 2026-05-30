import { GlassCard } from '@/components/ui/GlassCard'
import { SimulationCard } from '@/components/fiscalite/SimulationCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { NumeroFiscalBadge } from '@/components/biens/NumeroFiscalBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { calculateFoncierSimulation } from '@/lib/fiscal/foncier'
import { AlertTriangle } from 'lucide-react'
import type { Property, Lease, Expense } from '@/types'

interface ProfileNuProps {
  property: Property & {
    active_lease: Lease | null
    expenses_ytd: Expense[]
    gross_yield: number | null
    monthly_cashflow: number | null
  }
}

export function ProfileNu({ property: p }: ProfileNuProps) {
  const revenus_bruts = (p.active_lease?.monthly_rent ?? 0) * 12
  const charges = p.expenses_ytd
    .filter(e => e.fiscal_deductible)
    .reduce((s, e) => s + e.amount, 0) + p.monthly_charges * 12 + p.loan_monthly * 12 + p.property_tax + p.insurance_annual

  const simulation = calculateFoncierSimulation({
    revenus_bruts,
    charges_deductibles: charges,
    taux_marginal: 0.30,
  })

  const isMicroEligible = revenus_bruts <= 15000
  const deductibleExpenses = p.expenses_ytd.filter(e => e.fiscal_deductible)

  return (
    <div className="space-y-6">
      <GlassCard glow="blue" className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <ProfileBadge type="nu" />
            <h2 className="font-display font-bold text-2xl text-[#0A0908] mt-2">{p.name}</h2>
            <p className="text-slate-400 text-sm">{p.address}, {p.city}</p>
            <div className="mt-2"><NumeroFiscalBadge numero_fiscal={p.numero_fiscal ?? null} property_id={p.id} /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenus bruts', value: formatCurrency(revenus_bruts), color: 'text-[#0A0908]' },
            { label: 'Charges déductibles', value: formatCurrency(charges), color: 'text-red-400' },
            { label: 'Revenu net', value: formatCurrency(simulation.revenu_net), color: simulation.revenu_net <= 0 ? 'text-blue-400' : 'text-amber-400' },
            { label: 'Rendement brut', value: p.gross_yield ? formatPct(p.gross_yield) : '—', color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {!isMicroEligible && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-400/5 border border-amber-400/20">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Vos revenus fonciers ({formatCurrency(revenus_bruts)}) dépassent 15 000€ — le régime micro-foncier n'est pas disponible. Vous êtes automatiquement au régime réel.
          </p>
        </div>
      )}

      {isMicroEligible && revenus_bruts > 12000 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-400/5 border border-amber-400/20">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Vous approchez du seuil de 15 000€ micro-foncier. Anticipez dès maintenant le passage au réel.
          </p>
        </div>
      )}

      <SimulationCard simulation={simulation} type="foncier" />

      <GlassCard>
        <h3 className="font-display font-semibold text-[#0A0908] mb-4">Charges déductibles détectées</h3>
        {deductibleExpenses.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune charge enregistrée pour {new Date().getFullYear()}</p>
        ) : (
          <div className="space-y-2">
            {deductibleExpenses.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <div>
                  <span className="text-sm text-slate-300">{e.description ?? e.category}</span>
                  <span className="ml-2 text-xs text-slate-600 capitalize">{e.category}</span>
                </div>
                <span className="text-sm font-semibold text-red-400">-{formatCurrency(e.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-semibold text-[#0A0908]">Total déductible</span>
              <span className="text-sm font-bold text-red-400">-{formatCurrency(deductibleExpenses.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
