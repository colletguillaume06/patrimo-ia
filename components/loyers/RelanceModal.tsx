'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Send } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Payment } from '@/types'

interface RelanceModalProps {
  payment: Payment & { lease?: any }
  onClose: () => void
  onSuccess: () => void
}

export function RelanceModal({ payment, onClose, onSuccess }: RelanceModalProps) {
  const [loading, setLoading] = useState(false)
  const relanceNum = (payment.relance_count ?? 0) + 1

  const labels = ['Premier rappel (courtois)', 'Deuxième relance (ferme)', 'Mise en demeure (officielle)']
  const label = labels[Math.min(relanceNum - 1, 2)]

  const handleSend = async () => {
    setLoading(true)
    const res = await fetch('/api/loyers/relance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: payment.id }),
    })
    setLoading(false)

    if (res.ok) {
      toast.success('Relance envoyée avec succès')
      onSuccess()
      onClose()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Erreur lors de l\'envoi')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111E35] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-white">Envoyer une relance</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10]">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs text-slate-500 mb-1">Locataire</p>
            <p className="text-sm font-medium text-white">{payment.lease?.tenant_name ?? 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-0.5">Montant dû</p>
              <p className="text-sm font-semibold text-white">{formatCurrency(payment.amount)}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-0.5">Relance n°</p>
              <p className="text-sm font-semibold text-amber-400">{relanceNum}</p>
            </div>
          </div>
          <div className={`p-3 rounded-xl border text-sm ${
            relanceNum === 1 ? 'bg-blue-400/5 border-blue-400/20 text-blue-300' :
            relanceNum === 2 ? 'bg-amber-400/5 border-amber-400/20 text-amber-300' :
            'bg-red-400/5 border-red-400/20 text-red-300'
          }`}>
            {label} — un email sera envoyé automatiquement
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-white/[0.10] text-slate-400 hover:text-white text-sm transition-all">
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !payment.lease?.tenant_email}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Envoi...' : <><Send className="h-4 w-4" /> Envoyer</>}
          </button>
        </div>
        {!payment.lease?.tenant_email && (
          <p className="text-xs text-red-400 mt-2 text-center">Email du locataire non renseigné</p>
        )}
      </div>
    </div>
  )
}
