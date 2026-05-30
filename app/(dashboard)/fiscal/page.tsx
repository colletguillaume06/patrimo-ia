'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency } from '@/lib/utils'
import { calculateLmnpSimulation, calculateDepreciation } from '@/lib/fiscal/lmnp'
import { calculateFoncierSimulation } from '@/lib/fiscal/foncier'
import { calculateSciSimulation } from '@/lib/fiscal/sci'
import { Download, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function FiscalPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tmi, setTmi] = useState(30)
  const year = new Date().getFullYear()
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

  const handleExport = async () => {
    const res = await fetch(`/api/export/comptable?year=${year}`)
    if (!res.ok) { toast.error('Erreur export'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `propilot-fiscal-${year}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Export téléchargé')
  }

  const now = new Date()
  let totalRevenusBruts = 0
  let totalCharges = 0
  let totalAmortissements = 0

  const propData = properties.map(prop => {
    const activeLeases = prop.leases?.filter((l: any) => l.is_active) ?? []
    const rent = activeLeases[0]?.monthly_rent ?? 0
    const recettes = rent * 12
    const expenses_ytd = (prop.expenses ?? []).filter((e: any) => new Date(e.date).getFullYear() === year)
    const charges = expenses_ytd.reduce((s: number, e: any) => s + e.amount, 0)
      + prop.monthly_charges * 12 + prop.property_tax + prop.insurance_annual
    const amortissements = calculateDepreciation(prop.depreciation_plans ?? [])

    totalRevenusBruts += recettes
    totalCharges += charges
    totalAmortissements += amortissements

    return { ...prop, recettes, charges, amortissements, expenses_ytd }
  })

  const totalResultat = totalRevenusBruts - totalCharges - totalAmortissements

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Tableau fiscal {year}</h1>
          <p className="text-text-tertiary text-sm mt-1">Récapitulatif déclaratif par régime</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-tertiary">TMI :</label>
            <select value={tmi} onChange={e => setTmi(Number(e.target.value))}
              className="h-9 px-3 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none">
              {[11, 30, 41, 45].map(r => <option key={r} value={r} className="bg-bg-card">{r}%</option>)}
            </select>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text-primary text-sm transition-all">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Synthèse globale */}
      <GlassCard glow="blue">
        <h2 className="font-display font-semibold text-text-primary mb-4">Synthèse {year}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenus bruts', value: formatCurrency(totalRevenusBruts), color: 'text-success-text' },
            { label: 'Charges réelles', value: formatCurrency(totalCharges), color: 'text-red-400' },
            { label: 'Amortissements', value: formatCurrency(totalAmortissements), color: 'text-blue-400' },
            { label: 'Résultat net', value: formatCurrency(totalResultat), color: totalResultat <= 0 ? 'text-blue-400' : 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-secondary/50 rounded-xl p-3">
              <p className="text-xs text-text-secondary mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Par régime */}
      {!loading && (
        <div className="space-y-4">
          {/* LMNP */}
          {propData.filter(p => p.type === 'lmnp').length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ProfileBadge type="lmnp" />
                  <h3 className="font-display font-semibold text-text-primary">LMNP — Formulaire 2042-C-PRO</h3>
                </div>
                <FileText className="h-4 w-4 text-text-secondary" />
              </div>
              <div className="space-y-3">
                {propData.filter(p => p.type === 'lmnp').map(prop => {
                  const sim = calculateLmnpSimulation({
                    recettes: prop.recettes,
                    charges_reelles: prop.charges,
                    amortissements: prop.amortissements,
                    taux_marginal: tmi / 100,
                  })
                  return (
                    <div key={prop.id} className="p-4 rounded-xl bg-bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-sm font-medium text-text-primary">{prop.name}</p>
                        {prop.numero_fiscal && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.05] border border-border text-xs font-mono text-text-tertiary">
                            # {prop.numero_fiscal}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-text-secondary">Recettes BIC (case 5ND)</p>
                          <p className="text-sm font-semibold text-success-text">{formatCurrency(sim.recettes)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Résultat BIC</p>
                          <p className={`text-sm font-semibold ${sim.resultat_bic <= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                            {formatCurrency(sim.resultat_bic)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Régime optimal</p>
                          <p className="text-sm font-semibold text-text-primary uppercase">{sim.regime}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Impôt estimé</p>
                          <p className="text-sm font-semibold text-amber-400">{formatCurrency(sim.impot_estime)}</p>
                        </div>
                      </div>
                      {sim.resultat_bic <= 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-success-text">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Résultat nul grâce aux amortissements — aucun impôt BIC dû
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 p-3 rounded-lg bg-blue-400/5 border border-blue-400/20">
                <p className="text-xs text-blue-400">📋 À reporter sur la déclaration 2042-C-PRO, rubrique « Revenus des locations meublées non professionnelles »</p>
              </div>
            </GlassCard>
          )}

          {/* Foncier nu */}
          {propData.filter(p => p.type === 'nu').length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ProfileBadge type="nu" />
                  <h3 className="font-display font-semibold text-text-primary">Foncier nu — Formulaire 2044</h3>
                </div>
              </div>
              <div className="space-y-3">
                {propData.filter(p => p.type === 'nu').map(prop => {
                  const sim = calculateFoncierSimulation({
                    revenus_bruts: prop.recettes,
                    charges_deductibles: prop.charges,
                    taux_marginal: tmi / 100,
                  })
                  return (
                    <div key={prop.id} className="p-4 rounded-xl bg-bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-sm font-medium text-text-primary">{prop.name}</p>
                        {prop.numero_fiscal && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.05] border border-border text-xs font-mono text-text-tertiary">
                            # {prop.numero_fiscal}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-text-secondary">Revenus bruts (ligne 210)</p>
                          <p className="text-sm font-semibold text-success-text">{formatCurrency(sim.revenus_bruts)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Charges déductibles</p>
                          <p className="text-sm font-semibold text-red-400">{formatCurrency(sim.charges_deductibles)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Revenu net / déficit</p>
                          <p className={`text-sm font-semibold ${sim.revenu_net <= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                            {formatCurrency(sim.revenu_net)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Régime optimal</p>
                          <p className="text-sm font-semibold text-text-primary uppercase">{sim.regime_optimal}</p>
                        </div>
                      </div>
                      {sim.deficit_foncier && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-blue-400">
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          Déficit foncier de {formatCurrency(sim.deficit_foncier)} imputable sur le revenu global (plafond 10 700€/an)
                        </div>
                      )}
                      {prop.recettes > 15000 && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Revenus &gt; 15 000€ : micro-foncier non applicable, régime réel obligatoire (2044)
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )}

          {/* SCI */}
          {propData.filter(p => p.type === 'sci').length > 0 && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <ProfileBadge type="sci" />
                <h3 className="font-display font-semibold text-text-primary">SCI — Formulaire 2072</h3>
              </div>
              {propData.filter(p => p.type === 'sci').map(prop => {
                const sim = calculateSciSimulation({
                  resultat_comptable: prop.recettes - prop.charges,
                  regime: prop.sci_regime ?? 'ir',
                  taux_marginal: tmi / 100,
                })
                return (
                  <div key={prop.id} className="p-4 rounded-xl bg-bg-secondary/50 border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-sm font-medium text-text-primary">{prop.sci_name ?? prop.name}</p>
                      {prop.numero_fiscal && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.05] border border-border text-xs font-mono text-text-tertiary">
                          # {prop.numero_fiscal}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-text-secondary">Résultat comptable</p>
                        <p className="text-sm font-semibold text-text-primary">{formatCurrency(sim.resultat_comptable)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">{prop.sci_regime === 'is' ? 'IS dû' : 'Quote-part IR'}</p>
                        <p className="text-sm font-semibold text-amber-400">{formatCurrency(sim.is_du)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Dividendes distribuables</p>
                        <p className="text-sm font-semibold text-success-text">{formatCurrency(sim.dividendes_disponibles)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Déclaration 2072 à déposer avant le 2ème jour ouvré de mai
                    </div>
                  </div>
                )
              })}
            </GlassCard>
          )}

          {properties.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-text-tertiary">Ajoutez des biens pour voir le tableau fiscal</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
