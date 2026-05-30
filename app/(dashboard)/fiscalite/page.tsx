'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { SimulationCard } from '@/components/fiscalite/SimulationCard'
import { AmortissementTable } from '@/components/fiscalite/AmortissementTable'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { calculateLmnpSimulation, calculateDepreciation } from '@/lib/fiscal/lmnp'
import { calculateFoncierSimulation } from '@/lib/fiscal/foncier'
import { calculateSciSimulation } from '@/lib/fiscal/sci'
import { IRL_CURRENT, ILC_CURRENT, ILAT_CURRENT, getQuarterLabel } from '@/lib/fiscal/indices'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronDown, ChevronRight, Copy, CheckCircle, AlertTriangle,
  Clock, CalendarDays, Paperclip, CheckCircle2, XCircle
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────

interface PropData {
  id: string
  name: string
  type: string
  numero_fiscal: string | null
  lmnp_regime: string | null
  sci_regime: string | null
  sci_name: string | null
  sci_associates: any[]
  revenus: number
  charges: number
  travaux_deductibles: number
  amortissements: number
  resultat: number
  impot: number
  raw: any
}

// ─── Utilitaires ─────────────────────────────────────────────────────────

const YEARS = [2026, 2025, 2024, 2023, 2022]

function CopyButton({ value }: { value: number }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value.toFixed(2))
    setCopied(true)
    toast.success(`${value.toFixed(2)} € copié`)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-white/[0.06] hover:bg-blue-500/15 border border-white/[0.08] hover:border-blue-500/30 text-xs text-slate-400 hover:text-blue-400 transition-all"
    >
      {copied ? <CheckCircle className="h-3 w-3 text-[var(--success)]" /> : <Copy className="h-3 w-3" />}
      <span className="font-mono">{value.toFixed(2)} €</span>
    </button>
  )
}

function Accordion({ title, badge, children, defaultOpen = false }: {
  title: string; badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-white/[0.08] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <span className="font-display font-semibold text-[var(--text-primary)]">{title}</span>
          {badge}
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-3 bg-white/[0.01]">{children}</div>}
    </div>
  )
}

function DeclarationRow({ label, caseNum, value, note }: {
  label: string; caseNum?: string; value: number; note?: string
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          {caseNum && (
            <span className="flex-shrink-0 text-xs font-mono font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded">
              {caseNum}
            </span>
          )}
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        {note && <p className="text-xs text-slate-600 mt-0.5 ml-0">{note}</p>}
      </div>
      <CopyButton value={value} />
    </div>
  )
}

// ─── Calendrier fiscal ───────────────────────────────────────────────────

