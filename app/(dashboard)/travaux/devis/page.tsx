'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format, addDays, isPast } from 'date-fns'
import { toast } from 'sonner'
import { Plus, X, CheckCircle2, XCircle, Trophy, AlertTriangle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function DevisPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [devis, setDevis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    entreprise: '', montant: '', date_reception: new Date().toISOString().split('T')[0],
    delai_execution_jours: '', validite_jours: '30', notes: '',
  })
  const supabase = createClient()

  const load = async () => {
    const [incRes, devRes] = await Promise.all([
      supabase.from('incidents').select('*, property:properties(name)').eq('status', 'open').order('created_at', { ascending: false }),
      supabase.from('devis').select('*').order('montant'),
    ])
    setIncidents(incRes.data ?? [])
    setDevis(devRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent, incident_id: string) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('devis').insert({
      incident_id,
      entreprise: form.entreprise,
      montant: Number(form.montant),
      date_reception: form.date_reception,
      delai_execution_jours: form.delai_execution_jours ? Number(form.delai_execution_jours) : null,
      validite_jours: Number(form.validite_jours) || 30,
      notes: form.notes || null,
      statut: 'en_attente',
    })
    setSaving(false); toast.success('Devis ajouté'); setShowAdd(null)
    setForm({ entreprise: '', montant: '', date_reception: new Date().toISOString().split('T')[0], delai_execution_jours: '', validite_jours: '30', notes: '' })
    load()
  }

  const handleRetenir = async (devisId: string, incidentId: string, entreprise: string, montant: number) => {
    // Retenir ce devis → refuser les autres du même incident
    const autresIds = devis.filter(d => d.incident_id === incidentId && d.id !== devisId).map(d => d.id)
    await Promise.all([
      supabase.from('devis').update({ statut: 'retenu' }).eq('id', devisId),
      autresIds.length > 0 && supabase.from('devis').update({ statut: 'refuse' }).in('id', autresIds),
      supabase.from('incidents').update({ nom_entreprise: entreprise, cout_estime: montant }).eq('id', incidentId),
    ])
    toast.success(`Devis retenu — ${entreprise} (${formatCurrency(montant)})`)
    load()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/travaux" className="text-text-tertiary hover:text-text-primary text-sm flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Travaux</Link>
        <span className="text-text-secondary">/</span>
        <h1 className="font-display font-bold text-xl text-text-primary">Comparateur de devis</h1>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-40 rounded-xl bg-bg-secondary/50 animate-pulse" />)}</div>
      ) : incidents.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <p className="text-text-tertiary">Aucun ticket ouvert — créez d'abord un ticket travaux</p>
        </GlassCard>
      ) : incidents.map(inc => {
        const incDevis = devis.filter(d => d.incident_id === inc.id).sort((a, b) => a.montant - b.montant)
        const moinsCher = incDevis[0]
        const retenu = incDevis.find(d => d.statut === 'retenu')

        return (
          <GlassCard key={inc.id}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-text-primary">{inc.title}</p>
                <p className="text-xs text-text-secondary">{inc.property?.name} · {incDevis.length} devis</p>
              </div>
              <button onClick={() => setShowAdd(inc.id)}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium">
                <Plus className="h-3 w-3" /> Ajouter un devis
              </button>
            </div>

            {incDevis.length === 0 ? (
              <p className="text-sm text-text-secondary italic">Aucun devis reçu</p>
            ) : (
              <div className="space-y-2">
                {incDevis.map(d => {
                  const isExpire = isPast(addDays(new Date(d.date_reception), d.validite_jours || 30))
                  const diff = moinsCher && d.id !== moinsCher.id
                    ? ((d.montant - moinsCher.montant) / moinsCher.montant) * 100
                    : 0
                  const isRetenu = d.statut === 'retenu'
                  const isRefuse = d.statut === 'refuse'

                  return (
                    <div key={d.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      isRetenu ? 'border-green-400/30 bg-green-400/5' :
                      isRefuse ? 'border-white/[0.04] bg-white/[0.01] opacity-50' :
                      isExpire ? 'border-amber-400/20 bg-amber-400/5' :
                      'border-border bg-white/[0.02]'
                    }`}>
                      {/* Badge moins cher */}
                      {d.id === moinsCher?.id && !isRefuse && (
                        <span title="Moins cher"><Trophy className="h-4 w-4 text-amber-400 flex-shrink-0" /></span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary">{d.entreprise}</p>
                          {isRetenu && <span className="text-xs text-success-text bg-success-bg border border-[var(--success)/20] px-1.5 py-0.5 rounded-full">Retenu</span>}
                          {isExpire && !isRetenu && <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">Expiré</span>}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Reçu le {format(new Date(d.date_reception), 'dd/MM/yyyy')}
                          {d.delai_execution_jours && ` · Délai : ${d.delai_execution_jours}j`}
                          {d.notes && ` · ${d.notes}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-text-primary">{formatCurrency(d.montant)}</p>
                        {diff > 0 && !isRefuse && (
                          <p className="text-xs text-red-400">+{diff.toFixed(1)}% vs le moins cher</p>
                        )}
                      </div>
                      {!isRetenu && !isRefuse && (
                        <button onClick={() => handleRetenir(d.id, inc.id, d.entreprise, d.montant)}
                          className="flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-success-bg hover:bg-green-400/20 border border-[var(--success)/20] text-success-text text-xs font-medium transition-all">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Retenir
                        </button>
                      )}
                    </div>
                  )
                })}

                {incDevis.length >= 2 && (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-border">
                    <p className="text-xs text-text-tertiary">
                      Écart entre devis : <span className="text-text-primary font-semibold">{formatCurrency(incDevis[incDevis.length - 1].montant - incDevis[0].montant)}</span>
                      {' '}({((incDevis[incDevis.length - 1].montant - incDevis[0].montant) / incDevis[0].montant * 100).toFixed(1)}%)
                    </p>
                  </div>
                )}
              </div>
            )}

            {showAdd === inc.id && (
              <div className="mt-4 pt-4 border-t border-border">
                <form onSubmit={e => handleAdd(e, inc.id)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-text-tertiary mb-1">Entreprise *</label><input type="text" value={form.entreprise} onChange={e => setForm(f => ({ ...f, entreprise: e.target.value }))} required className="w-full h-9 px-3 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none" /></div>
                    <div><label className="block text-xs text-text-tertiary mb-1">Montant (€) *</label><input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required className="w-full h-9 px-3 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none" /></div>
                    <div><label className="block text-xs text-text-tertiary mb-1">Date réception</label><input type="date" value={form.date_reception} onChange={e => setForm(f => ({ ...f, date_reception: e.target.value }))} className="w-full h-9 px-3 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none" /></div>
                    <div><label className="block text-xs text-text-tertiary mb-1">Délai exécution (jours)</label><input type="number" value={form.delai_execution_jours} onChange={e => setForm(f => ({ ...f, delai_execution_jours: e.target.value }))} className="w-full h-9 px-3 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAdd(null)} className="flex-1 h-8 rounded-lg border border-border text-text-tertiary text-xs">Annuler</button>
                    <button type="submit" disabled={saving} className="flex-1 h-8 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold disabled:opacity-50">Ajouter</button>
                  </div>
                </form>
              </div>
            )}
          </GlassCard>
        )
      })}
    </div>
  )
}
