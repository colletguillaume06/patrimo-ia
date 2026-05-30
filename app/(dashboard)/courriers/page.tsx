'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { COURRIERS_TEMPLATES, type CourierData } from '@/lib/courriers/templates'
import { Copy, CheckCircle, X, FileText, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function CourriersPage() {
  const [selected, setSelected] = useState<typeof COURRIERS_TEMPLATES[0] | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [selectedProp, setSelectedProp] = useState('')
  const [selectedLease, setSelectedLease] = useState('')
  const [data, setData] = useState<Partial<CourierData>>({ bailleur_nom: 'Le propriétaire' })
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('properties').select('id, name, address, city').order('name').then(r => setProperties(r.data ?? []))
    supabase.from('profiles').select('full_name').single().then(r => {
      if (r.data?.full_name) setData(d => ({ ...d, bailleur_nom: r.data.full_name }))
    })
  }, [])

  useEffect(() => {
    if (!selectedProp) return
    supabase.from('leases').select('*, property:properties(name, address, city)').eq('property_id', selectedProp).then(r => setLeases(r.data ?? []))
    const prop = properties.find(p => p.id === selectedProp)
    if (prop) setData(d => ({ ...d, bien_adresse: [prop.address, prop.city].filter(Boolean).join(', ') }))
  }, [selectedProp])

  useEffect(() => {
    if (!selectedLease) return
    const lease = leases.find(l => l.id === selectedLease)
    if (lease) setData(d => ({
      ...d,
      locataire_nom: lease.tenant_name,
      loyer_actuel: lease.monthly_rent,
      depot_garantie: lease.deposit,
      date_bail: lease.start_date,
      date_fin_bail: lease.end_date ?? '',
      garant_nom: lease.garant_nom ?? '',
      garant_adresse: lease.garant_adresse ?? '',
      caution_type: lease.caution_type ?? 'solidaire',
      charges_provisions: lease.charges ? lease.charges * 12 : 0,
    }))
  }, [selectedLease])

  const texte = selected ? selected.template(data as CourierData) : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(texte)
    setCopied(true)
    toast.success('Courrier copié dans le presse-papiers')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Bibliothèque de courriers</h1>
        <p className="text-slate-400 text-sm mt-1">Modèles juridiques pré-remplis avec vos données</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des modèles */}
        <div className="space-y-2">
          {COURRIERS_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => setSelected(tpl)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === tpl.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'}`}>
              <p className="text-sm font-medium text-[var(--text-primary)]">{tpl.titre}</p>
              <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
              <div className="flex items-center gap-2 mt-2">
                {tpl.lrar && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-400">LRAR</span>}
                <span className="text-xs text-slate-600">{tpl.delai_preavis}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Zone prévisualisation */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <GlassCard>
                <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">{selected.titre}</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Bien</label>
                    <select value={selectedProp} onChange={e => setSelectedProp(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                      <option value="" className="bg-[var(--surface)]">— Sélectionner</option>
                      {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Bail / Locataire</label>
                    <select value={selectedLease} onChange={e => setSelectedLease(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                      <option value="" className="bg-[var(--surface)]">— Sélectionner</option>
                      {leases.map(l => <option key={l.id} value={l.id} className="bg-[var(--surface)]">{l.tenant_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Votre nom (bailleur)</label>
                    <input type="text" value={data.bailleur_nom ?? ''} onChange={e => setData(d => ({ ...d, bailleur_nom: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                  </div>
                </div>

                <div className="relative">
                  <pre className="text-xs text-slate-300 font-mono leading-relaxed bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {texte}
                  </pre>
                </div>

                <div className="flex gap-3 mt-4">
                  <button onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-semibold transition-all">
                    {copied ? <><CheckCircle className="h-4 w-4 text-[var(--success)]" /> Copié !</> : <><Copy className="h-4 w-4" /> Copier le courrier</>}
                  </button>
                </div>
                {selected.lrar && (
                  <p className="text-xs text-amber-400 text-center mt-2">⚠️ À envoyer en lettre recommandée avec accusé de réception</p>
                )}
              </GlassCard>
            </>
          ) : (
            <GlassCard className="py-16 text-center">
              <FileText className="h-12 w-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">Sélectionnez un modèle de courrier</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