function CalendrierFiscal({ hasSci, hasLmnp, hasFoncier, year }: {
  hasSci: boolean; hasLmnp: boolean; hasFoncier: boolean; year: number
}) {
  const echeances = [
    { date: `${year}-01-15`, label: 'CFE (Cotisation Foncière des Entreprises)', sub: 'Si applicable — LMNP/SCI', applicable: hasLmnp || hasSci, icon: '🏛️' },
    { date: `${year}-03-31`, label: 'Clôture exercice SCI à l\'IS', sub: 'Si SCI à l\'IS avec clôture 31/12 — liasse fiscale', applicable: hasSci, icon: '📊' },
    { date: `${year}-05-15`, label: 'Déclaration revenus fonciers (2044)', sub: 'Location nue — dépôt formulaire 2044', applicable: hasFoncier, icon: '🏠' },
    { date: `${year}-05-15`, label: 'Déclaration SCI (2072)', sub: 'SCI IR et IS — délai identique', applicable: hasSci, icon: '🏢' },
    { date: `${year}-05-25`, label: 'Déclaration revenus (2042 + 2042-C-PRO)', sub: 'LMNP — cases 5ND/5NA/5NY', applicable: hasLmnp || hasFoncier, icon: '📋' },
    { date: `${year}-06-15`, label: '1er acompte IS', sub: 'SCI à l\'IS ou LMNP soumis à l\'IS', applicable: hasSci, icon: '💳' },
    { date: `${year}-09-15`, label: '2ème acompte IS', sub: 'SCI à l\'IS', applicable: hasSci, icon: '💳' },
    { date: `${year}-10-15`, label: 'Taxe foncière', sub: 'Avis de taxe foncière — tous biens', applicable: true, icon: '🏗️' },
    { date: `${year}-12-15`, label: 'Solde CFE + 3ème acompte IS', sub: 'CFE si > 3 000€ + acompte IS', applicable: hasLmnp || hasSci, icon: '💳' },
  ].filter(e => e.applicable)

  const now = new Date()

  return (
    <div className="space-y-2">
      {echeances.map((ech, i) => {
        const date = new Date(ech.date)
        const diff = differenceInDays(date, now)
        const isPast = diff < 0
        const isUrgent = diff >= 0 && diff <= 7
        const isProche = diff > 7 && diff <= 30

        const statusColor = isPast ? 'text-slate-600' : isUrgent ? 'text-red-400' : isProche ? 'text-amber-400' : 'text-slate-400'
        const statusBg = isPast ? 'bg-slate-800/50' : isUrgent ? 'bg-red-400/8 border-red-400/20' : isProche ? 'bg-amber-400/8 border-amber-400/20' : 'bg-white/[0.02] border-white/[0.06]'
        const badgeText = isPast ? 'Passé' : isUrgent ? `Urgent — J-${diff}` : isProche ? `Dans ${diff} jours` : `${format(date, 'd MMM', { locale: fr })}`
        const badgeColor = isPast ? 'text-slate-600 bg-white/[0.04]' : isUrgent ? 'text-red-400 bg-red-400/10 border-red-400/20' : isProche ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-slate-400 bg-white/[0.05]'

        return (
          <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${statusBg}`}>
            <div className="w-24 flex-shrink-0">
              <p className={`text-xs font-semibold ${statusColor}`}>
                {format(date, 'd MMM yyyy', { locale: fr })}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isPast ? 'text-slate-500' : 'text-slate-200'}`}>
                {ech.icon} {ech.label}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{ech.sub}</p>
            </div>
            <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${badgeColor}`}>
              {badgeText}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────

export default function FiscalitePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedPropId, setSelectedPropId] = useState('all')
  const [properties, setProperties] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tmi, setTmi] = useState(30)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [propRes, incRes] = await Promise.all([
        supabase.from('properties')
          .select('*, leases(*), expenses(*), depreciation_plans(*), sci_associates(*)')
          .order('name'),
        supabase.from('incidents')
          .select('*')
          .gte('created_at', `${year}-01-01`)
          .lte('created_at', `${year}-12-31`),
      ])
      setProperties(propRes.data ?? [])
      setIncidents(incRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [year])

  // Calcul par bien
  const buildPropData = (prop: any): PropData => {
    const expenses_ytd = (prop.expenses ?? []).filter((e: any) =>
      new Date(e.date).getFullYear() === year
    )
    const propIncidents = incidents.filter(i => i.property_id === prop.id && i.est_paye)
    const travaux_deductibles = propIncidents
      .filter(i => ['entretien_reparation', 'travaux_deductibles'].includes(i.categorie_fiscale ?? ''))
      .reduce((s: number, i: any) => s + (i.cout_paye || 0), 0)

    const revenus = (prop.leases ?? [])
      .filter((l: any) => l.is_active)
      .reduce((s: number, l: any) => s + (l.monthly_rent ?? 0) * 12, 0)

    const charges_courantes = expenses_ytd.reduce((s: number, e: any) => s + e.amount, 0)
      + prop.monthly_charges * 12 + prop.property_tax + prop.insurance_annual

    const amortissements = prop.type === 'lmnp'
      ? calculateDepreciation(prop.depreciation_plans ?? [])
      : 0

    const charges = charges_courantes + travaux_deductibles

    let resultat = 0
    let impot = 0

    if (prop.type === 'lmnp') {
      const sim = calculateLmnpSimulation({
        recettes: revenus, charges_reelles: charges,
        amortissements, taux_marginal: tmi / 100,
      })
      resultat = sim.resultat_bic
      impot = sim.impot_estime
    } else if (prop.type === 'nu') {
      const sim = calculateFoncierSimulation({
        revenus_bruts: revenus, charges_deductibles: charges,
        taux_marginal: tmi / 100,
      })
      resultat = sim.revenu_net
      impot = sim.reel_impot
    } else if (prop.type === 'sci') {
      const sim = calculateSciSimulation({
        resultat_comptable: revenus - charges,
        regime: prop.sci_regime ?? 'ir',
        taux_marginal: tmi / 100,
      })
      resultat = sim.resultat_comptable
      impot = sim.is_du
    } else {
      resultat = revenus - charges
      impot = Math.max(0, resultat) * (tmi / 100)
    }

    return {
      id: prop.id, name: prop.name, type: prop.type,
      numero_fiscal: prop.numero_fiscal, lmnp_regime: prop.lmnp_regime,
      sci_regime: prop.sci_regime, sci_name: prop.sci_name,
      sci_associates: prop.sci_associates ?? [],
      revenus, charges, travaux_deductibles, amortissements, resultat, impot,
      raw: prop,
    }
  }

  const allData = properties.map(buildPropData)
  const filtered = selectedPropId === 'all' ? allData : allData.filter(d => d.id === selectedPropId)

  const totaux = {
    revenus: filtered.reduce((s, d) => s + d.revenus, 0),
    charges: filtered.reduce((s, d) => s + d.charges, 0),
    travaux: filtered.reduce((s, d) => s + d.travaux_deductibles, 0),
    amortissements: filtered.reduce((s, d) => s + d.amortissements, 0),
    resultat: filtered.reduce((s, d) => s + d.resultat, 0),
    impot: filtered.reduce((s, d) => s + d.impot, 0),
  }

  const lmnpProps = filtered.filter(d => d.type === 'lmnp')
  const nuProps = filtered.filter(d => d.type === 'nu')
  const sciProps = filtered.filter(d => d.type === 'sci')

  const hasSci = sciProps.length > 0
  const hasLmnp = lmnpProps.length > 0
  const hasFoncier = nuProps.length > 0

  const regimeLabel = (d: PropData) => {
    if (d.type === 'lmnp') return d.lmnp_regime === 'reel' ? 'Réel' : 'Micro-BIC'
    if (d.type === 'nu') return d.revenus <= 15000 ? 'Micro-foncier' : 'Réel'
    if (d.type === 'sci') return `IS` === d.sci_regime?.toUpperCase() ? 'IS' : 'IR'
    return '—'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── En-tête + filtres ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Fiscalité</h1>
          <p className="text-slate-400 text-sm mt-1">Simulations · Déclarations · Calendrier fiscal</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur année */}
          <div className="flex gap-1.5">
            {YEARS.map(y => (
              <button key={y} onClick={() => setYear(y)}
                className={`h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                  year === y ? 'bg-blue-500 text-white' : 'bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-[var(--text-primary)]'
                }`}>
                {y}
              </button>
            ))}
          </div>
          {/* Sélecteur bien */}
          <select value={selectedPropId} onChange={e => setSelectedPropId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50 max-w-[180px]">
            <option value="all" className="bg-[var(--surface)]">Tous les biens</option>
            {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
          </select>
          {/* TMI */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">TMI</span>
            <select value={tmi} onChange={e => setTmi(Number(e.target.value))}
              className="h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
              {[11, 30, 41, 45].map(r => <option key={r} value={r} className="bg-[var(--surface)]">{r}%</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <p className="text-slate-400">Aucun bien pour cette sélection</p>
        </GlassCard>
      ) : (
        <>
          {/* ── BLOC 1 — Résumé par bien ── */}
          <GlassCard>
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Résumé par bien — {year}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                    {['Bien', 'N° fiscal', 'Type', 'Régime', 'Revenus bruts', 'Charges', 'Travaux déd.', 'Amortiss.', 'Résultat net', 'Impôt estimé'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-medium text-[var(--text-primary)]">{d.name}</p>
                        {d.sci_name && <p className="text-xs text-slate-500">{d.sci_name}</p>}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {d.numero_fiscal ?? <span className="text-slate-700">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        <ProfileBadge type={d.type as any} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-slate-300 text-xs">{regimeLabel(d)}</td>
                      <td className="py-3 px-3 text-[var(--success)] font-semibold">{formatCurrency(d.revenus)}</td>
                      <td className="py-3 px-3 text-red-400">{formatCurrency(d.charges)}</td>
                      <td className="py-3 px-3 text-blue-400">{d.travaux_deductibles > 0 ? formatCurrency(d.travaux_deductibles) : '—'}</td>
                      <td className="py-3 px-3 text-cyan-400">{d.amortissements > 0 ? formatCurrency(d.amortissements) : '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${d.resultat <= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {formatCurrency(d.resultat)}
                        </span>
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${d.resultat <= 0 ? 'bg-blue-400/10 text-blue-400' : 'bg-amber-400/10 text-amber-400'}`}>
                          {d.resultat <= 0 ? 'Déficit' : 'Bénéfice'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-amber-400 font-semibold">{formatCurrency(d.impot)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/[0.12] bg-white/[0.02]">
                    <td className="py-3 px-3 font-bold text-[var(--text-primary)]" colSpan={4}>TOTAL</td>
                    <td className="py-3 px-3 font-bold text-[var(--success)]">{formatCurrency(totaux.revenus)}</td>
                    <td className="py-3 px-3 font-bold text-red-400">{formatCurrency(totaux.charges)}</td>
                    <td className="py-3 px-3 font-bold text-blue-400">{totaux.travaux > 0 ? formatCurrency(totaux.travaux) : '—'}</td>
                    <td className="py-3 px-3 font-bold text-cyan-400">{totaux.amortissements > 0 ? formatCurrency(totaux.amortissements) : '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`font-bold text-base ${totaux.resultat <= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                        {formatCurrency(totaux.resultat)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-400 text-base">{formatCurrency(totaux.impot)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </GlassCard>

          {/* ── BLOC 2 — Ce que vous devez déclarer ── */}
          <div>
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-3">Ce que vous devez déclarer</h2>
            <div className="space-y-3">

              {/* Formulaire 2042-C-PRO */}
              {hasLmnp && (
                <Accordion title="Formulaire 2042-C-PRO" defaultOpen badge={
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--success-bg)] border border-[var(--success)/20] text-[var(--success)]">LMNP / LMP</span>
                }>
                  <p className="text-xs text-slate-500 mb-4">Revenus des locations meublées non professionnelles — à reporter sur votre 2042 principale</p>
                  {lmnpProps.map(d => {
                    const recettes = d.revenus
                    const sim = calculateLmnpSimulation({
                      recettes, charges_reelles: d.charges,
                      amortissements: d.amortissements, taux_marginal: tmi / 100,
                    })
                    const isReel = d.lmnp_regime === 'reel'
                    return (
                      <div key={d.id} className="mb-5">
                        <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                          {d.name}
                          <ProfileBadge type="lmnp" size="sm" />
                        </p>
                        {isReel ? (
                          <>
                            <DeclarationRow label="Bénéfice BIC non professionnel (régime réel)" caseNum="5NA" value={Math.max(0, sim.resultat_bic)}
                              note="Si résultat positif" />
                            <DeclarationRow label="Déficit BIC non professionnel reportable" caseNum="5NY" value={Math.abs(Math.min(0, sim.resultat_bic))}
                              note="Si résultat négatif" />
                          </>
                        ) : (
                          <DeclarationRow label="Revenus BIC non professionnels (micro-BIC 50%)" caseNum="5ND" value={recettes}
                            note={`Abattement forfaitaire 50% → base imposable : ${formatCurrency(sim.micro_bic_base)}`} />
                        )}
                      </div>
                    )
                  })}
                </Accordion>
              )}

              {/* Formulaire 2044 */}
              {hasFoncier && (
                <Accordion title="Formulaire 2044" badge={
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-400">Location nue</span>
                }>
                  <p className="text-xs text-slate-500 mb-4">Revenus fonciers (locations nues) — régime réel</p>
                  {nuProps.map(d => {
                    const sim = calculateFoncierSimulation({
                      revenus_bruts: d.revenus, charges_deductibles: d.charges, taux_marginal: tmi / 100,
                    })
                    return (
                      <div key={d.id} className="mb-5">
                        <p className="text-xs font-semibold text-slate-400 mb-2">{d.name}</p>
                        <DeclarationRow label="Revenus bruts" caseNum="Ligne 110" value={sim.revenus_bruts} />
                        <DeclarationRow label="Total des charges déductibles" caseNum="Ligne 220" value={sim.charges_deductibles} />
                        <DeclarationRow
                          label={sim.revenu_net >= 0 ? 'Revenu net foncier' : 'Déficit foncier'}
                          caseNum="Ligne 420"
                          value={Math.abs(sim.revenu_net)}
                          note={sim.revenu_net < 0
                            ? `Déficit imputable sur revenu global (plafond 10 700€/an) + ${formatCurrency(Math.max(0, Math.abs(sim.revenu_net) - 10700))} reportable`
                            : undefined}
                        />
                        {d.revenus <= 15000 && (
                          <div className="mt-2 p-3 rounded-lg bg-blue-400/5 border border-blue-400/20 text-xs text-blue-400">
                            ℹ️ Revenus ≤ 15 000€ : vous pouvez opter pour le <strong>micro-foncier</strong> (abattement 30% → base {formatCurrency(d.revenus * 0.7)})
                          </div>
                        )}
                      </div>
                    )
                  })}
                </Accordion>
              )}

              {/* Formulaire 2072 */}
              {hasSci && (
                <Accordion title="Formulaire 2072" badge={
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400">SCI</span>
                }>
                  <p className="text-xs text-slate-500 mb-4">
                    Déclaration de résultats de la SCI — à déposer avant le 2ème jour ouvré de mai
                  </p>
                  {sciProps.map(d => {
                    const sim = calculateSciSimulation({
                      resultat_comptable: d.revenus - d.charges,
                      regime: (d.sci_regime ?? 'ir') as 'ir' | 'is', taux_marginal: tmi / 100,
                    })
                    return (
                      <div key={d.id} className="mb-5">
                        <p className="text-xs font-semibold text-slate-400 mb-2">
                          {d.sci_name ?? d.name} ({d.sci_regime?.toUpperCase() ?? 'IR'})
                        </p>
                        <DeclarationRow label="Résultat de la société" value={sim.resultat_comptable} />
                        {d.sci_regime === 'is' ? (
                          <>
                            <DeclarationRow label="IS dû (15% jusqu'à 42 500€, 25% au-delà)" value={sim.is_du}
                              note="Acomptes : 15/03 · 15/06 · 15/09 · 15/12" />
                            <DeclarationRow label="Dividendes distribuables" value={sim.dividendes_disponibles} />
                          </>
                        ) : (
                          d.sci_associates.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-slate-500 mb-2">Quote-part par associé (à reporter sur leur 2044) :</p>
                              {d.sci_associates.map((a: any) => (
                                <DeclarationRow
                                  key={a.id}
                                  label={`${a.name} (${a.share_pct}%)`}
                                  value={Math.round(sim.resultat_comptable * a.share_pct / 100 * 100) / 100}
                                />
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )
                  })}
                  <div className="mt-3 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20 text-xs text-amber-300 space-y-1">
                    <p>⏰ <strong>SCI à l'IR :</strong> Déclaration 2072 avant le 15 mai — chaque associé déclare sa quote-part en revenus fonciers</p>
                    <p>⏰ <strong>SCI à l'IS :</strong> Liasse fiscale avant le 15 mai + acomptes IS trimestriels</p>
                  </div>
                </Accordion>
              )}

            </div>

            <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-xs text-slate-500 text-center">
                ⚠️ Ces montants sont des <strong className="text-slate-400">estimations calculées automatiquement</strong>. Faites-les vérifier par un expert-comptable avant toute déclaration fiscale. Les montants définitifs peuvent différer selon votre situation personnelle.
              </p>
            </div>
          </div>

          {/* ── BLOC 3 — Calendrier fiscal ── */}
          <div>
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-3">Calendrier fiscal {year}</h2>
            <GlassCard>
              <CalendrierFiscal hasSci={hasSci} hasLmnp={hasLmnp} hasFoncier={hasFoncier} year={year} />
            </GlassCard>
          </div>

          {/* Indices */}
          <GlassCard>
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Indices de référence ({getQuarterLabel()})</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'IRL (Loyers habitation)', value: IRL_CURRENT, color: 'text-blue-400' },
                { label: 'ILC (Loyers commerciaux)', value: ILC_CURRENT, color: 'text-cyan-400' },
                { label: 'ILAT (Activités tertiaires)', value: ILAT_CURRENT, color: 'text-[var(--success)]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/[0.03] rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
                  <p className="text-xs text-slate-600 mt-1">Référence {getQuarterLabel()}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
