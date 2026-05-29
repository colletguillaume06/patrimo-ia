'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface Estimation {
  property_id: string
  valeur_estimee: number
  prix_m2_moyen: number
  nb_transactions: number
  source: string
  loading: boolean
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
      toast.error('Code postal et surface requis pour l\'estimation')
      return
    }

    setEstimations(prev => ({ ...prev, [prop.id]: { ...prev[prop.id], property_id: prop.id, loading: true } as Estimation }))

    const res = await fetch('/api/dvf/estimation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: prop.id,
        city: prop.city,
        postal_code: prop.postal_code,
        surface_m2: prop.surface_m2,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setEstimations(prev => ({ ...prev, [prop.id]: { ...data, property_id: prop.id, loading: false } }))
    } else {
      toast.error('Erreur lors de l\'estimation')
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
          <h1 className="font-display font-bold text-2xl text-white">Valorisation patrimoine</h1>
          <p className="text-slate-400 text-sm mt-1">Estimation de la valeur marché via les données DVF</p>
        </div>
        <button
          onClick={estimerTout}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-white text-sm transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tout estimer
        </button>
      </div>

      {/* Synthèse */}
      {totalEstime > 0 && (
        <GlassCard glow={plusValueLatente && plusValueLatente > 0 ? 'green' : 'red'}>
          <h2 className="font-display font-semibold text-white mb-4">Synthèse patrimoniale</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.03] rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Prix d'acquisition total</p>
              <p className="text-xl font-bold font-mono text-white">{formatCurrency(totalAchat)}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Valeur marché estimée</p>
              <p className="text-xl font-bold font-mono text-blue-400">{formatCurrency(totalEstime)}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Plus-value latente</p>
              <div className="flex items-center gap-2">
                {plusValueLatente && plusValueLatente > 0
                  ? <TrendingUp className="h-4 w-4 text-green-400" />
                  : <TrendingDown className="h-4 w-4 text-red-400" />
                }
                <p className={`text-xl font-bold font-mono ${plusValueLatente && plusValueLatente > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {plusValueLatente ? formatCurrency(plusValueLatente) : '—'}
                </p>
              </div>
              {plusValueLatente && totalAchat > 0 && (
                <p className={`text-xs mt-0.5 ${plusValueLatente > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPct((plusValueLatente / totalAchat) * 100)} depuis l'achat
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Par bien */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />)
        ) : properties.map(prop => {
          const est = estimations[prop.id]
          const plusValue = est?.valeur_estimee && prop.purchase_price
            ? est.valeur_estimee - prop.purchase_price : null
          const activeRent = prop.leases?.find((l: any) => l.is_active)?.monthly_rent ?? 0

          return (
            <GlassCard key={prop.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ProfileBadge type={prop.type} size="sm" />
                    <h3 className="font-display font-semibold text-white">{prop.name}</h3>
                  </div>
                  {prop.city && (
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {prop.city} {prop.postal_code && `(${prop.postal_code})`}
                      {prop.surface_m2 && ` · ${prop.surface_m2} m²`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => estimerBien(prop)}
                  disabled={est?.loading || !prop.postal_code || !prop.surface_m2}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${est?.loading ? 'animate-spin' : ''}`} />
                  {est?.loading ? 'Calcul...' : 'Estimer'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-2.5">
                  <p className="text-xs text-slate-500 mb-0.5">Prix d'achat</p>
                  <p className="text-sm font-semibold text-white">{prop.purchase_price ? formatCurrency(prop.purchase_price) : '—'}</p>
                  {prop.purchase_year && <p className="text-xs text-slate-600">en {prop.purchase_year}</p>}
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2.5">
                  <p className="text-xs text-slate-500 mb-0.5">Valeur estimée</p>
                  {est?.loading ? (
                    <div className="h-5 w-20 bg-white/[0.06] rounded animate-pulse" />
                  ) : est?.valeur_estimee ? (
                    <p className="text-sm font-semibold text-blue-400">{formatCurrency(est.valeur_estimee)}</p>
                  ) : (
                    <p className="text-sm text-slate-600">Non calculée</p>
                  )}
                  {est && !est.loading && (
                    <p className="text-xs text-slate-600">{est.prix_m2_moyen.toLocaleString('fr-FR')} €/m²</p>
                  )}
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2.5">
                  <p className="text-xs text-slate-500 mb-0.5">Plus-value latente</p>
                  {plusValue !== null ? (
                    <div className="flex items-center gap-1">
                      {plusValue > 0
                        ? <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      }
                      <p className={`text-sm font-semibold ${plusValue > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(plusValue)}
                      </p>
                    </div>
                  ) : <p className="text-sm text-slate-600">—</p>}
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2.5">
                  <p className="text-xs text-slate-500 mb-0.5">Loyer mensuel</p>
                  <p className="text-sm font-semibold text-white">{activeRent ? formatCurrency(activeRent) : '—'}</p>
                  {est?.valeur_estimee && activeRent && (
                    <p className="text-xs text-green-400">
                      {formatPct((activeRent * 12 / est.valeur_estimee) * 100)} rdt brut
                    </p>
                  )}
                </div>
              </div>

              {est && !est.loading && (
                <p className="text-xs text-slate-600 mt-2">
                  Source : {est.source}{est.nb_transactions > 0 ? ` · ${est.nb_transactions} transactions analysées` : ''}
                </p>
              )}

              {(!prop.postal_code || !prop.surface_m2) && (
                <p className="text-xs text-amber-400 mt-2">
                  ⚠️ Complétez le code postal et la surface pour activer l'estimation
                </p>
              )}
            </GlassCard>
          )
        })}

        {!loading && properties.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400">Ajoutez des biens pour estimer votre patrimoine</p>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
        <p className="text-xs text-slate-500">
          Estimations basées sur les données DVF (Demandes de Valeurs Foncières) de la DGFiP. Ces estimations sont indicatives et ne remplacent pas une expertise immobilière professionnelle.
        </p>
      </div>
    </div>
  )
}
