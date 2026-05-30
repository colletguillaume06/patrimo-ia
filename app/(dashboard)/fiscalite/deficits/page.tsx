'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChevronLeft, Plus, X, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export default function DeficitsPage() {
  const [deficits, setDeficits] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ annee: String(new Date().getFullYear() - 1), property_id: '', montant_initial: '', notes: '' })
  const supabase = createClient()

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [dRes, pRes] = await Promise.all([
      supabase.from('deficits_fonciers').select('*, property:properties(name)').eq('user_id', user.id).order('annee', { ascending: false }),
      supabase.from('properties').select('id, name, type').in('type', ['nu', 'sci']),
    ])
    setDeficits(dRes.data ?? [])
    setProperties(pRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('deficits_fonciers').insert({
      user_id: user.id,
      property_id: form.property_id || null,
      annee: Number(form.annee),
      montant_initial: Number(form.montant_initial),
      notes: form.notes || null,
      source: 'saisie_manuelle',
    })
    setSaving(false)
    toast.success('Déficit ajouté')
    setShowAdd(false)
    setForm({ annee: String(new Date().getFullYear() - 1), property_id: '', montant_initial: '', notes: '' })
    load()
  }

  const handleImputer = async (deficit: any, montant: number) => {
    await supabase.from('deficits_fonciers').update({
      montant_impute: (deficit.montant_impute ?? 0) + montant,
    }).eq('id', deficit.id)
    toast.success(`${formatCurrency(montant)} imputé`)
    load()
  }

  const now = new Date()
  const expirantCetteAnnee = deficits.filter(d => d.expire_en === now.getFullYear() && d.montant_restant > 0)
  const totalDisponible = deficits.filter(d => d.montant_restant > 0 && d.expire_en > now.getFullYear()).reduce((s, d) => s + d.montant_restant, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/fiscalite" className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Fiscalité
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="font-display font-bold text-xl text-white">Déficits fonciers reportables</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard glow="blue" className="p-4">
          <p className="text-xs text-slate-400 mb-1">Stock disponible</p>
          <p className="text-xl font-bold font-mono text-blue-400">{formatCurrency(totalDisponible)}</p>
          <p className="text-xs text-slate-600 mt-0.5">Imputables sur revenus fonciers</p>
        </GlassCard>
        <GlassCard glow={expirantCetteAnnee.length > 0 ? 'red' : 'green'} className="p-4">
          <p className="text-xs text-slate-400 mb-1">Expirant cette année</p>
          <p className={`text-xl font-bold font-mono ${expirantCetteAnnee.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {expirantCetteAnnee.length > 0 ? formatCurrency(expirantCetteAnnee.reduce((s, d) => s + d.montant_restant, 0)) : '0 €'}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">À imputer avant fin {now.getFullYear()}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400 mb-1">Économie potentielle (TMI 30%)</p>
          <p className="text-xl font-bold font-mono text-green-400">{formatCurrency(totalDisponible * 0.30)}</p>
          <p className="text-xs text-slate-600 mt-0.5">Si tout imputé à 30%</p>
        </GlassCard>
      </div>

      {/* Alerte expiration */}
      {expirantCetteAnnee.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-400/5 border border-red-400/20">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Déficits expirant fin {now.getFullYear()} !</p>
            <p className="text-xs text-red-300/70 mt-0.5">
              {formatCurrency(expirantCetteAnnee.reduce((s, d) => s + d.montant_restant, 0))} de déficit(s) perdus si non imputés cette année.
              Vérifiez que vous avez des revenus fonciers positifs à compenser.
            </p>
          </div>
        </div>
      )}

      {/* Tableau */}
      <GlassCard>
        <h2 className="font-display font-semibold text-white mb-4">Suivi des déficits</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
        ) : deficits.length === 0 ? (
          <div className="py-10 text-center">
            <TrendingDown className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Aucun déficit enregistré</p>
            <p className="text-slate-600 text-xs mt-1">Ajoutez vos déficits fonciers des années précédentes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                  {['Année','Bien','Montant initial','Imputé','Restant','Expire en','Statut'].map(h =>
                    <th key={h} className="text-left py-2.5 px-3 font-medium">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {deficits.map(d => {
                  const isExpired = d.expire_en <= now.getFullYear() - 1
                  const expiresThis = d.expire_en === now.getFullYear()
                  const isUsed = d.montant_restant <= 0
                  return (
                    <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 px-3 text-white font-semibold">{d.annee}</td>
                      <td className="py-3 px-3 text-slate-300">{d.property?.name ?? 'Global'}</td>
                      <td className="py-3 px-3 text-white">{formatCurrency(d.montant_initial)}</td>
                      <td className="py-3 px-3 text-slate-400">{formatCurrency(d.montant_impute ?? 0)}</td>
                      <td className="py-3 px-3">
                        <span className={`font-semibold ${isUsed ? 'text-slate-600' : isExpired ? 'text-red-400' : 'text-blue-400'}`}>
                          {formatCurrency(d.montant_restant)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs ${expiresThis ? 'text-red-400 font-semibold' : isExpired ? 'text-slate-600' : 'text-slate-400'}`}>
                          {d.expire_en} {expiresThis && '⚠️'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {isUsed ? (
                          <span className="flex items-center gap-1 text-xs text-slate-600"><CheckCircle2 className="h-3.5 w-3.5" /> Épuisé</span>
                        ) : isExpired ? (
                          <span className="text-xs text-red-400">Expiré</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">Disponible</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 p-3 rounded-lg bg-blue-400/5 border border-blue-400/20">
          <p className="text-xs text-blue-400">
            📋 Les déficits fonciers sont imputables sur le revenu global à hauteur de <strong>10 700€/an</strong> (art. 156 CGI).
            Le surplus s'impute sur les revenus fonciers des <strong>10 années suivantes</strong>.
          </p>
        </div>
      </GlassCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-[#111E35] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-white">Ajouter un déficit foncier</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Année *</label>
                  <input type="number" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Montant (€) *</label>
                  <input type="number" value={form.montant_initial} onChange={e => setForm(f => ({ ...f, montant_initial: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bien (optionnel)</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none">
                  <option value="" className="bg-[#111E35]">Tous biens (global)</option>
                  {properties.map(p => <option key={p.id} value={p.id} className="bg-[#111E35]">{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <input type="text" placeholder="Ex: Déficit 2044 ligne 420" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none" />
              </div>
              <button type="submit" disabled={saving} className="w-full h-10 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold disabled:opacity-50">Ajouter</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
