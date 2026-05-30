'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChevronLeft, Plus, X, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function CopropriétéPage() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<any>(null)
  const [appels, setAppels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syndicForm, setSyndicForm] = useState({
    copro_syndic_nom: '', copro_syndic_email: '', copro_syndic_telephone: '',
    copro_tantiemes: '', copro_charges_trimestrielles: '', copro_prochaine_ag: '',
  })
  const [appelForm, setAppelForm] = useState({ date_appel: '', montant: '', type: 'charges_courantes', description: '' })
  const supabase = createClient()

  const load = async () => {
    const [pRes, aRes] = await Promise.all([
      supabase.from('properties').select('id, name, copro_syndic_nom, copro_syndic_email, copro_syndic_telephone, copro_tantiemes, copro_charges_trimestrielles, copro_prochaine_ag').eq('id', id).single(),
      supabase.from('copro_appels_fonds').select('*').eq('property_id', id).order('date_appel', { ascending: false }),
    ])
    setProperty(pRes.data)
    setAppels(aRes.data ?? [])
    if (pRes.data) {
      setSyndicForm({
        copro_syndic_nom: pRes.data.copro_syndic_nom ?? '',
        copro_syndic_email: pRes.data.copro_syndic_email ?? '',
        copro_syndic_telephone: pRes.data.copro_syndic_telephone ?? '',
        copro_tantiemes: String(pRes.data.copro_tantiemes ?? ''),
        copro_charges_trimestrielles: String(pRes.data.copro_charges_trimestrielles ?? ''),
        copro_prochaine_ag: pRes.data.copro_prochaine_ag ?? '',
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const saveSyndic = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('properties').update({
      ...syndicForm,
      copro_tantiemes: Number(syndicForm.copro_tantiemes) || null,
      copro_charges_trimestrielles: Number(syndicForm.copro_charges_trimestrielles) || null,
    }).eq('id', id)
    setSaving(false); toast.success('Copropriété mise à jour'); load()
  }

  const addAppel = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('copro_appels_fonds').insert({ property_id: id, ...appelForm, montant: Number(appelForm.montant) })
    setSaving(false); toast.success('Appel de fonds ajouté'); setShowAdd(false)
    setAppelForm({ date_appel: '', montant: '', type: 'charges_courantes', description: '' }); load()
  }

  const togglePaye = async (appel: any) => {
    await supabase.from('copro_appels_fonds').update({ paye: !appel.paye }).eq('id', appel.id)
    load()
  }

  const now = new Date()
  const totalAnnee = appels.filter(a => new Date(a.date_appel).getFullYear() === now.getFullYear()).reduce((s, a) => s + a.montant, 0)
  const nonPaye = appels.filter(a => !a.paye).reduce((s, a) => s + a.montant, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/biens/${id}`} className="text-slate-400 hover:text-[var(--text-primary)] text-sm flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> {property?.name}</Link>
        <span className="text-slate-600">/</span>
        <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">Copropriété</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Charges ${now.getFullYear()}`, value: formatCurrency(totalAnnee), color: 'text-[var(--text-primary)]' },
          { label: 'Non payé', value: formatCurrency(nonPaye), color: 'text-amber-400' },
          { label: 'Charges trimestrielles', value: property?.copro_charges_trimestrielles ? formatCurrency(property.copro_charges_trimestrielles) : '—', color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Syndic */}
      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Informations syndic</h2>
        <form onSubmit={saveSyndic} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'copro_syndic_nom', label: 'Nom du syndic', placeholder: 'Foncia, Nexity...' },
              { key: 'copro_syndic_email', label: 'Email syndic', type: 'email' },
              { key: 'copro_syndic_telephone', label: 'Téléphone' },
              { key: 'copro_tantiemes', label: 'Tantièmes', placeholder: '120', type: 'number' },
              { key: 'copro_charges_trimestrielles', label: 'Charges trimestrielles (€)', type: 'number' },
              { key: 'copro_prochaine_ag', label: 'Prochaine AG', type: 'date' },
            ].map(({ key, label, placeholder, type = 'text' }: any) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type={type} placeholder={placeholder} value={(syndicForm as any)[key]}
                  onChange={e => setSyndicForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} className="h-9 px-6 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold disabled:opacity-50">Enregistrer</button>
        </form>
      </GlassCard>

      {/* Appels de fonds */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--text-primary)]">Appels de fonds</h2>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
        {appels.length === 0 ? <p className="text-sm text-slate-500">Aucun appel de fonds</p> : (
          <div className="space-y-2">
            {appels.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <button onClick={() => togglePaye(a)} className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${a.paye ? 'bg-green-400 border-green-400' : 'border-slate-600'}`}>
                  {a.paye && <CheckCircle2 className="h-3 w-3 text-[var(--text-primary)]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)]">{a.description || a.type.replace('_', ' ')}</p>
                  <p className="text-xs text-slate-500">{format(new Date(a.date_appel), 'dd/MM/yyyy')} · {a.type === 'charges_courantes' ? 'Charges courantes' : a.type === 'travaux_votes' ? 'Travaux votés' : 'Fonds travaux'}</p>
                </div>
                <p className={`text-sm font-semibold ${a.paye ? 'text-[var(--success)]' : 'text-amber-400'}`}>{formatCurrency(a.montant)}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-[var(--surface)] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-[var(--text-primary)]">Appel de fonds</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addAppel} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Date *</label><input type="date" value={appelForm.date_appel} onChange={e => setAppelForm(f => ({ ...f, date_appel: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Montant (€) *</label><input type="number" value={appelForm.montant} onChange={e => setAppelForm(f => ({ ...f, montant: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Type</label>
                <select value={appelForm.type} onChange={e => setAppelForm(f => ({ ...f, type: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                  <option value="charges_courantes" className="bg-[var(--surface)]">Charges courantes</option>
                  <option value="travaux_votes" className="bg-[var(--surface)]">Travaux votés</option>
                  <option value="fonds_travaux" className="bg-[var(--surface)]">Fonds travaux</option>
                </select>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Description</label><input type="text" value={appelForm.description} onChange={e => setAppelForm(f => ({ ...f, description: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" /></div>
              <button type="submit" disabled={saving} className="w-full h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold disabled:opacity-50">Ajouter</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
