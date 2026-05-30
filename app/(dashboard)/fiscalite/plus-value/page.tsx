'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatPct } from '@/lib/utils'
import { calculatePlusValue, PALIERS_ABATTEMENT } from '@/lib/fiscal/plus-value'
import { differenceInYears } from 'date-fns'
import { ChevronLeft, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function PlusValuePage() {
  const [properties, setProperties] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [incidents, setIncidents] = useState<any[]>([])
  const supabase = createClient()

  const [form, setForm] = useState({
    prix_achat: '',
    frais_acquisition_pct: '7.5',
    frais_acquisition_montant: '',
    use_forfait: true,
    travaux_non_deductibles: '',
    prix_vente: '',
    date_acquisition: '',
    date_vente: new Date().toISOString().split('T')[0],
    amortissements_pris: '',
  })

  useEffect(() => {
    supabase.from('properties').select('id, name, type, purchase_price, purchase_year, depreciation_plans(*)').order('name').then(r => setProperties(r.data ?? []))
    supabase.from('incidents').select('*').then(r => setIncidents(r.data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const prop = properties.find(p => p.id === selectedId)
    if (!prop) return
    setForm(f => ({
      ...f,
      prix_achat: String(prop.purchase_price ?? ''),
      date_acquisition: prop.purchase_year ? `${prop.purchase_year}-01-01` : '',
    }))
  }, [selectedId, properties])

  const prop = properties.find(p => p.id === selectedId)
  const travaux_nd = incidents
    .filter(i => i.property_id === selectedId && i.categorie_fiscale === 'construction_agrandissement' && i.est_paye)
    .reduce((s, i) => s + (i.cout_paye || 0), 0)

  const prixAchat = Number(form.prix_achat) || 0
  const fraisAcq = form.use_forfait
    ? prixAchat * (Number(form.frais_acquisition_pct) / 100)
    : Number(form.frais_acquisition_montant) || 0

  const canCalcul = prixAchat > 0 && Number(form.prix_vente) > 0 && form.date_acquisition && form.date_vente

  const result = canCalcul ? calculatePlusValue({
    prix_achat: prixAchat,
    frais_acquisition: fraisAcq,
    travaux_non_deductibles: travaux_nd + Number(form.travaux_non_deductibles || 0),
    prix_vente: Number(form.prix_vente),
    date_acquisition: new Date(form.date_acquisition),
    date_vente: new Date(form.date_vente),
    type_bien: (prop?.type ?? 'nu') as any,
    amortissements_pris: Number(form.amortissements_pris) || 0,
  }) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/fiscalite" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-[var(--text-primary)]">
          <ChevronLeft className="h-4 w-4" /> Fiscalité
        </Link>
        <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Simulateur plus-value</h1>
      </div>

      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Données du bien</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Bien (optionnel — pré-remplit les champs)</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
              <option value="" className="bg-[var(--surface)]">Saisie manuelle</option>
              {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'prix_achat', label: "Prix d'acquisition (€)", type: 'number', placeholder: '200000' },
              { key: 'prix_vente', label: 'Prix de vente estimé (€)', type: 'number', placeholder: '280000' },
              { key: 'date_acquisition', label: "Date d'acquisition", type: 'date' },
              { key: 'date_vente', label: 'Date de vente estimée', type: 'date' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type={type} placeholder={placeholder} value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Frais d'acquisition</label>
            <div className="flex gap-3 mb-2">
              <button onClick={() => setForm(f => ({ ...f, use_forfait: true }))}
                className={`flex-1 h-9 rounded-lg text-sm transition-all ${form.use_forfait ? 'bg-blue-500 text-white' : 'bg-white/[0.05] border border-white/[0.08] text-slate-400'}`}>
                Forfait 7,5%
              </button>
              <button onClick={() => setForm(f => ({ ...f, use_forfait: false }))}
                className={`flex-1 h-9 rounded-lg text-sm transition-all ${!form.use_forfait ? 'bg-blue-500 text-white' : 'bg-white/[0.05] border border-white/[0.08] text-slate-400'}`}>
                Montant réel
              </button>
            </div>
            {form.use_forfait ? (
              <p className="text-xs text-slate-500">Forfait : {formatCurrency(fraisAcq)} (7,5% × {formatCurrency(prixAchat)})</p>
            ) : (
              <input type="number" placeholder="Frais réels en €" value={form.frais_acquisition_montant}
                onChange={e => setForm(f => ({ ...f, frais_acquisition_montant: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Travaux non déductibles (€) — saisis manuellement</label>
              <input type="number" placeholder="0" value={form.travaux_non_deductibles}
                onChange={e => setForm(f => ({ ...f, travaux_non_deductibles: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none" />
              {travaux_nd > 0 && <p className="text-xs text-blue-400 mt-0.5">+ {formatCurrency(travaux_nd)} détectés automatiquement (construction)</p>}
            </div>
            {prop?.type === 'lmnp' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amortissements cumulés pris (€)</label>
                <input type="number" placeholder="0" value={form.amortissements_pris}
                  onChange={e => setForm(f => ({ ...f, amortissements_pris: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none" />
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {result && (
        <>
          <GlassCard glow={result.exonere_ir && result.exonere_ps ? 'green' : 'amber'}>
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Résultat de la simulation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Prix de revient', value: formatCurrency(result.prix_revient), color: 'text-[var(--text-primary)]' },
                { label: 'Plus-value brute', value: formatCurrency(result.pv_brute), color: result.pv_brute > 0 ? 'text-amber-400' : 'text-blue-400' },
                { label: 'Impôt total', value: formatCurrency(result.impot_total), color: 'text-red-400' },
                { label: 'Net vendeur', value: formatCurrency(result.net_vendeur), color: 'text-[var(--success)]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/[0.03] rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400">Détail de la fiscalité — {result.annees_detention} ans de détention</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: `IR 19% — abattement ${result.abattement_ir_pct}%`, base: result.pv_imposable_ir, impot: result.impot_ir, exo: result.exonere_ir, exo_label: 'Exonéré IR (22 ans+)' },
                  { label: `PS 17,2% — abattement ${result.abattement_ps_pct}%`, base: result.pv_imposable_ps, impot: result.impot_ps, exo: result.exonere_ps, exo_label: 'Exonéré PS (30 ans+)' },
                ].map(({ label, base, impot, exo, exo_label }) => (
                  <div key={label} className={`p-4 rounded-xl border ${exo ? 'border-[var(--success)/20] bg-green-400/5' : 'border-white/[0.08] bg-white/[0.03]'}`}>
                    <p className="text-xs text-slate-500 mb-2">{label}</p>
                    {exo ? (
                      <p className="text-sm font-semibold text-[var(--success)] flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> {exo_label}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500">Base imposable : {formatCurrency(base)}</p>
                        <p className="text-base font-bold text-red-400 mt-0.5">{formatCurrency(impot)}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {result.note_lmnp && (
              <div className="mt-3 p-3 rounded-lg bg-blue-400/5 border border-blue-400/20">
                <p className="text-xs text-blue-400">{result.note_lmnp}</p>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Paliers d'abattement</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                    <th className="text-left py-2 px-3">Années</th>
                    <th className="text-left py-2 px-3">Abattement IR</th>
                    <th className="text-left py-2 px-3">Abattement PS</th>
                    <th className="text-left py-2 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {PALIERS_ABATTEMENT.map((p, i) => {
                    const isCurrent = result.annees_detention >= p.annee && (i === PALIERS_ABATTEMENT.length - 1 || result.annees_detention < PALIERS_ABATTEMENT[i + 1].annee)
                    return (
                      <tr key={p.annee} className={`border-b border-white/[0.04] ${isCurrent ? 'bg-blue-500/10' : ''}`}>
                        <td className="py-2 px-3 text-slate-300">{p.label}</td>
                        <td className="py-2 px-3 text-[var(--success)]">{p.ir}%</td>
                        <td className="py-2 px-3 text-cyan-400">{p.ps}%</td>
                        <td className="py-2 px-3">
                          {isCurrent && <span className="text-xs text-blue-400 font-medium">← Votre situation</span>}
                          {p.ir >= 100 && p.ps >= 100 && <span className="text-xs text-[var(--success)]">Exonération totale</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
        <p className="text-xs text-slate-500">
          ⚠️ Simulation indicative — consulter un notaire pour le calcul définitif. Les abattements s'appliquent uniquement aux résidences secondaires et investissements locatifs. La résidence principale est exonérée.
        </p>
      </div>
    </div>
  )
}
