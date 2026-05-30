'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw, MapPin, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { toast } from 'sonner'

interface Estimation {
  property_id: string
  // Valeur
  valeur_estimee: number
  valeur_basse: number
  valeur_haute: number
  prix_m2_moyen: number
  tendance_annuelle: number
  // Loyers
  loyer_marche_mensuel: number
  loyer_marche_m2: number
  loyer_bas: number
  loyer_haut: number
  // Méta
  source: string
  date_reference: string
  loading: boolean
}

function CompareBar({ label, actual, market, unite = '€' }: {
  label: string; actual: number | null; market: number; unite?: string
}) {
  if (!actual) return null
  const diff = actual - market
  const pct = Math.round((diff / market) * 100)
  const isOver = diff > 0
  const isNear = Math.abs(pct) <= 5

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-1.5">
          {isNear ? (
            <span className="flex items-center gap-1 text-slate-400"><Minus className="h-3 w-3" /> Dans la moyenne</span>
          ) : isOver ? (
            <span className="flex items-center gap-1 text-[var(--success)]"><ArrowUp className="h-3 w-3" /> +{pct}% vs marché</span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400"><ArrowDown className="h-3 w-3" /> {pct}% vs marché</span>
          )}
        </div>
      </div>
      <div className="relative h-6 bg-white/[0.05] rounded-lg overflow-hidden">
        {/* Barre marché */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center px-2 justify-between">
          <span className="text-xs text-slate-600 z-10">{market.toLocaleString('fr-FR')} {unite} marché</span>
          <span className="text-xs font-semibold text-[var(--text-primary)] z-10">{actual.toLocaleString('fr-FR')} {unite} actuel</span>
        </div>
        {/* Indicateur position */}
        <div
          className={`absolute top-0 bottom-0 rounded-lg transition-all ${isNear ? 'bg-blue-500/20' : isOver ? 'bg-green-500/20' : 'bg-amber-500/20'}`}
          style={{ width: `${Math.min(100, Math.max(10, 50 + (pct / 2)))}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-4 w-1 rounded-full ${isNear ? 'bg-blue-400' : isOver ? 'bg-green-400' : 'bg-amber-400'}`}
          style={{ left: `${Math.min(96, Math.max(2, 50 + (pct / 2)))}%` }}
        />
      </div>
    </div>
  )
}

export default function PatrimoinePage() {
  const [properties, setProperties] = useState<any[]>([])
  const [estimations, setEstimations] = useState<Record<string, Estimation>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, leases(monthly_rent, is_active)')
        .order('created_at')
      setProperties(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const estimerBien = async (prop: any) => {
    if (!prop.postal_code || !prop.surface_m2) {
      toast.error('Code postal et surface requis')
      return
    }
    setEstimations(prev => ({ ...prev, [prop.id]: { ...prev[prop.id], property_id: prop.id, loading: true } as Estimation }))

    const res = await fetch('/api/dvf/estimation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: prop.id, city: prop.city ?? '', postal_code: prop.postal_code, surface_m2: prop.surface_m2 }),
    })

    if (res.ok) {
      const data = await res.json()
      setEstimations(prev => ({ ...prev, [prop.id]: { ...data, property_id: prop.id, loading: false } }))
    } else {
      toast.error('Erreur estimation')
      setEstimations(prev => ({ ...prev, [prop.id]: { ...prev[prop.id], loading: false } as Estimation }))
    }
  }

  const estimerTout = async () => {
    for (const prop of properties.filter(p => p.postal_code && p.surface_m2)) {
      await estimerBien(prop)
    }
  }

  const totalAchat = properties.reduce((s, p) => s + (p.purchase_price ?? 0), 0)
  const totalEstime = Object.values(estimations).reduce((s, e) => s + (e.valeur_estimee ?? 0), 0)
  const plusValueLatente = totalEstime > 0 ? totalEstime - totalAchat : null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Valorisation patrimoine</h1>
          <p className="text-slate-400 text-sm mt-1">Prix marché récents · Loyers de référence · Plus-value latente</p>
        </div>
        <button
          onClick={estimerTout}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 text-sm font-medium transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tout calculer
        </button>
      </div>

      {/* Synthèse globale */}
      {totalEstime > 0 && (
        <GlassCard glow={plusValueLatente && plusValueLatente > 0 ? 'green' : 'red'}>
          <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Synthèse portefeuille</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Prix d\'acquisition', value: formatCurrency(totalAchat, true), color: 'text-[var(--text-primary)]', sub: `${properties.length} biens` },
              { label: 'Valeur marché estimée', value: formatCurrency(totalEstime, true), color: 'text-blue-400', sub: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) },
              {
                label: 'Plus-value latente', color: plusValueLatente && plusValueLatente > 0 ? 'text-[var(--success)]' : 'text-red-400',
                value: plusValueLatente ? formatCurrency(plusValueLatente, true) : '—',
                sub: plusValueLatente && totalAchat > 0 ? formatPct((plusValueLatente / totalAchat) * 100) + ' depuis achat' : '',
              },
              {
                label: 'Loyers marché/mois',
                value: formatCurrency(Object.values(estimations).reduce((s, e) => s + (e.loyer_marche_mensuel ?? 0), 0)),
                color: 'text-amber-400',
                sub: 'potentiel locatif',
              },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bg-white/[0.03] rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Par bien */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-white/[0.03] animate-pulse" />)
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">Ajoutez des biens avec code postal et surface pour estimer</p>
          </div>
        ) : properties.map(prop => {
          const est = estimations[prop.id]
          const activeRent = prop.leases?.find((l: any) => l.is_active)?.monthly_rent ?? null
          const plusValue = est?.valeur_estimee && prop.purchase_price ? est.valeur_estimee - prop.purchase_price : null
          const prixM2Actuel = prop.purchase_price && prop.surface_m2 ? Math.round(prop.purchase_price / prop.surface_m2) : null

          return (
            <GlassCard key={prop.id} className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ProfileBadge type={prop.type} size="sm" />
                    <h3 className="font-display font-semibold text-[var(--text-primary)]">{prop.name}</h3>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {[prop.address, prop.city, prop.postal_code].filter(Boolean).join(', ')}
                    {prop.surface_m2 && ` · ${prop.surface_m2} m²`}
                  </p>
                </div>
                <button
                  onClick={() => estimerBien(prop)}
                  disabled={est?.loading || !prop.postal_code || !prop.surface_m2}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${est?.loading ? 'animate-spin' : ''}`} />
                  {est?.loading ? 'Calcul...' : est ? 'Recalculer' : 'Estimer'}
                </button>
              </div>

              {/* Métriques principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* Valeur achat */}
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Prix d'achat</p>
                  <p className="text-base font-bold text-[var(--text-primary)]">{prop.purchase_price ? formatCurrency(prop.purchase_price) : '—'}</p>
                  {prixM2Actuel && <p className="text-xs text-slate-600 mt-0.5">{prixM2Actuel.toLocaleString('fr-FR')} €/m²</p>}
                </div>

                {/* Valeur marché */}
                <div className={`rounded-xl p-3 ${est?.valeur_estimee ? 'bg-blue-500/5 border border-blue-500/15' : 'bg-white/[0.03]'}`}>
                  <p className="text-xs text-slate-500 mb-1">Valeur marché estimée</p>
                  {est?.loading ? (
                    <div className="h-6 w-24 bg-white/[0.06] rounded animate-pulse" />
                  ) : est?.valeur_estimee ? (
                    <>
                      <p className="text-base font-bold text-blue-400">{formatCurrency(est.valeur_estimee)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {est.valeur_basse.toLocaleString('fr-FR')} – {est.valeur_haute.toLocaleString('fr-FR')} €
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">—</p>
                  )}
                </div>

                {/* Plus-value */}
                <div className={`rounded-xl p-3 ${plusValue !== null ? (plusValue > 0 ? 'bg-green-500/5 border border-green-500/15' : 'bg-red-500/5 border border-red-500/15') : 'bg-white/[0.03]'}`}>
                  <p className="text-xs text-slate-500 mb-1">Plus-value latente</p>
                  {plusValue !== null ? (
                    <>
                      <div className="flex items-center gap-1">
                        {plusValue > 0 ? <TrendingUp className="h-3.5 w-3.5 text-[var(--success)]" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                        <p className={`text-base font-bold ${plusValue > 0 ? 'text-[var(--success)]' : 'text-red-400'}`}>
                          {plusValue > 0 ? '+' : ''}{formatCurrency(plusValue)}
                        </p>
                      </div>
                      {prop.purchase_price && (
                        <p className={`text-xs mt-0.5 ${plusValue > 0 ? 'text-[var(--success)]' : 'text-red-400'}`}>
                          {plusValue > 0 ? '+' : ''}{formatPct((plusValue / prop.purchase_price) * 100)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">—</p>
                  )}
                </div>

                {/* Loyer actuel vs marché */}
                <div className={`rounded-xl p-3 ${est?.loyer_marche_mensuel ? 'bg-amber-500/5 border border-amber-500/15' : 'bg-white/[0.03]'}`}>
                  <p className="text-xs text-slate-500 mb-1">Loyer marché estimé</p>
                  {est?.loading ? (
                    <div className="h-6 w-20 bg-white/[0.06] rounded animate-pulse" />
                  ) : est?.loyer_marche_mensuel ? (
                    <>
                      <p className="text-base font-bold text-amber-400">{formatCurrency(est.loyer_marche_mensuel)}/mois</p>
                      <p className="text-xs text-slate-500 mt-0.5">{est.loyer_marche_m2} €/m²/mois</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">—</p>
                  )}
                </div>
              </div>

              {/* Barres de comparaison */}
              {est && !est.loading && (
                <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                  <p className="text-xs font-medium text-slate-400">Comparaison avec le marché local ({est.date_reference})</p>

                  {/* Prix au m² */}
                  {prixM2Actuel && (
                    <CompareBar
                      label={`Prix/m² — ${est.prix_m2_moyen.toLocaleString('fr-FR')} €/m² en moyenne secteur`}
                      actual={prixM2Actuel}
                      market={est.prix_m2_moyen}
                      unite="€/m²"
                    />
                  )}

                  {/* Loyer */}
                  {activeRent && (
                    <CompareBar
                      label={`Loyer mensuel — fourchette marché ${est.loyer_bas.toLocaleString('fr-FR')}–${est.loyer_haut.toLocaleString('fr-FR')} €`}
                      actual={activeRent}
                      market={est.loyer_marche_mensuel}
                      unite="€"
                    />
                  )}

                  {/* Tendance marché */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Tendance prix secteur (12 mois)</span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${est.tendance_annuelle > 0 ? 'text-[var(--success)]' : est.tendance_annuelle < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {est.tendance_annuelle > 0 ? <ArrowUp className="h-3 w-3" /> : est.tendance_annuelle < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {est.tendance_annuelle > 0 ? '+' : ''}{est.tendance_annuelle}% / an
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">Source : {est.source}</p>
                </div>
              )}

              {(!prop.postal_code || !prop.surface_m2) && (
                <div className="mt-3 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
                  <p className="text-xs text-amber-400">⚠️ Complétez le code postal et la surface dans la fiche du bien pour activer l'estimation</p>
                </div>
              )}
            </GlassCard>
          )
        })}
      </div>

      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
        <p className="text-xs text-slate-500">
          Estimations basées sur le baromètre FNAIM · Notaires de France · MeilleursAgents — données {new Date().getFullYear()}.
          Ces valeurs sont indicatives (±15%) et ne remplacent pas une expertise professionnelle.
        </p>
      </div>
    </div>
  )
}
