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
import { IRL_CURRENT, ILC_CURRENT, ILAT_CURRENT, getQuarterLabel } from '@/lib/fiscal/indices'
import { format } from 'date-fns'
import { Paperclip, CheckCircle2, XCircle } from 'lucide-react'

const CAT_FISCALE_LABELS: Record<string, string> = {
  entretien_reparation: 'Entretien / Réparation',
  amelioration: 'Amélioration',
  travaux_deductibles: 'Déductibles LMNP/BIC',
  travaux_amortissables: 'Amortissables LMNP',
  construction_agrandissement: 'Construction',
}

const DEPENSE_LABELS: Record<string, string> = {
  interet: 'Intérêts d\'emprunt',
  assurance: 'Assurance PNO',
  assurance_gli: 'Assurance loyers impayés (GLI)',
  taxe: 'Taxe foncière',
  gestion: 'Frais de gestion',
  comptabilite: 'Frais de comptabilité',
  copropriete: 'Charges de copropriété',
  procedure: 'Frais de procédure',
  telecom: 'Télécommunications',
  deplacement: 'Déplacements',
  autre: 'Autre',
}

export default function FiscalitePage() {
  const [properties, setProperties] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tmi, setTmi] = useState(30)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const year = now.getFullYear()
      const [propRes, expRes, incRes] = await Promise.all([
        supabase.from('properties').select('*, leases(*), expenses(*), depreciation_plans(*)').order('created_at'),
        supabase.from('expenses')
          .select('*, property:properties(name)')
          .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
          .order('date', { ascending: false }),
        supabase.from('incidents')
          .select('*, property:properties(name)')
          .gte('created_at', `${year}-01-01`).lte('created_at', `${year}-12-31`)
          .order('date_travaux', { ascending: false }),
      ])
      setProperties(propRes.data ?? [])
      setExpenses(expRes.data ?? [])
      setIncidents(incRes.data ?? [])
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
        <h2 className="font-display font-semibold text-white mb-4">
          Indices de référence ({getQuarterLabel()})
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'IRL (Loyers habitation)', value: IRL_CURRENT, color: 'text-blue-400' },
            { label: 'ILC (Loyers commerciaux)', value: ILC_CURRENT, color: 'text-cyan-400' },
            { label: 'ILAT (Activités tertiaires)', value: ILAT_CURRENT, color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-xs text-slate-600 mt-1">Référence {getQuarterLabel()}</p>
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

      {/* ── TABLEAU 1 : Autres dépenses ── */}
      <GlassCard>
        <h2 className="font-display font-semibold text-white mb-4">
          Autres dépenses déductibles — {new Date().getFullYear()}
        </h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">Aucune dépense enregistrée cette année</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                  {['Date', 'Bien', 'Catégorie', 'Description', 'Montant', 'Déductible', 'Justificatif'].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {format(new Date(exp.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-[120px] truncate">
                      {exp.property?.name ?? '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300">
                        {DEPENSE_LABELS[exp.category] ?? exp.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[180px] truncate">
                      {exp.description ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-white font-semibold whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      {exp.fiscal_deductible
                        ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Oui</span>
                        : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="h-3.5 w-3.5" /> Non</span>
                      }
                    </td>
                    <td className="py-2.5 px-3">
                      {exp.receipt_url
                        ? <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-400/10 border border-blue-400/20 hover:bg-blue-400/20 transition-colors">
                            <Paperclip className="h-3 w-3 text-blue-400" />
                          </a>
                        : <span className="text-slate-700 text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.10]">
                  <td colSpan={4} className="py-2.5 px-3 text-xs text-slate-500 font-medium">Total déductible</td>
                  <td className="py-2.5 px-3 text-green-400 font-bold">
                    {formatCurrency(expenses.filter(e => e.fiscal_deductible).reduce((s, e) => s + e.amount, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── TABLEAU 2 : Travaux ── */}
      <GlassCard>
        <h2 className="font-display font-semibold text-white mb-4">
          Dépenses travaux — {new Date().getFullYear()}
        </h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">Aucun travail enregistré cette année</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                  {['Date', 'Bien', 'Entreprise', 'N° facture', 'Description', 'Coût', 'Catégorie fiscale', 'Facture'].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => {
                  const cat = inc.categorie_fiscale ?? 'entretien_reparation'
                  const isDeductible = ['entretien_reparation', 'travaux_deductibles'].includes(cat)
                  const isAmortissable = ['travaux_amortissables', 'amelioration'].includes(cat)
                  const catColor = isDeductible ? 'text-green-400 bg-green-400/10 border-green-400/20'
                    : isAmortissable ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
                    : 'text-red-400 bg-red-400/10 border-red-400/20'
                  return (
                    <tr key={inc.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {inc.date_travaux ? format(new Date(inc.date_travaux), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-[100px] truncate">
                        {inc.property?.name ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-[100px] truncate">
                        {inc.nom_entreprise ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">
                        {inc.numero_facture ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-[160px] truncate">
                        {inc.title}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <p className="text-white font-semibold">{formatCurrency(inc.cout_paye || 0)}</p>
                        {!inc.est_paye && inc.cout_estime > 0 && (
                          <p className="text-xs text-slate-600">est. {formatCurrency(inc.cout_estime)}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${catColor}`}>
                          {CAT_FISCALE_LABELS[cat] ?? cat}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {inc.facture_url
                          ? <a href={inc.facture_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-400/10 border border-blue-400/20 hover:bg-blue-400/20">
                              <Paperclip className="h-3 w-3 text-blue-400" />
                            </a>
                          : <span className={`text-xs ${inc.est_paye ? 'text-red-400' : 'text-slate-700'}`}>
                              {inc.est_paye ? '⚠' : '—'}
                            </span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.10]">
                  <td colSpan={5} className="py-2.5 px-3 text-xs text-slate-500 font-medium">Total payé</td>
                  <td className="py-2.5 px-3 text-white font-bold">
                    {formatCurrency(incidents.filter(i => i.est_paye).reduce((s, i) => s + (i.cout_paye || 0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
