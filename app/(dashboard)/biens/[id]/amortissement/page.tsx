'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { DEPRECIATION_COMPONENTS } from '@/lib/fiscal/lmnp'
import { toast } from 'sonner'
import {
  Calculator, CheckCircle2, Info, Loader2, Plus, Printer,
  RotateCcw, Save, Trash2, TrendingDown, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/ui/BackButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type ComponentKey = keyof typeof DEPRECIATION_COMPONENTS

interface ComponentLine {
  key: ComponentKey
  value: string
  duration: string
  custom_label?: string
}

const COMPONENT_KEYS = Object.keys(DEPRECIATION_COMPONENTS) as ComponentKey[]

function pct(key: ComponentKey) {
  return DEPRECIATION_COMPONENTS[key].pct
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function annualAmount(value: number, duration: number): number {
  if (!duration || duration === 0) return 0
  return value / duration
}

function projectionRows(
  components: ComponentLine[],
  startYear: number,
  years: number = 20
) {
  return Array.from({ length: years }, (_, i) => {
    const year = startYear + i
    const total = components.reduce((sum, c) => {
      const cfg = DEPRECIATION_COMPONENTS[c.key]
      if (!cfg.amortissable) return sum
      const val = Number(c.value) || 0
      const dur = Number(c.duration) || cfg.duration
      if (!dur) return sum
      if (i < dur) return sum + val / dur
      return sum
    }, 0)
    return { year, total }
  })
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AmortissementPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [property, setProperty] = useState<any>(null)
  const [existingPlans, setExistingPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showProjection, setShowProjection] = useState(false)

  // Étape 1 — Inputs de base
  const [prixAchat, setPrixAchat] = useState('')
  const [fraisAcq, setFraisAcq] = useState('')
  const [valeurMobilier, setValeurMobilier] = useState('')
  const [dateAcq, setDateAcq] = useState('')
  const [loyerMensuel, setLoyerMensuel] = useState('')
  const [chargesAnnuelles, setChargesAnnuelles] = useState('')
  const [tmi, setTmi] = useState('30')
  const [pctTerrain, setPctTerrain] = useState('15')

  // Mode simplifié / détaillé
  const [modeSimple, setModeSimple] = useState(false)
  const [simpleValeurBien, setSimpleValeurBien] = useState('')
  const [simpleDuree, setSimpleDuree] = useState('30')

  // Étape 2 — Composants (modifiables)
  const [components, setComponents] = useState<ComponentLine[]>([])
  const [step, setStep] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('*, leases(monthly_rent, is_active)').eq('id', id).single(),
      supabase.from('depreciation_plans').select('*').eq('property_id', id).order('created_at'),
    ]).then(([{ data: prop }, { data: plans }]) => {
      setProperty(prop)
      setExistingPlans(plans ?? [])
      if (prop) {
        setPrixAchat(prop.purchase_price ? String(prop.purchase_price) : '')
        const activeRent = prop.leases?.find((l: any) => l.is_active)?.monthly_rent
        if (activeRent) setLoyerMensuel(String(activeRent))
        if (prop.purchase_year) setDateAcq(`${prop.purchase_year}-01-01`)
      }
      setLoading(false)
    })
  }, [id])

  // ── Calcul automatique de la ventilation ──
  const computeComponents = () => {
    const base = Number(prixAchat) || 0
    const terrain = base * (Number(pctTerrain) / 100)
    const amortissableBase = base - terrain
    const mobilier = Number(valeurMobilier) || 0
    const frais = Number(fraisAcq) || 0

    if (modeSimple) {
      // Mode simplifié : terrain + tout le reste ensemble + mobilier
      const valeurBien = Number(simpleValeurBien) || (amortissableBase + frais)
      setSimpleValeurBien(String(Math.round(valeurBien)))
      const lines: ComponentLine[] = [
        { key: 'gros_oeuvre', value: String(Math.round(valeurBien)), duration: simpleDuree },
        { key: 'mobilier',    value: String(mobilier), duration: String(DEPRECIATION_COMPONENTS.mobilier.duration) },
        { key: 'terrain',     value: String(Math.round(terrain)), duration: '0' },
      ]
      setComponents(lines)
    } else {
      const lines: ComponentLine[] = [
        { key: 'gros_oeuvre',   value: String(Math.round(amortissableBase * (50 / 85))), duration: String(DEPRECIATION_COMPONENTS.gros_oeuvre.duration) },
        { key: 'facade',        value: String(Math.round(amortissableBase * (10 / 85))), duration: String(DEPRECIATION_COMPONENTS.facade.duration) },
        { key: 'toiture',       value: String(Math.round(amortissableBase * (5  / 85))), duration: String(DEPRECIATION_COMPONENTS.toiture.duration) },
        { key: 'installations', value: String(Math.round(amortissableBase * (8  / 85))), duration: String(DEPRECIATION_COMPONENTS.installations.duration) },
        { key: 'agencement',    value: String(Math.round(amortissableBase * (12 / 85))), duration: String(DEPRECIATION_COMPONENTS.agencement.duration) },
        { key: 'mobilier',      value: String(mobilier), duration: String(DEPRECIATION_COMPONENTS.mobilier.duration) },
        { key: 'frais_acq',     value: String(frais),    duration: String(DEPRECIATION_COMPONENTS.frais_acq.duration) },
        { key: 'terrain',       value: String(Math.round(terrain)), duration: '0' },
      ]
      setComponents(lines)
    }
    setStep(2)
  }

  const updateComponent = (index: number, field: 'value' | 'duration', val: string) => {
    setComponents(cs => cs.map((c, i) => i === index ? { ...c, [field]: val } : c))
  }

  const totalAmortissable = components.reduce((s, c) => {
    const cfg = DEPRECIATION_COMPONENTS[c.key]
    return cfg.amortissable ? s + (Number(c.value) || 0) : s
  }, 0)

  const totalNonAmortissable = components
    .filter(c => !DEPRECIATION_COMPONENTS[c.key].amortissable)
    .reduce((s, c) => s + (Number(c.value) || 0), 0)

  const amortAnnuel = components.reduce((s, c) => {
    const cfg = DEPRECIATION_COMPONENTS[c.key]
    if (!cfg.amortissable) return s
    const dur = Number(c.duration) || cfg.duration
    return s + annualAmount(Number(c.value) || 0, dur)
  }, 0)

  const recettes = (Number(loyerMensuel) || 0) * 12
  const charges = Number(chargesAnnuelles) || 0
  const tmiVal = Number(tmi) / 100

  const resultatBIC = recettes - charges - amortAnnuel
  const impotReel = Math.max(0, resultatBIC) * tmiVal
  const microBicBase = recettes * 0.5
  const impotMicro = microBicBase * tmiVal
  const economie = impotMicro - impotReel

  const startYear = dateAcq ? new Date(dateAcq).getFullYear() : new Date().getFullYear()
  const projection = projectionRows(components, startYear, 30)

  // ── Sauvegarde en base ──
  const handleSave = async () => {
    setSaving(true)
    // Supprimer les plans existants
    await supabase.from('depreciation_plans').delete().eq('property_id', id)
    // Insérer les nouveaux
    const toInsert = components
      .filter(c => DEPRECIATION_COMPONENTS[c.key].amortissable && Number(c.value) > 0 && Number(c.duration) > 0)
      .map(c => ({
        property_id: id,
        component: c.key,
        value: Number(c.value),
        duration_years: Number(c.duration),
        start_date: dateAcq || `${new Date().getFullYear()}-01-01`,
      }))
    const { error } = await supabase.from('depreciation_plans').insert(toInsert)
    if (error) { toast.error(error.message); setSaving(false); return }
    setSaving(false)
    toast.success('Plan d\'amortissement sauvegardé')
    setStep(3)
    // Recharger les plans
    const { data } = await supabase.from('depreciation_plans').select('*').eq('property_id', id)
    setExistingPlans(data ?? [])
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <BackButton />

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-400" />
            Assistant d'amortissement LMNP
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{property?.name} · Régime réel</p>
        </div>
        {step === 3 && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 h-9 px-4 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-all"
          >
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>
        )}
      </div>

      {/* Bandeau info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-400/5 border border-blue-400/20">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-blue-400">Comment fonctionne l'amortissement LMNP ?</strong> En régime réel, vous pouvez déduire chaque année une fraction de la valeur de votre bien (hors terrain). Sur un appartement à 200 000€, l'amortissement peut représenter 4 000 à 6 000€/an déductibles — suffisant pour ramener votre résultat BIC à zéro et ne payer <strong className="text-blue-400">aucun impôt sur vos loyers</strong>.
        </div>
      </div>

      {/* ── ÉTAPE 1 — Saisie ── */}
      {step >= 1 && (
        <GlassCard className="p-6">
          <h2 className="font-display font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-400/20 text-blue-400 text-xs font-bold">1</span>
            Informations du bien
          </h2>

          {/* Mode selector — en premier */}
          <div className="mb-5 pb-5 border-b border-white/[0.06]">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Mode de ventilation</p>
            <p className="text-xs text-slate-500 mb-3">
              {modeSimple
                ? 'Simplifié — une seule valeur amortissable + durée au choix (15% terrain, 85% bien)'
                : 'Détaillé — ventilation par composants avec mobilier et frais de notaire séparés'}
            </p>
            <div className="flex items-center gap-2 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl w-fit">
              <button
                onClick={() => setModeSimple(false)}
                className={cn('px-4 h-9 rounded-lg text-sm font-semibold transition-all', !modeSimple ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-300')}
              >
                Détaillé
              </button>
              <button
                onClick={() => setModeSimple(true)}
                className={cn('px-4 h-9 rounded-lg text-sm font-semibold transition-all', modeSimple ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-300')}
              >
                Simplifié
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Prix d'achat (€) *</label>
              <input
                type="number"
                value={prixAchat}
                onChange={e => setPrixAchat(e.target.value)}
                placeholder="200000"
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
              />
              <p className="text-[10px] text-slate-600 mt-1">Hors frais de notaire</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Date d'acquisition *</label>
              <input
                type="date"
                value={dateAcq}
                onChange={e => setDateAcq(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
              />
              <p className="text-[10px] text-slate-600 mt-1">Détermine le début de l'amortissement</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Part du terrain (%)</label>
              <input
                type="number"
                min="5" max="40" step="1"
                value={pctTerrain}
                onChange={e => setPctTerrain(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
              />
              <p className="text-[10px] text-slate-600 mt-1">10-15% province · 20-25% Paris/Lyon · non amortissable</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Loyer mensuel (€)</label>
              <input
                type="number"
                value={loyerMensuel}
                onChange={e => setLoyerMensuel(e.target.value)}
                placeholder="800"
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
              />
              <p className="text-[10px] text-slate-600 mt-1">Pour calculer l'économie fiscale</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Charges annuelles (€)</label>
              <input
                type="number"
                value={chargesAnnuelles}
                onChange={e => setChargesAnnuelles(e.target.value)}
                placeholder="3000"
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
              />
              <p className="text-[10px] text-slate-600 mt-1">Charges courantes hors amortissement</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Taux marginal d'imposition (%)</label>
              <select
                value={tmi}
                onChange={e => setTmi(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none"
              >
                <option value="11">11% — 2ème tranche</option>
                <option value="30">30% — 3ème tranche</option>
                <option value="41">41% — 4ème tranche</option>
                <option value="45">45% — 5ème tranche</option>
              </select>
            </div>

            {/* Champs détaillé uniquement */}
            {!modeSimple && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Frais d'acquisition (€) *</label>
                  <input
                    type="number"
                    value={fraisAcq}
                    onChange={e => setFraisAcq(e.target.value)}
                    placeholder={prixAchat ? String(Math.round(Number(prixAchat) * 0.075)) : '15000'}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Notaire + agence (~7-8% du prix)</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Valeur du mobilier (€)</label>
                  <input
                    type="number"
                    value={valeurMobilier}
                    onChange={e => setValeurMobilier(e.target.value)}
                    placeholder="5000"
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Canapé, lit, électroménager... (inventaire)</p>
                </div>
              </>
            )}
          </div>

          {/* Mode simplifié — valeur + durée */}
          {modeSimple && (
            <div className="grid grid-cols-2 gap-3 mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Valeur amortissable (€)
                  <span className="ml-1 text-slate-600 font-normal">— tout sauf terrain</span>
                </label>
                <input
                  type="number"
                  step="1000"
                  value={simpleValeurBien}
                  onChange={e => setSimpleValeurBien(e.target.value)}
                  placeholder={prixAchat ? String(Math.round(Number(prixAchat) * (1 - Number(pctTerrain) / 100))) : ''}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-400/50"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Suggestion : {prixAchat ? formatCurrency(Math.round(Number(prixAchat) * (1 - Number(pctTerrain) / 100))) : '—'} (prix × {100 - Number(pctTerrain)}%)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Durée d'amortissement (ans)
                </label>
                <select
                  value={simpleDuree}
                  onChange={e => setSimpleDuree(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none"
                >
                  <option value="20">20 ans</option>
                  <option value="25">25 ans</option>
                  <option value="30">30 ans</option>
                  <option value="33">33 ans</option>
                  <option value="40">40 ans</option>
                  <option value="50">50 ans</option>
                </select>
                <p className="text-[10px] text-slate-600 mt-1">Pratique courante : 25-30 ans pour un appartement</p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button
              onClick={computeComponents}
              disabled={!prixAchat || !dateAcq || (!fraisAcq && !modeSimple)}
              className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Calculator className="h-4 w-4" />
              Calculer →
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── ÉTAPE 2 — Ventilation par composants ── */}
      {step >= 2 && components.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-400/20 text-emerald-400 text-xs font-bold">2</span>
              Ventilation par composants
            </h2>
            <button
              onClick={() => { setStep(1); setComponents([]) }}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Recalculer
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            {modeSimple
              ? 'Mode simplifié : terrain (non amortissable) + valeur du bien en un seul composant + mobilier. Ajustez si besoin.'
              : 'Répartition conforme aux normes comptables LMNP. Ajustez les valeurs si vous avez des justificatifs précis (devis, expertise).'}
          </p>

          <div className="space-y-2 mb-5">
            {/* En-tête */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide px-3">
              <div className="col-span-4">Composant</div>
              <div className="col-span-3 text-right">Valeur (€)</div>
              <div className="col-span-2 text-center">Durée (ans)</div>
              <div className="col-span-3 text-right">Amort./an</div>
            </div>

            {components.map((c, idx) => {
              const cfg = DEPRECIATION_COMPONENTS[c.key]
              const val = Number(c.value) || 0
              const dur = Number(c.duration) || cfg.duration
              const annual = cfg.amortissable && dur > 0 ? val / dur : 0
              return (
                <div
                  key={c.key}
                  className={cn(
                    'grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl border transition-all',
                    cfg.amortissable
                      ? 'border-white/[0.06] bg-white/[0.02]'
                      : 'border-amber-400/10 bg-amber-400/5 opacity-60'
                  )}
                >
                  <div className="col-span-4 flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', cfg.color)} />
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {modeSimple && c.key === 'gros_oeuvre' ? 'Bien immobilier (global)' : cfg.label}
                      </p>
                      {!cfg.amortissable && (
                        <p className="text-[10px] text-amber-400">Non amortissable</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={c.value}
                      onChange={e => updateComponent(idx, 'value', e.target.value)}
                      className="w-full h-8 px-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[var(--text-primary)] text-xs text-right focus:outline-none focus:border-blue-400/40"
                    />
                  </div>
                  <div className="col-span-2">
                    {cfg.amortissable ? (
                      <input
                        type="number"
                        value={c.duration}
                        onChange={e => updateComponent(idx, 'duration', e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[var(--text-primary)] text-xs text-center focus:outline-none focus:border-blue-400/40"
                      />
                    ) : (
                      <p className="text-xs text-center text-slate-600">—</p>
                    )}
                  </div>
                  <div className="col-span-3 text-right">
                    {cfg.amortissable && annual > 0 ? (
                      <span className="text-sm font-semibold font-mono text-emerald-400">
                        {formatCurrency(annual)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Total */}
            <div className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl border-2 border-emerald-400/30 bg-emerald-400/5 mt-2">
              <div className="col-span-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Total amortissable</p>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-sm font-mono text-slate-300">{formatCurrency(totalAmortissable)}</span>
              </div>
              <div className="col-span-2" />
              <div className="col-span-3 text-right">
                <span className="text-base font-bold font-mono text-emerald-400">{formatCurrency(amortAnnuel)}</span>
                <p className="text-[10px] text-slate-500">/an déductible</p>
              </div>
            </div>
          </div>

          {/* KPIs fiscaux */}
          {recettes > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-slate-500 mb-1">Résultat BIC annuel</p>
                <p className={cn('text-lg font-bold font-mono', resultatBIC <= 0 ? 'text-blue-400' : 'text-amber-400')}>
                  {formatCurrency(resultatBIC)}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {resultatBIC <= 0 ? '✓ Déficit — impôt nul' : '⚠ Bénéfice imposable'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-slate-500 mb-1">Impôt estimé (réel)</p>
                <p className="text-lg font-bold font-mono text-[var(--success)]">{formatCurrency(impotReel)}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">vs {formatCurrency(impotMicro)} en micro-BIC</p>
              </div>
              <div className={cn('p-3 rounded-xl border', economie > 0 ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-white/[0.03] border-white/[0.06]')}>
                <p className="text-xs text-slate-500 mb-1">Économie fiscale/an</p>
                <p className={cn('text-lg font-bold font-mono', economie > 0 ? 'text-emerald-400' : 'text-slate-400')}>
                  {economie > 0 ? '+' : ''}{formatCurrency(economie)}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">réel vs micro-BIC</p>
              </div>
            </div>
          )}

          {amortAnnuel < recettes * 0.3 && recettes > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                L'amortissement annuel ({formatCurrency(amortAnnuel)}) est inférieur à 30% des recettes. Vérifiez que la valeur du mobilier et les frais d'acquisition sont bien renseignés — ils augmentent significativement la déduction.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || totalAmortissable === 0}
              className="flex items-center gap-2 h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all disabled:opacity-40"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
                : <><Save className="h-4 w-4" /> Valider et générer le dossier</>
              }
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── ÉTAPE 3 — Dossier complet ── */}
      {step === 3 && (
        <div className="space-y-4" id="dossier-amortissement">
          {/* Résumé exécutif */}
          <GlassCard className="p-6 border-emerald-400/20">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="font-display font-semibold text-[var(--text-primary)]">
                Dossier d'amortissement — {property?.name}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Date d\'acquisition', value: dateAcq ? new Date(dateAcq).toLocaleDateString('fr-FR') : '—' },
                { label: 'Prix d\'achat', value: formatCurrency(Number(prixAchat)) },
                { label: 'Total amortissable', value: formatCurrency(totalAmortissable) },
                { label: 'Terrain (non amort.)', value: formatCurrency(totalNonAmortissable) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/[0.03] rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
              <div>
                <p className="text-sm font-semibold text-emerald-400">Amortissement annuel total</p>
                <p className="text-xs text-slate-500 mt-0.5">À déduire chaque année de votre résultat BIC</p>
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(amortAnnuel)}</p>
            </div>
          </GlassCard>

          {/* Tableau détaillé par composant */}
          <GlassCard className="p-6">
            <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">
              Détail de la ventilation par composants
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs text-slate-500">
                    <th className="text-left py-2 pr-4 font-medium">Composant</th>
                    <th className="text-right py-2 px-3 font-medium">Valeur</th>
                    <th className="text-right py-2 px-3 font-medium">% du total</th>
                    <th className="text-right py-2 px-3 font-medium">Durée</th>
                    <th className="text-right py-2 px-3 font-medium">Annuité</th>
                    <th className="text-right py-2 pl-3 font-medium">Fin en</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map(c => {
                    const cfg = DEPRECIATION_COMPONENTS[c.key]
                    const val = Number(c.value) || 0
                    const dur = Number(c.duration) || cfg.duration
                    const annual = cfg.amortissable && dur > 0 ? val / dur : 0
                    const totalBase = Number(prixAchat) + Number(fraisAcq)
                    const pctVal = totalBase > 0 ? (val / totalBase) * 100 : 0
                    const finEn = cfg.amortissable && dur > 0 ? startYear + dur : null
                    return (
                      <tr key={c.key} className="border-b border-white/[0.04]">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full flex-shrink-0', cfg.color)} />
                            <span className={cfg.amortissable ? 'text-[var(--text-primary)]' : 'text-amber-400'}>
                          {modeSimple && c.key === 'gros_oeuvre' ? 'Bien immobilier (global)' : cfg.label}
                        </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">{formatCurrency(val)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{pctVal.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">{cfg.amortissable && dur > 0 ? `${dur} ans` : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                          {annual > 0 ? formatCurrency(annual) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-2.5 pl-3 text-right text-slate-500">{finEn ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/[0.08]">
                    <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">TOTAL AMORTISSABLE</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-300">{formatCurrency(totalAmortissable)}</td>
                    <td colSpan={2} />
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-base">{formatCurrency(amortAnnuel)}/an</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </GlassCard>

          {/* Impact fiscal */}
          {recettes > 0 && (
            <GlassCard className="p-6">
              <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">
                Simulation fiscale annuelle
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Recettes locatives', val: recettes, color: 'text-[var(--success)]', sign: '+' },
                  { label: 'Charges déductibles', val: -charges, color: 'text-red-400', sign: '' },
                  { label: 'Amortissements (LMNP réel)', val: -amortAnnuel, color: 'text-blue-400', sign: '' },
                ].map(({ label, val, color, sign }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className={cn('text-sm font-semibold font-mono', color)}>
                      {val >= 0 ? sign : ''}{formatCurrency(Math.abs(val))} {val < 0 && '(-)'}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 rounded-xl px-3 mt-2" style={{ background: resultatBIC <= 0 ? 'rgba(96,165,250,0.05)' : 'rgba(251,191,36,0.05)', border: `1px solid ${resultatBIC <= 0 ? 'rgba(96,165,250,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                  <span className="text-sm font-bold text-[var(--text-primary)]">Résultat BIC imposable</span>
                  <span className={cn('text-lg font-bold font-mono', resultatBIC <= 0 ? 'text-blue-400' : 'text-amber-400')}>
                    {formatCurrency(resultatBIC)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-xs text-slate-500 mb-1">Impôt régime réel (TMI {tmi}%)</p>
                    <p className="text-xl font-bold font-mono text-[var(--success)]">{formatCurrency(impotReel)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-center">
                    <p className="text-xs text-slate-500 mb-1">Impôt micro-BIC (50% abattement)</p>
                    <p className="text-xl font-bold font-mono text-amber-400">{formatCurrency(impotMicro)}</p>
                  </div>
                </div>
                {economie > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/30 mt-2">
                    <div>
                      <p className="text-sm font-bold text-emerald-400">Économie fiscale annuelle</p>
                      <p className="text-xs text-slate-500 mt-0.5">Grâce au régime réel avec amortissement</p>
                    </div>
                    <p className="text-2xl font-bold font-mono text-emerald-400">+{formatCurrency(economie)}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Projection 30 ans */}
          <GlassCard className="p-6">
            <button
              onClick={() => setShowProjection(v => !v)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-400" />
                Projection des amortissements sur 30 ans
              </h3>
              {showProjection ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {showProjection && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-500">
                      <th className="text-left py-2 font-medium">Année</th>
                      <th className="text-right py-2 font-medium">Amort. annuel</th>
                      <th className="text-right py-2 font-medium">Cumul amorti</th>
                      <th className="text-right py-2 font-medium">Valeur nette comptable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.map((row, i) => {
                      const cumul = projection.slice(0, i + 1).reduce((s, r) => s + r.total, 0)
                      const vnc = totalAmortissable - cumul
                      return (
                        <tr key={row.year} className={cn('border-b border-white/[0.04]', row.year === new Date().getFullYear() ? 'bg-blue-400/5' : '')}>
                          <td className="py-1.5 font-medium text-slate-300">
                            {row.year}
                            {row.year === new Date().getFullYear() && <span className="ml-1.5 text-[10px] text-blue-400">← aujourd'hui</span>}
                          </td>
                          <td className="py-1.5 text-right font-mono text-emerald-400">{row.total > 0 ? formatCurrency(row.total) : '—'}</td>
                          <td className="py-1.5 text-right font-mono text-slate-400">{formatCurrency(Math.min(cumul, totalAmortissable))}</td>
                          <td className="py-1.5 text-right font-mono text-slate-400">{formatCurrency(Math.max(0, vnc))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* Mentions légales / notes comptables */}
          <GlassCard className="p-5">
            <h3 className="font-display font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-400" />
              Notes comptables & obligations LMNP réel
            </h3>
            <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
              <p>• <strong className="text-slate-400">Déclaration 2031</strong> (liasse BIC) à déposer avant le 2ème jour ouvré suivant le 1er mai.</p>
              <p>• <strong className="text-slate-400">Régime d'imposition</strong> : les amortissements ne peuvent pas créer de déficit reportable (limités au bénéfice). Ils sont mis en <em>stock</em> et utilisés les années bénéficiaires.</p>
              <p>• <strong className="text-slate-400">Ventilation terrain</strong> : l'administration fiscale retient généralement 10-20% du prix selon la localisation. En cas de contrôle, une estimation notariale peut être demandée.</p>
              <p>• <strong className="text-slate-400">Mobilier</strong> : un inventaire valorisé et signé est recommandé. Conservez les factures d'achat du mobilier.</p>
              <p>• <strong className="text-slate-400">Frais d'acquisition</strong> : notaire + agence immobilière. Amortissables sur 40 ans (ou déductibles en charges l'année d'acquisition selon votre choix).</p>
              <p>• <strong className="text-slate-400">Première année</strong> : l'amortissement est proratisé selon la date d'acquisition (ex: acquisition le 1er juillet = 50% de l'annuité).</p>
              <p>• Ce document est un aide-mémoire. Pour une liasse fiscale 2031 complète, l'assistance d'un expert-comptable est recommandée.</p>
            </div>
          </GlassCard>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Modifier la ventilation
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 h-10 px-5 rounded-xl border border-white/[0.08] text-sm text-slate-300 hover:bg-white/[0.04] transition-all"
            >
              <Printer className="h-4 w-4" /> Imprimer / Exporter PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
