import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'
import type { LmnpSimulation, FoncierSimulation } from '@/types'

type Simulation = LmnpSimulation | FoncierSimulation

interface SimulationCardProps {
  simulation: Simulation
  type: 'lmnp' | 'foncier'
}

function isLmnp(s: Simulation): s is LmnpSimulation {
  return 'amortissements' in s
}

export function SimulationCard({ simulation, type }: SimulationCardProps) {
  if (isLmnp(simulation)) {
    const optimal = simulation.regime
    return (
      <GlassCard>
        <h3 className="font-display font-semibold text-[#0A0908] mb-4">Simulation fiscale LMNP</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Micro-BIC (50%)', regime: 'micro' as const, impot: simulation.micro_bic_impot, base: simulation.micro_bic_base },
            { label: 'Régime réel', regime: 'reel' as const, impot: simulation.impot_estime, base: simulation.resultat_bic },
          ].map(({ label, regime, impot, base }) => (
            <div
              key={regime}
              className={`relative p-4 rounded-xl border transition-all ${
                optimal === regime
                  ? 'border-green-400/30 bg-green-400/5'
                  : 'border-white/[0.08] bg-white/[0.03]'
              }`}
            >
              {optimal === regime && (
                <div className="absolute -top-2 -right-2">
                  <span className="flex items-center gap-1 text-xs font-semibold text-[var(--success)] bg-[#111E35] border border-green-400/30 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" /> Optimal
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-400 mb-2">{label}</p>
              <p className="text-lg font-bold text-[#0A0908]">{formatCurrency(impot)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Base : {formatCurrency(base)}</p>
            </div>
          ))}
        </div>
        {simulation.economie_regime_reel > 0 && (
          <div className="mt-3 p-3 bg-green-400/5 border border-[var(--success)/20] rounded-lg">
            <p className="text-xs text-[var(--success)] font-medium">
              💡 Économie en régime réel : {formatCurrency(simulation.economie_regime_reel)}/an
            </p>
          </div>
        )}
      </GlassCard>
    )
  }

  const s = simulation as FoncierSimulation
  const optimal = s.regime_optimal

  return (
    <GlassCard>
      <h3 className="font-display font-semibold text-[#0A0908] mb-4">Simulation fiscale Foncier</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Micro-foncier (30%)', regime: 'micro' as const, impot: s.micro_impot },
          { label: 'Régime réel', regime: 'reel' as const, impot: s.reel_impot },
        ].map(({ label, regime, impot }) => (
          <div
            key={regime}
            className={`relative p-4 rounded-xl border ${
              optimal === regime
                ? 'border-green-400/30 bg-green-400/5'
                : 'border-white/[0.08] bg-white/[0.03]'
            }`}
          >
            {optimal === regime && (
              <div className="absolute -top-2 -right-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--success)] bg-[#111E35] border border-green-400/30 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" /> Optimal
                </span>
              </div>
            )}
            <p className="text-xs text-slate-400 mb-2">{label}</p>
            <p className="text-lg font-bold text-[#0A0908]">{formatCurrency(impot)}</p>
          </div>
        ))}
      </div>
      {s.deficit_foncier && (
        <div className="mt-3 p-3 bg-blue-400/5 border border-blue-400/20 rounded-lg">
          <p className="text-xs text-blue-400 font-medium">
            📋 Déficit foncier imputable : {formatCurrency(s.deficit_foncier)} (plafond 10 700€/an)
          </p>
        </div>
      )}
    </GlassCard>
  )
}
