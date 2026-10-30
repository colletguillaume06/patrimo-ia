'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Tag } from 'lucide-react'

export function VendreBienButton({ propertyId, bienName }: { propertyId: string; bienName: string }) {
  const [open, setOpen] = useState(false)
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10))
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async () => {
    const sale_price = Number(price.replace(/\s/g, '').replace(',', '.'))
    if (!soldAt || !sale_price || sale_price <= 0) {
      toast.error('Renseignez une date et un prix de vente valides.')
      return
    }
    setLoading(true)
    const res = await fetch(`/api/biens/${propertyId}/vendre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sold_at: soldAt, sale_price }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { toast.error(data.error ?? 'Erreur lors de l\'enregistrement'); return }
    toast.success(`Bien vendu — ${data.baux_clos} bail(s) clos, historique conservé`)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}
      >
        <Tag className="h-4 w-4" /> Marquer comme vendu
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-lg text-[#0F172A]">Vente de « {bienName} »</h2>
            <p className="text-sm text-slate-500">
              Les baux en cours seront clos à la date de vente. Aucun paiement n&apos;est supprimé : l&apos;historique est conservé.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Date de vente</label>
              <input type="date" value={soldAt} onChange={e => setSoldAt(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Prix de vente (€)</label>
              <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="250000" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl text-sm border border-slate-200">Annuler</button>
              <button onClick={submit} disabled={loading}
                className="h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50">
                {loading ? 'Enregistrement...' : 'Confirmer la vente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
