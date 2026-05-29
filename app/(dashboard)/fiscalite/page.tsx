'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { SimulationCard } from '@/components/fiscalite/SimulationCard'
import { AmortissementTable } from '@/components/fiscalite/AmortissementTable'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency } from '@/lib/utils'
import { calculateLmnpSimulation, calculateDepreciation } from '@/lib/fiscal/lmnp'
import { calculateFoncierSimulation } from '@/lib/fiscal/foncier'
import { calculateSciSimulation } from '@/lib/fiscal/sci'
import { IRL_T1_2025, ILC_T1_2025 } from '@/lib/fiscal/indices'

export default function FiscalitePage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tmi, setTmi] = useState(30)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, leases(*), expenses(*), depreciation_plans(*)')
        .order('created_at')
      setProperties(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Fiscalité</h1>
          <p className="text-slate-400 text-sm mt-1">Simulations et optimisation fiscale</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">TMI :</label>
          <select
            value={tmi}
            onChange={e => setTmi(Number(e.target.value))}
            className="h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none"
          >
            {[11, 30, 41, 45].map(r => (
              <option key={r} value={r} className="bg-[#111E35]">{r}%</option>
            ))}
          </select>
        </div>
      </div>

      {/* Indices */}
      <GlassCard>
        <h2 className="font-display font-semibold text-white mb-4">Indices de référence (T1 2025)</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'IRL (Loyers habitation)', value: IRL_T1_2025, color: 'text-blue-400' },
            { label: 'ILC (Loyers commerciaux)', value: ILC_T1_2025, color: 'text-cyan-400' },
            { label: 'ILAT (Activités tertiaires)', value: 138.17, color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-xs text-slate-600 mt-1">Référence T1 2025</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-48 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {properties.map(prop => {
            const activeLeases = prop.leases?.filter((l: any) => l.is_active) ?? []
            const active_lease = activeLeases[0]
            const recettes = (active_lease?.monthly_rent ?? 0) * 12
            const expenses_ytd = (prop.expenses ?? []).filter((e: any) =>
              new Date(e.date).getFullYear() === now.getFullYear()
            )
            const charges = expenses_ytd.reduce((s: number, e: any) => s + e.amount, 0) + prop.monthly_charges * 12 + prop.property_tax + prop.insurance_annual

            return (
              <div key={prop.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <ProfileBadge type={prop.type} />
                  <h2 className="font-display font-semibold text-white">{prop.name}</h2>
                </div>

                {prop.type === 'lmnp' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SimulationCard
                      simulation={calculateLmnpSimulation({
                        recettes,
                        charges_reelles: charges,
                        amortissements: calculateDepreciation(prop.depreciation_plans ?? []),
                        taux_marginal: tmi / 100,
                      })}
                      type="lmnp"
                    />
                    <AmortissementTable plans={prop.depreciation_plans ?? []} />
                  </div>
                )}

                {prop.type === 'nu' && (
                  <SimulationCard
                    simulation={calculateFoncierSimulation({
                      revenus_bruts: recettes,
                      charges_deductibles: charges,
                      taux_marginal: tmi / 100,
                    })}
                    type="foncier"
                  />
                )}

                {prop.type === 'sci' && (
                  <GlassCard>
                    <h3 className="font-display font-semibold text-white mb-4">Simulation SCI ({prop.sci_regime?.toUpperCase() ?? 'IR'})</h3>
                    {(() => {
                      const sim = calculateSciSimulation({
                        resultat_comptable: recettes - charges,
                        regime: prop.sci_regime ?? 'ir',
                        taux_marginal: tmi / 100,
                      })
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: 'Résultat', value: formatCurrency(sim.resultat_comptable), color: 'text-white' },
                            { label: prop.sci_regime === 'is' ? 'IS dû' : 'Impôt IR', value: formatCurrency(sim.is_du), color: 'text-amber-400' },
                            { label: 'Dividendes', value: formatCurrency(sim.dividendes_disponibles), color: 'text-green-400' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/[0.03] rounded-xl p-3">
                              <p className="text-xs text-slate-500 mb-1">{label}</p>
                              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </GlassCard>
                )}
              </div>
            )
          })}

          {properties.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-400">Ajoutez des biens pour voir les simulations fiscales</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
