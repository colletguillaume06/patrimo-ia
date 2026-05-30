'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChevronLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'

export default function SciCcaPage() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<any>(null)
  const [associates, setAssociates] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ associe_id: '', date_operation: new Date().toISOString().split('T')[0], type: 'avance', montant: '', motif: '' })
  const supabase = createClient()

  const load = async () => {
    const [pRes, aRes, oRes] = await Promise.all([
      supabase.from('properties').select('id, name, sci_name').eq('id', id).single(),
      supabase.from('sci_associates').select('*').eq('property_id', id),
      supabase.from('comptes_courants_associes').select('*, associe:sci_associates(name)').eq('property_id', id).order('date_operation', { ascending: false }),
    ])
    setProperty(pRes.data)
    setAssociates(aRes.data ?? [])
    setOperations(oRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('comptes_courants_associes').insert({
      property_id: id,
      associe_id: form.associe_id,
      date_operation: form.date_operation,
      type: form.type,
      montant: Number(form.montant),
      motif: form.motif || null,
    })
    setSaving(false); toast.success('Opération enregistrée'); setShowAdd(false)
    setForm({ associe_id: '', date_operation: new Date().toISOString().split('T')[0], type: 'avance', montant: '', motif: '' })
    load()
  }

  // Solde par associé
  const soldes = associates.map(a => {
    const ops = operations.filter(o => o.associe_id === a.id)
    const avances = ops.filter(o => o.type === 'avance').reduce((s, o) => s + o.montant, 0)
    const remboursements = ops.filter(o => o.type === 'remboursement').reduce((s, o) => s + o.montant, 0)
    const interets = ops.filter(o => o.type === 'interets').reduce((s, o) => s + o.montant, 0)
    return { ...a, avances, remboursements, interets, solde: avances - remboursements + interets }
  })

  const totalCCA = soldes.reduce((s, a) => s + a.solde, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/biens/${id}`} className="text-slate-400 hover:text-[#0A0908] text-sm flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> {property?.sci_name ?? property?.name}</Link>
          <span className="text-slate-600">/</span>
          <h1 className="font-display font-bold text-xl text-[#0A0908]">Comptes courants associés</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" /> Nouvelle opération
        </button>
      </div>

      {/* KPIs par associé */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {soldes.map(a => (
          <GlassCard key={a.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-[#0A0908]">{a.name}</p>
              <span className="text-xs text-slate-500">{a.share_pct}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-xs text-slate-500">Avances</p><p className="text-sm font-semibold text-[#0A0908]">{formatCurrency(a.avances)}</p></div>
              <div><p className="text-xs text-slate-500">Remb.</p><p className="text-sm font-semibold text-[var(--success)]">-{formatCurrency(a.remboursements)}</p></div>
              <div><p className="text-xs text-slate-500">Solde CCA</p><p className={`text-sm font-bold ${a.solde > 0 ? 'text-amber-400' : 'text-[var(--success)]'}`}>{formatCurrency(a.solde)}</p></div>
            </div>
          </GlassCard>
        ))}
      </div>

      {totalCCA > 0 && (
        <GlassCard glow="amber" className="p-4">
          <p className="text-xs text-slate-400 mb-1">Total CCA de la SCI</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(totalCCA)}</p>
          <p className="text-xs text-slate-600 mt-0.5">Montant total dû aux associés par la SCI</p>
        </GlassCard>
      )}

      {/* Historique */}
      <GlassCard>
        <h2 className="font-display font-semibold text-[#0A0908] mb-4">Historique des opérations</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
        ) : operations.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune opération enregistrée</p>
        ) : (
          <div className="space-y-2">
            {operations.map(op => (
              <div key={op.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${op.type === 'avance' ? 'bg-amber-400/10' : op.type === 'remboursement' ? 'bg-[var(--success-bg)]' : 'bg-blue-400/10'}`}>
                  {op.type === 'avance' ? '↑' : op.type === 'remboursement' ? '↓' : '📈'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#0A0908]">{op.associe?.name}</p>
                  <p className="text-xs text-slate-500">{format(new Date(op.date_operation), 'dd/MM/yyyy')} · {op.type === 'avance' ? 'Avance' : op.type === 'remboursement' ? 'Remboursement' : 'Intérêts'}{op.motif && ` · ${op.motif}`}</p>
                </div>
                <p className={`font-semibold ${op.type === 'avance' ? 'text-amber-400' : 'text-[var(--success)]'}`}>
                  {op.type === 'remboursement' ? '-' : '+'}{formatCurrency(op.montant)}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-[#111E35] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-[#0A0908]">Nouvelle opération CCA</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Associé *</label>
                <select value={form.associe_id} onChange={e => setForm(f => ({ ...f, associe_id: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[#0A0908] text-sm focus:outline-none">
                  <option value="" className="bg-[#111E35]">— Sélectionner</option>
                  {associates.map(a => <option key={a.id} value={a.id} className="bg-[#111E35]">{a.name} ({a.share_pct}%)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[#0A0908] text-sm focus:outline-none">
                    <option value="avance" className="bg-[#111E35]">Avance</option>
                    <option value="remboursement" className="bg-[#111E35]">Remboursement</option>
                    <option value="interets" className="bg-[#111E35]">Intérêts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Montant (€) *</label>
                  <input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[#0A0908] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date</label>
                  <input type="date" value={form.date_operation} onChange={e => setForm(f => ({ ...f, date_operation: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[#0A0908] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Motif</label>
                  <input type="text" value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[#0A0908] text-sm focus:outline-none" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full h-10 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold disabled:opacity-50">Enregistrer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
