'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  propertyId: string
  purchasePrice: number | null
  valeurActuelle: number | null
  valeurActuelleDate: string | null
  valeurActuelleSource: string | null
  loyer?: number | null
}

export function ValeurActuelleCard({
  propertyId,
  purchasePrice,
  valeurActuelle: initialValeur,
  valeurActuelleDate: initialDate,
  valeurActuelleSource: initialSource,
  loyer,
}: Props) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [valeur, setValeur] = useState(initialValeur ? String(initialValeur) : '')
  const [date, setDate] = useState(initialDate ?? '')
  const [source, setSource] = useState(initialSource ?? '')

  const currentValeur = initialValeur
  const plusValue = currentValeur && purchasePrice ? currentValeur - purchasePrice : null
  const plusValuePct = plusValue && purchasePrice ? (plusValue / purchasePrice) * 100 : null
  const rendementMarche = currentValeur && loyer ? (loyer * 12 / currentValeur) * 100 : null

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('properties').update({
      valeur_actuelle: valeur !== '' ? Number(valeur) : null,
      valeur_actuelle_date: date || null,
      valeur_actuelle_source: source || null,
    }).eq('id', propertyId)
    if (error) { toast.error('Erreur lors de la sauvegarde'); setSaving(false); return }
    toast.success('Valeur mise à jour')
    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  const handleCancel = () => {
    setValeur(initialValeur ? String(initialValeur) : '')
    setDate(initialDate ?? '')
    setSource(initialSource ?? '')
    setEditing(false)
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Valeur du bien — estimation comptable
        </h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-400 flex items-center gap-1.5 transition-all"
          >
            <Pencil className="h-3.5 w-3.5" /> Mettre à jour
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Valeur estimée (€) *</label>
              <input
                type="number"
                step="1000"
                value={valeur}
                onChange={e => setValeur(e.target.value)}
                placeholder="Ex : 220000"
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-400/50"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Date d'estimation</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-400/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Source / référence</label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Ex : Estimation comptable — Cabinet Dupont — Méthode comparaison"
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-slate-600 text-sm focus:outline-none focus:border-emerald-400/50"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 h-9 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.04] transition-all flex items-center justify-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !valeur}
              className="flex-1 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : currentValeur ? (
        <div className="space-y-4">
          {/* Valeur principale */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold font-mono text-emerald-400">{formatCurrency(currentValeur)}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {date && (
                  <span className="text-xs text-slate-500">
                    Estimé le {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {source && (
                  <span className="text-xs text-slate-600 italic truncate max-w-[240px]">{source}</span>
                )}
              </div>
            </div>
            {purchasePrice && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500 mb-0.5">Prix d'achat</p>
                <p className="text-sm font-mono text-slate-400">{formatCurrency(purchasePrice)}</p>
              </div>
            )}
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-3 gap-3">
            {plusValue !== null && (
              <div className={cn('rounded-xl p-3', plusValue >= 0 ? 'bg-emerald-400/5 border border-emerald-400/20' : 'bg-red-400/5 border border-red-400/20')}>
                <p className="text-xs text-slate-500 mb-1">Plus-value latente</p>
                <p className={cn('text-base font-bold font-mono', plusValue >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {plusValue >= 0 ? '+' : ''}{formatCurrency(plusValue)}
                </p>
                {plusValuePct !== null && (
                  <p className={cn('text-xs mt-0.5', plusValue >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {plusValue >= 0 ? '+' : ''}{plusValuePct.toFixed(1)} %
                  </p>
                )}
              </div>
            )}
            {rendementMarche !== null && (
              <div className="rounded-xl p-3 bg-blue-400/5 border border-blue-400/20">
                <p className="text-xs text-slate-500 mb-1">Rendement marché</p>
                <p className="text-base font-bold font-mono text-blue-400">{rendementMarche.toFixed(2)} %</p>
                <p className="text-xs text-slate-600 mt-0.5">sur valeur actuelle</p>
              </div>
            )}
            {purchasePrice && currentValeur && (
              <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-slate-500 mb-1">Ratio valeur/achat</p>
                <p className="text-base font-bold font-mono text-[var(--text-primary)]">
                  {(currentValeur / purchasePrice).toFixed(2)}x
                </p>
                <p className="text-xs text-slate-600 mt-0.5">×{(currentValeur / purchasePrice).toFixed(2)} depuis l'achat</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/[0.08] cursor-pointer hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all"
        >
          <TrendingUp className="h-5 w-5 text-slate-600 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-400">Aucune estimation renseignée</p>
            <p className="text-xs text-slate-600 mt-0.5">Cliquez pour saisir la valeur estimée par votre comptable ou expert</p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
