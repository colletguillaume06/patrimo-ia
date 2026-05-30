'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, X, Paperclip, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import {
  DIAG_LABELS, DPE_COLORS, calculerExpiration, getStatutDiag,
  type DiagType, type DPELettre
} from '@/lib/diagnostics'

const TYPES: DiagType[] = ['dpe','amiante','plomb','electricite','gaz','erp','termites','bruit','assainissement']

const FORM_INIT = {
  type: 'dpe' as DiagType,
  resultat: '',
  valeur_dpe: '' as DPELettre | '',
  date_realisation: '',
  cabinet: '',
}

export default function DiagnosticsPage() {
  const { id } = useParams<{ id: string }>()
  const [diags, setDiags] = useState<any[]>([])
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(FORM_INIT)
  const supabase = createClient()

  const load = async () => {
    const [dRes, pRes] = await Promise.all([
      supabase.from('diagnostics').select('*').eq('property_id', id).order('type'),
      supabase.from('properties').select('id, name, type').eq('id', id).single(),
    ])
    setDiags(dRes.data ?? [])
    setProperty(pRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const dateReal = new Date(form.date_realisation)
    const dateExp = calculerExpiration(form.type, dateReal, form.resultat || undefined)
    const { error } = await supabase.from('diagnostics').insert({
      property_id: id,
      type: form.type,
      resultat: form.resultat || null,
      valeur_dpe: form.type === 'dpe' ? (form.valeur_dpe || null) : null,
      date_realisation: form.date_realisation,
      date_expiration: dateExp ? dateExp.toISOString().split('T')[0] : null,
      cabinet: form.cabinet || null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Diagnostic enregistré')
    setShowAdd(false)
    setForm(FORM_INIT)
    load()
  }

  const dpeVal = diags.find(d => d.type === 'dpe')?.valeur_dpe as DPELettre | undefined

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/biens/${id}`} className="text-slate-400 hover:text-[var(--text-primary)] text-sm flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> {property?.name}
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">Diagnostics obligatoires</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {/* Badge DPE */}
      {dpeVal && (
        <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl ${DPE_COLORS[dpeVal].bg} ${DPE_COLORS[dpeVal].text}`}>
          <span className="font-display font-bold text-3xl">{dpeVal}</span>
          <div>
            <p className="text-sm font-semibold">{DPE_COLORS[dpeVal].label}</p>
            <p className="text-xs opacity-80">Diagnostic de Performance Énergétique</p>
          </div>
        </div>
      )}

      {/* Tableau */}
      <GlassCard>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                  {['Type','Résultat','Date réalisation','Expiration','Cabinet','Statut'].map(h =>
                    <th key={h} className="text-left py-2.5 px-3 font-medium whitespace-nowrap">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {TYPES.map(type => {
                  const diag = diags.find(d => d.type === type)
                  if (!diag) return (
                    <tr key={type} className="border-b border-white/[0.04]">
                      <td className="py-3 px-3 text-slate-400">{DIAG_LABELS[type]}</td>
                      <td colSpan={5} className="py-3 px-3">
                        <span className="text-xs text-slate-600 italic">Non renseigné</span>
                      </td>
                    </tr>
                  )
                  const statut = getStatutDiag(diag.date_expiration ? new Date(diag.date_expiration) : null)
                  return (
                    <tr key={type} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <p className="text-[var(--text-primary)] font-medium">{DIAG_LABELS[type]}</p>
                        {diag.type === 'dpe' && diag.valeur_dpe && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${DPE_COLORS[diag.valeur_dpe as DPELettre]?.bg} ${DPE_COLORS[diag.valeur_dpe as DPELettre]?.text}`}>
                            {diag.valeur_dpe}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{diag.resultat || '—'}</td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{format(new Date(diag.date_realisation), 'dd/MM/yyyy')}</td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {diag.date_expiration ? format(new Date(diag.date_expiration), 'dd/MM/yyyy') : 'Illimité'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-[120px]">{diag.cabinet || '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statut.color} ${statut.bg}`}>
                          {statut.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-[var(--surface)] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-[var(--text-primary)]">Nouveau diagnostic</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DiagType }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
                  {TYPES.map(t => <option key={t} value={t} className="bg-[var(--surface)]">{DIAG_LABELS[t]}</option>)}
                </select>
              </div>
              {form.type === 'dpe' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Classe énergétique</label>
                  <select value={form.valeur_dpe} onChange={e => setForm(f => ({ ...f, valeur_dpe: e.target.value as DPELettre }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
                    <option value="" className="bg-[var(--surface)]">—</option>
                    {(['A','B','C','D','E','F','G'] as DPELettre[]).map(l => <option key={l} value={l} className="bg-[var(--surface)]">{l}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date réalisation *</label>
                  <input type="date" value={form.date_realisation} onChange={e => setForm(f => ({ ...f, date_realisation: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cabinet</label>
                  <input type="text" placeholder="Nom du cabinet" value={form.cabinet} onChange={e => setForm(f => ({ ...f, cabinet: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Résultat</label>
                <input type="text" placeholder="Ex: négatif, classe C, 45 kWh/m²..." value={form.resultat} onChange={e => setForm(f => ({ ...f, resultat: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none" />
                {form.date_realisation && (
                  <p className="text-xs text-blue-400 mt-1">
                    Expiration calculée : {(() => { const d = calculerExpiration(form.type, new Date(form.date_realisation), form.resultat || undefined); return d ? format(d, 'dd/MM/yyyy') : 'Illimitée' })()}
                  </p>
                )}
              </div>
              <button type="submit" disabled={saving} className="w-full h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold disabled:opacity-50 transition-all">
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
