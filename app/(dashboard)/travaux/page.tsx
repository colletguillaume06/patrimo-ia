'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Wrench, Plus, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { IncidentStatus } from '@/types'
import { cn } from '@/lib/utils'

const statusConfig: Record<IncidentStatus, { label: string; icon: any; color: string }> = {
  open: { label: 'Ouvert', icon: AlertCircle, color: 'text-red-400' },
  in_progress: { label: 'En cours', icon: Clock, color: 'text-amber-400' },
  resolved: { label: 'Résolu', icon: CheckCircle2, color: 'text-green-400' },
}

export default function TravauxPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    property_id: '', title: '', description: '', cost: '', reported_by: 'owner' as 'owner' | 'tenant',
  })
  const supabase = createClient()

  const load = async () => {
    const [incRes, propRes] = await Promise.all([
      supabase.from('incidents').select('*, property:properties(name, city)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name'),
    ])
    setIncidents(incRes.data ?? [])
    setProperties(propRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('incidents').insert({
      property_id: form.property_id,
      title: form.title,
      description: form.description || null,
      cost: Number(form.cost) || 0,
      reported_by: form.reported_by,
      status: 'open',
    })
    if (error) { toast.error(error.message); return }
    toast.success('Ticket créé')
    setShowAdd(false)
    setForm({ property_id: '', title: '', description: '', cost: '', reported_by: 'owner' })
    load()
  }

  const handleStatusChange = async (id: string, status: IncidentStatus) => {
    await supabase.from('incidents').update({
      status,
      ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    load()
  }

  const totalCost = incidents.filter(i => i.status !== 'resolved').reduce((s, i) => s + i.cost, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Travaux & Incidents</h1>
          <p className="text-slate-400 text-sm mt-1">{incidents.filter(i => i.status !== 'resolved').length} ticket(s) ouvert(s)</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all"
        >
          <Plus className="h-4 w-4" /> Nouveau ticket
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tickets ouverts', value: incidents.filter(i => i.status === 'open').length, color: 'text-red-400', glow: 'red' as const },
          { label: 'En cours', value: incidents.filter(i => i.status === 'in_progress').length, color: 'text-amber-400', glow: 'amber' as const },
          { label: 'Coût en cours', value: formatCurrency(totalCost), color: 'text-white', glow: 'blue' as const },
        ].map(({ label, value, color, glow }) => (
          <GlassCard key={label} glow={glow}>
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />)
        ) : incidents.length === 0 ? (
          <div className="text-center py-16">
            <Wrench className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">Aucun ticket enregistré</p>
          </div>
        ) : incidents.map(incident => {
          const { label, icon: Icon, color } = statusConfig[incident.status as IncidentStatus]
          return (
            <GlassCard key={incident.id} className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-white">{incident.title}</p>
                    <div className="flex items-center gap-2 ml-4">
                      {incident.cost > 0 && (
                        <span className="text-sm font-semibold text-white">{formatCurrency(incident.cost)}</span>
                      )}
                      <select
                        value={incident.status}
                        onChange={e => handleStatusChange(incident.id, e.target.value as IncidentStatus)}
                        className="h-7 px-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-xs text-white focus:outline-none"
                      >
                        <option value="open" className="bg-[#111E35]">Ouvert</option>
                        <option value="in_progress" className="bg-[#111E35]">En cours</option>
                        <option value="resolved" className="bg-[#111E35]">Résolu</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{incident.property?.name} · Signalé par {incident.reported_by === 'tenant' ? 'le locataire' : "le propriétaire"}</p>
                  {incident.description && (
                    <p className="text-xs text-slate-400 mt-1">{incident.description}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">{format(new Date(incident.created_at), 'dd MMM yyyy', { locale: fr })}</p>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-[#111E35] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-white">Nouveau ticket</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bien *</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none">
                  <option value="" className="bg-[#111E35]">Sélectionner un bien</option>
                  {properties.map(p => <option key={p.id} value={p.id} className="bg-[#111E35]">{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Titre *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Ex: Fuite robinet cuisine" className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none placeholder-slate-600" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none resize-none placeholder-slate-600" placeholder="Détails de l'incident..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Coût estimé (€)</label>
                  <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Signalé par</label>
                  <select value={form.reported_by} onChange={e => setForm(f => ({ ...f, reported_by: e.target.value as 'owner' | 'tenant' }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none">
                    <option value="owner" className="bg-[#111E35]">Propriétaire</option>
                    <option value="tenant" className="bg-[#111E35]">Locataire</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold mt-2">
                <Plus className="h-4 w-4" /> Créer le ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
