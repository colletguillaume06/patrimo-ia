'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, TrendingUp, Send } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { IRL_CURRENT, ILC_CURRENT, ILAT_CURRENT, getQuarterLabel } from '@/lib/fiscal/indices'

interface RevisionModalProps {
  lease: any
  onClose: () => void
  onSuccess: () => void
}

export function RevisionModal({ lease, onClose, onSuccess }: RevisionModalProps) {
  const indice = lease.property?.indice_revision ?? 'irl'
  const nouvelIndice = indice === 'ilc' ? ILC_CURRENT : indice === 'ilat' ? ILAT_CURRENT : IRL_CURRENT
  const [ancienIndice, setAncienIndice] = useState('')
  const [notify, setNotify] = useState(!!lease.tenant_email)
  const [loading, setLoading] = useState(false)

  const ancienVal = Number(ancienIndice)
  const nouveauLoyer = ancienVal > 0
    ? Math.round((lease.monthly_rent * nouvelIndice / ancienVal) * 100) / 100
    : null
  const hausse = nouveauLoyer ? nouveauLoyer - lease.monthly_rent : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ancienVal) return
    setLoading(true)

    const res = await fetch('/api/loyers/revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lease_id: lease.id, ancien_indice: ancienVal, notify }),
    })

    setLoading(false)
    const data = await res.json()

    if (res.ok) {
      toast.success(`Loyer révisé : ${formatCurrency(data.ancien_loyer)} → ${formatCurrency(data.nouveau_loyer)} (+${data.hausse_pct}%)`)
      if (notify) toast.success('Notification envoyée au locataire')
      onSuccess()
      onClose()
    } else {
      toast.error(data.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111E35] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <h2 className="font-display font-semibold text-white">Révision de loyer</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5">
          <p className="text-xs text-slate-500">{lease.tenant_name} · {lease.property?.name}</p>
          <p className="text-lg font-bold text-white mt-0.5">{formatCurrency(lease.monthly_rent)}/mois</p>
          <p className="text-xs text-blue-400 mt-0.5">Indice : {indice.toUpperCase()} — Dernier indice ({getQuarterLabel()}) : {nouvelIndice}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Ancien indice {indice.toUpperCase()} (lors de la dernière révision)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder={`Ex: ${(nouvelIndice * 0.98).toFixed(2)}`}
              value={ancienIndice}
              onChange={e => setAncienIndice(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50"
            />
            <p className="text-xs text-slate-600 mt-1">
              Trouvez l'indice sur <a href="https://www.insee.fr" target="_blank" className="text-blue-400 hover:underline">insee.fr</a>
            </p>
          </div>

          {nouveauLoyer && (
            <div className="p-4 rounded-xl bg-green-400/5 border border-green-400/20 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Ancien loyer</span>
                <span className="text-sm text-white">{formatCurrency(lease.monthly_rent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Nouveau loyer</span>
                <span className="text-sm font-bold text-green-400">{formatCurrency(nouveauLoyer)}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-2">
                <span className="text-sm text-slate-400">Hausse mensuelle</span>
                <span className="text-sm font-semibold text-green-400">+{formatCurrency(hausse!)} ({((hausse! / lease.monthly_rent) * 100).toFixed(2)}%)</span>
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setNotify(!notify)}
              className={`h-5 w-9 rounded-full transition-colors relative ${notify ? 'bg-blue-500' : 'bg-white/[0.10]'}`}
            >
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${notify ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-300">
              Notifier {lease.tenant_name} par email
              {!lease.tenant_email && <span className="text-slate-600 ml-1">(email non renseigné)</span>}
            </span>
          </label>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-white/[0.10] text-slate-400 text-sm transition-all hover:text-white">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !ancienVal || !nouveauLoyer}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-green-500 hover:bg-green-400 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Application...' : <><TrendingUp className="h-4 w-4" /> Appliquer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
