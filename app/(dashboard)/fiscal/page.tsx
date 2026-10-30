'use client'

import { useEffect, useState } from 'react'
import { detenuSurAnnee } from '@/lib/fiscal/bien-vendu'
import { taxeFonciereRefacturee } from '@/lib/baux/clauses-fiscales'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency } from '@/lib/utils'
import { calculateLmnpSimulation, calculateDepreciation } from '@/lib/fiscal/lmnp'
import { calculateFoncierSimulation } from '@/lib/fiscal/foncier'
import { calculateSciSimulation } from '@/lib/fiscal/sci'
import { Download, AlertTriangle, CheckCircle2, FileText, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { BackButton } from '@/components/ui/BackButton'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

export default function FiscalPage() {
  const [allProperties, setProperties] = useState<any[]>([])
  const [depensesAnnexes, setDepensesAnnexes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tmi, setTmi] = useState(30)
  const [year, setYear] = useState(new Date().getFullYear())
  const [expandedCharges, setExpandedCharges] = useState<string | null>(null)
  const [showAnnexes, setShowAnnexes] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [propsRes, annexesRes] = await Promise.all([
        supabase
          .from('properties')
          .select('*, leases(*, payments(*)), expenses(*), incidents(*), depreciation_plans(*)')
          .order('created_at'),
        supabase
          .from('incidents')
          .select('*')
          .is('property_id', null)
          .eq('est_paye', true),
      ])
      setProperties(propsRes.data ?? [])
      setDepensesAnnexes(annexesRes.data ?? [])
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

  // Date limite : aujourd'hui si année en cours, sinon 31 déc de l'année
  const today = new Date()
  const isCurrentYear = year === today.getFullYear()
  const cutoff = isCurrentYear ? today : new Date(year, 11, 31)

  // Bien vendu : conservé l'année de vente, exclu ensuite
  const properties = allProperties.filter(p => detenuSurAnnee(p, year))
  const propData = properties.map(prop => {
    // Recettes = uniquement les paiements réellement encaissés du 1er jan à aujourd'hui (pas de projection)
    const allPayments = (prop.leases ?? []).flatMap((l: any) => l.payments ?? [])
    const paidYear = allPayments.filter((p: any) => {
      const d = new Date(p.due_date)
      return d.getFullYear() === year && d <= cutoff && p.status === 'paid'
    })
    const recettes = paidYear.reduce((s: number, p: any) => s + (p.amount ?? 0), 0)

    // Charges = dépenses et travaux payés du 1er jan à aujourd'hui
    const expenses_ytd = (prop.expenses ?? []).filter((e: any) => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d <= cutoff
    })
    const incidents_ytd = (prop.incidents ?? []).filter((i: any) => {
      const d = new Date(i.date_travaux ?? i.created_at)
      return d.getFullYear() === year && d <= cutoff && i.est_paye
    })
    const chargesExpenses = expenses_ytd.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
    const chargesIncidents = incidents_ytd.reduce((s: number, i: any) => s + (i.cout_paye || i.cout_estime || 0), 0)
    // Charges fixes (copro, taxe foncière, assurance) : proratisées si année en cours
    const moisVente = prop.sold_at && new Date(prop.sold_at).getFullYear() === year ? new Date(prop.sold_at).getMonth() + 1 : 12
    const moisEcoules = Math.min(isCurrentYear ? today.getMonth() + 1 : 12, moisVente)
    // Taxe foncière refacturée si au moins un bail actif a cette clause
    // Commerce : taxe foncière entière si clause ; habitation : seule la TEOM récupérée est exclue
    const refactureAnnuel = taxeFonciereRefacturee(prop.type, prop.property_tax ?? 0, prop.leases ?? [])
    const taxeFonciereIntegralementRefacturee = refactureAnnuel > 0 && refactureAnnuel >= (prop.property_tax ?? 0)
    const taxeFonciereMontant = Math.max(0, (prop.property_tax ?? 0) - refactureAnnuel) * moisEcoules / 12
    const chargesFixes = (prop.monthly_charges * moisEcoules)
      + taxeFonciereMontant
      + (prop.insurance_annual * moisEcoules / 12)
    const charges = chargesExpenses + chargesIncidents + chargesFixes
    const amortissements = calculateDepreciation(prop.depreciation_plans ?? [])

    totalRevenusBruts += recettes
    totalCharges += charges
    totalAmortissements += amortissements

    // Détail des charges pour affichage transparent
    const chargesDetail = {
      copro: prop.monthly_charges * moisEcoules,
      taxe_fonciere: taxeFonciereMontant,
      taxe_fonciere_brute: prop.property_tax * moisEcoules / 12,
      taxe_fonciere_refacturee: taxeFonciereIntegralementRefacturee,
      teom_refacturee: refactureAnnuel > 0 && !taxeFonciereIntegralementRefacturee ? refactureAnnuel * moisEcoules / 12 : 0,
      assurance: prop.insurance_annual * moisEcoules / 12,
      travaux: chargesIncidents,
      depenses: chargesExpenses,
      moisEcoules,
    }

    return { ...prop, recettes, charges, amortissements, expenses_ytd, chargesDetail }
  })

  // Dépenses annexes de l'année (non liées à un bien)
  const annexesYear = depensesAnnexes.filter((d: any) => {
    const d2 = new Date(d.date_travaux ?? d.created_at)
    return d2.getFullYear() === year && d2 <= cutoff
  })
  const totalAnnexes = annexesYear.reduce((s: number, d: any) => s + (d.cout_paye || 0), 0)
  totalCharges += totalAnnexes

  const totalResultat = totalRevenusBruts - totalCharges - totalAmortissements

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Tableau fiscal {year}</h1>
          <p className="text-slate-400 text-sm mt-1">Récapitulatif déclaratif par régime</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur année */}
          <div className="flex gap-1">
            {YEARS.map(y => (
              <button key={y} onClick={() => setYear(y)}
                className="h-9 px-3 rounded-lg text-sm font-medium transition-all"
                style={year === y
                  ? { background: '#1D4ED8', color: '#fff' }
                  : { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                }>
                {y}
              </button>
            ))}
          </div>
          {/* TMI */}
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: 'var(--text-tertiary)' }}>TMI :</label>
            <select value={tmi} onChange={e => setTmi(Number(e.target.value))}
              className="h-9 px-3 rounded-lg text-sm focus:outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {[11, 30, 41, 45].map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Synthèse globale */}
      <GlassCard glow="blue">
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Synthèse {year}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenus bruts', value: formatCurrency(totalRevenusBruts), color: 'text-[var(--success)]' },
            { label: 'Charges réelles', value: formatCurrency(totalCharges), color: 'text-red-400' },
            { label: 'Amortissements', value: formatCurrency(totalAmortissements), color: 'text-blue-400' },
            { label: 'Résultat net', value: formatCurrency(totalResultat), color: totalResultat <= 0 ? 'text-blue-400' : 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Dépenses annexes */}
      {annexesYear.length > 0 && (
        <GlassCard>
          <button onClick={() => setShowAnnexes(v => !v)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-[var(--text-primary)]">Dépenses annexes de gestion</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20">{annexesYear.length} dépense{annexesYear.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold font-mono text-red-400">{formatCurrency(totalAnnexes)}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showAnnexes ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showAnnexes && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-3">Frais de gestion déductibles non liés à un bien spécifique (LMNP, SCI à l'IS, location saisonnière)</p>
              <div className="space-y-1.5">
                {annexesYear.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{d.title}</p>
                      <p className="text-xs text-slate-500">{d.nom_entreprise ? `${d.nom_entreprise} · ` : ''}{d.date_travaux ? new Date(d.date_travaux).toLocaleDateString('fr-FR') : ''}</p>
                    </div>
                    <span className="text-sm font-mono font-medium text-red-400">{formatCurrency(d.cout_paye || 0)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-white/[0.06]">
                <span className="text-xs font-semibold text-slate-400">Total déductible</span>
                <span className="text-sm font-bold font-mono text-red-400">{formatCurrency(totalAnnexes)}</span>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Par régime */}
      {!loading && (
        <div className="space-y-4">
          {/* LMNP */}
          {propData.filter(p => p.type === 'lmnp').length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ProfileBadge type="lmnp" />
                  <h3 className="font-display font-semibold text-[var(--text-primary)]">LMNP — Formulaire 2042-C-PRO</h3>
                </div>
                <FileText className="h-4 w-4 text-slate-500" />
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
                    <div key={prop.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{prop.name}</p>
                        {prop.numero_fiscal && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-slate-400">
                            # {prop.numero_fiscal}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Recettes BIC (case 5ND)</p>
                          <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(sim.recettes)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Résultat BIC</p>
                          <p className={`text-sm font-semibold ${sim.resultat_bic <= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                            {formatCurrency(sim.resultat_bic)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Régime optimal</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)] uppercase">{sim.regime}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Impôt estimé</p>
                          <p className="text-sm font-semibold text-amber-400">{formatCurrency(sim.impot_estime)}</p>
                        </div>
                      </div>
                      {sim.resultat_bic <= 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--success)]">
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
                  <h3 className="font-display font-semibold text-[var(--text-primary)]">Foncier nu — Formulaire 2044</h3>
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
                    <div key={prop.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{prop.name}</p>
                        {prop.numero_fiscal && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-slate-400">
                            # {prop.numero_fiscal}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Revenus bruts (ligne 210)</p>
                          <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(sim.revenus_bruts)}</p>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedCharges(expandedCharges === prop.id ? null : prop.id)}
                            className="text-left w-full group"
                          >
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              Charges déductibles
                              <ChevronDown className={`h-3 w-3 transition-transform ${expandedCharges === prop.id ? 'rotate-180' : ''}`} />
                            </p>
                            <p className="text-sm font-semibold text-red-400">{formatCurrency(sim.charges_deductibles)}</p>
                          </button>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Revenu net / déficit</p>
                          <p className={`text-sm font-semibold ${sim.revenu_net <= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                            {formatCurrency(sim.revenu_net)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Régime optimal</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)] uppercase">{sim.regime_optimal}</p>
                        </div>
                      </div>
                      {expandedCharges === prop.id && (
                        <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15 space-y-1.5">
                          <p className="text-xs font-semibold text-red-400 mb-2">Détail des charges ({prop.chargesDetail.moisEcoules} mois)</p>
                          {[
                            { label: 'Charges copropriété', val: prop.chargesDetail.copro, detail: `${formatCurrency(prop.monthly_charges)}/mois × ${prop.chargesDetail.moisEcoules}` },
                            { label: 'Assurance', val: prop.chargesDetail.assurance, detail: `${formatCurrency(prop.insurance_annual)}/an × ${prop.chargesDetail.moisEcoules}/12` },
                            { label: 'Travaux & incidents', val: prop.chargesDetail.travaux, detail: 'payés sur la période' },
                            { label: 'Autres dépenses', val: prop.chargesDetail.depenses, detail: 'saisies manuellement' },
                          ].filter(r => r.val > 0).map(row => (
                            <div key={row.label} className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">{row.label} <span className="text-slate-600">({row.detail})</span></span>
                              <span className="text-red-400 font-mono font-medium">{formatCurrency(row.val)}</span>
                            </div>
                          ))}
                          {/* Taxe foncière avec toggle refacturation */}
                          {prop.property_tax > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 border-t border-red-500/10">
                              <div className="flex flex-col gap-0.5">
                                <span className={prop.chargesDetail.taxe_fonciere_refacturee ? 'line-through text-slate-600' : 'text-slate-400'}>
                                  Taxe foncière <span className="text-slate-600">({formatCurrency(prop.property_tax)}/an × {prop.chargesDetail.moisEcoules}/12)</span>
                                </span>
                                {prop.chargesDetail.taxe_fonciere_refacturee
                                  ? <span className="text-xs text-amber-400 font-medium">⚠ Refacturée au locataire — non déductible (clause du bail)</span>
                                  : prop.chargesDetail.teom_refacturee > 0
                                    ? <span className="text-xs text-amber-400 font-medium">dont {formatCurrency(prop.chargesDetail.teom_refacturee)} de TEOM récupérée sur le locataire — non déductible</span>
                                    : <span className="text-xs text-slate-600">Aucune refacturation sur ce bail</span>
                                }
                              </div>
                              <span className={`font-mono font-medium ${prop.chargesDetail.taxe_fonciere_refacturee ? 'line-through text-slate-600' : 'text-red-400'}`}>
                                {formatCurrency(prop.chargesDetail.taxe_fonciere_brute)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs border-t border-red-500/20 pt-1.5 mt-1">
                            <span className="text-slate-300 font-semibold">Total</span>
                            <span className="text-red-400 font-mono font-bold">{formatCurrency(sim.charges_deductibles)}</span>
                          </div>
                          {prop.monthly_charges === 0 && prop.property_tax === 0 && prop.insurance_annual === 0 && prop.chargesDetail.travaux === 0 && prop.chargesDetail.depenses === 0 && (
                            <p className="text-xs text-slate-500 mt-1">⚠️ Aucune charge renseignée sur la fiche bien. Complétez la fiche pour avoir un calcul précis.</p>
                          )}
                        </div>
                      )}
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
                <h3 className="font-display font-semibold text-[var(--text-primary)]">SCI — Formulaire 2072</h3>
              </div>
              {propData.filter(p => p.type === 'sci').map(prop => {
                const sim = calculateSciSimulation({
                  resultat_comptable: prop.recettes - prop.charges,
                  regime: prop.sci_regime ?? 'ir',
                  taux_marginal: tmi / 100,
                })
                return (
                  <div key={prop.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{prop.sci_name ?? prop.name}</p>
                      {prop.numero_fiscal && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-slate-400">
                          # {prop.numero_fiscal}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Résultat comptable</p>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(sim.resultat_comptable)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{prop.sci_regime === 'is' ? 'IS dû' : 'Quote-part IR'}</p>
                        <p className="text-sm font-semibold text-amber-400">{formatCurrency(sim.is_du)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Dividendes distribuables</p>
                        <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(sim.dividendes_disponibles)}</p>
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

          {/* ── BAUX COMMERCIAUX ── */}
          {propData.filter(p => p.type === 'commerce').length > 0 && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <ProfileBadge type="commerce" />
                <h3 className="font-display font-semibold text-[var(--text-primary)]">Baux commerciaux — Revenus fonciers</h3>
              </div>
              <div className="space-y-3">
                {propData.filter(p => p.type === 'commerce').map(prop => {
                  const chargesDeductibles = prop.charges
                  const revenuNet = prop.recettes - chargesDeductibles
                  const impotEstime = Math.max(0, revenuNet * (tmi / 100))
                  return (
                    <div key={prop.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{prop.name}</p>
                        {prop.numero_fiscal && (
                          <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-slate-400">
                            # {prop.numero_fiscal}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Loyers bruts</p>
                          <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(prop.recettes)}</p>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedCharges(expandedCharges === prop.id ? null : prop.id)}
                            className="text-left w-full"
                          >
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              Charges déductibles
                              <ChevronDown className={`h-3 w-3 transition-transform ${expandedCharges === prop.id ? 'rotate-180' : ''}`} />
                            </p>
                            <p className="text-sm font-semibold text-red-400">{formatCurrency(chargesDeductibles)}</p>
                          </button>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Revenu net foncier</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(revenuNet)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Impôt estimé ({tmi}%)</p>
                          <p className="text-sm font-semibold text-amber-400">{formatCurrency(impotEstime)}</p>
                        </div>
                      </div>
                      {expandedCharges === prop.id && (
                        <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15 space-y-1.5">
                          <p className="text-xs font-semibold text-red-400 mb-2">Détail des charges ({prop.chargesDetail.moisEcoules} mois)</p>
                          {[
                            { label: 'Charges copropriété', val: prop.chargesDetail.copro, detail: `${formatCurrency(prop.monthly_charges)}/mois × ${prop.chargesDetail.moisEcoules}` },
                            { label: 'Assurance', val: prop.chargesDetail.assurance, detail: `${formatCurrency(prop.insurance_annual)}/an × ${prop.chargesDetail.moisEcoules}/12` },
                            { label: 'Travaux & incidents', val: prop.chargesDetail.travaux, detail: 'payés sur la période' },
                            { label: 'Autres dépenses', val: prop.chargesDetail.depenses, detail: 'saisies manuellement' },
                          ].filter(r => r.val > 0).map(row => (
                            <div key={row.label} className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">{row.label} <span className="text-slate-600">({row.detail})</span></span>
                              <span className="text-red-400 font-mono font-medium">{formatCurrency(row.val)}</span>
                            </div>
                          ))}
                          {prop.property_tax > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 border-t border-red-500/10">
                              <div className="flex flex-col gap-0.5">
                                <span className={prop.chargesDetail.taxe_fonciere_refacturee ? 'line-through text-slate-600' : 'text-slate-400'}>
                                  Taxe foncière <span className="text-slate-600">({formatCurrency(prop.property_tax)}/an × {prop.chargesDetail.moisEcoules}/12)</span>
                                </span>
                                {prop.chargesDetail.taxe_fonciere_refacturee
                                  ? <span className="text-xs text-amber-400 font-medium">⚠ Refacturée au locataire — non déductible (clause du bail)</span>
                                  : prop.chargesDetail.teom_refacturee > 0
                                    ? <span className="text-xs text-amber-400 font-medium">dont {formatCurrency(prop.chargesDetail.teom_refacturee)} de TEOM récupérée sur le locataire — non déductible</span>
                                    : <span className="text-xs text-slate-600">Aucune refacturation sur ce bail</span>
                                }
                              </div>
                              <span className={`font-mono font-medium ${prop.chargesDetail.taxe_fonciere_refacturee ? 'line-through text-slate-600' : 'text-red-400'}`}>
                                {formatCurrency(prop.chargesDetail.taxe_fonciere_brute)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs border-t border-red-500/20 pt-1.5 mt-1">
                            <span className="text-slate-300 font-semibold">Total</span>
                            <span className="text-red-400 font-mono font-bold">{formatCurrency(chargesDeductibles)}</span>
                          </div>
                          {chargesDeductibles === 0 && (
                            <p className="text-xs text-slate-500 mt-1">⚠️ Aucune charge renseignée sur la fiche bien. Complétez la fiche pour avoir un calcul précis.</p>
                          )}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-500">
                        À reporter en revenus fonciers — formulaire 2044 (si régime réel) ou déclaration principale (micro-foncier si &lt; 15 000€/an)
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )}

          {properties.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-slate-400">Ajoutez des biens pour voir le tableau fiscal</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
