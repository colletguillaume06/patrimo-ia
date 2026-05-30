'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { UploadBail } from '@/components/baux/UploadBail'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, Plus, X, CheckCircle2, Info, Eye, Download } from 'lucide-react'
import { toast } from 'sonner'
import { INDICES_IRL, INDICES_ILC, INDICES_ILAT, getIndicesList } from '@/lib/fiscal/indices'

export default function BauxPage() {
  const [leases, setLeases] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedProp, setSelectedProp] = useState('')
  const [form, setForm] = useState({
    tenant_name: '', tenant_email: '', tenant_phone: '',
    monthly_rent: '', charges: '', deposit: '',
    start_date: '', end_date: '',
    irl_reference_indice: 'irl',
    irl_reference_valeur: '',
    irl_reference_trimestre: '',
    irl_reference_annee: '',
  })
  const supabase = createClient()

  const load = async () => {
    const [leasesRes, propsRes] = await Promise.all([
      supabase.from('leases').select('*, property:properties(name, city, type)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name, type').order('name'),
    ])
    setLeases(leasesRes.data ?? [])
    setProperties(propsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('leases').insert({
      property_id: selectedProp,
      tenant_name: form.tenant_name,
      tenant_email: form.tenant_email || null,
      tenant_phone: form.tenant_phone || null,
      monthly_rent: Number(form.monthly_rent),
      charges: Number(form.charges) || 0,
      deposit: Number(form.deposit) || 0,
      start_date: form.start_date,
      end_date: form.end_date || null,
      is_active: true,
      irl_reference_indice: form.irl_reference_indice || 'irl',
      irl_reference_valeur: form.irl_reference_valeur ? Number(form.irl_reference_valeur) : null,
      irl_reference_trimestre: form.irl_reference_trimestre ? Number(form.irl_reference_trimestre) : null,
      irl_reference_annee: form.irl_reference_annee ? Number(form.irl_reference_annee) : null,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Bail ajouté')
      setShowAdd(false)
      setForm({ tenant_name: '', tenant_email: '', tenant_phone: '', monthly_rent: '', charges: '', deposit: '', start_date: '', end_date: '', irl_reference_indice: 'irl', irl_reference_valeur: '', irl_reference_trimestre: '', irl_reference_annee: '' })
      load()
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Baux</h1>
          <p className="text-slate-400 text-sm mt-1">{leases.length} bail{leases.length > 1 ? 'x' : ''} enregistré{leases.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all"
        >
          <Plus className="h-4 w-4" /> Nouveau bail
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {leases.map(lease => {
            const monthsLeft = lease.end_date ? differenceInMonths(new Date(lease.end_date), new Date()) : null
            const expiresoon = monthsLeft !== null && monthsLeft <= 3

            return (
              <GlassCard key={lease.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{lease.tenant_name}</p>
                      {lease.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-[var(--success)] bg-[var(--success-bg)] border border-[var(--success)/20] px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Actif
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 bg-bg-secondary px-2 py-0.5 rounded-full">Terminé</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{lease.property?.name} · {lease.property?.city}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(lease.monthly_rent)}/mois</span>
                      <span className="text-xs text-slate-500">Début : {format(new Date(lease.start_date), 'dd/MM/yyyy')}</span>
                      {lease.end_date && (
                        <span className={`text-xs ${expiresoon ? 'text-amber-400' : 'text-slate-500'}`}>
                          Fin : {format(new Date(lease.end_date), 'dd/MM/yyyy')}
                          {expiresoon && ` (dans ${monthsLeft} mois)`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {lease.pdf_url ? (
                      <>
                        <button
                          onClick={() => setPreviewUrl(lease.pdf_url)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" /> Voir
                        </button>
                        <a
                          href={lease.pdf_url}
                          download
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-secondary hover:bg-bg-secondary border border-white/[0.08] text-slate-300 text-xs font-medium transition-all"
                        >
                          <Download className="h-3.5 w-3.5" /> Télécharger
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Pas de PDF</span>
                    )}
                  </div>
                </div>
                {lease.parsed_data && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-xs text-blue-400 font-medium mb-1.5">📋 Données extraites par IA</p>
                    <div className="flex flex-wrap gap-2">
                      {lease.parsed_data.clauses_importantes?.slice(0, 3).map((clause: string, i: number) => (
                        <span key={i} className="text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                          {clause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            )
          })}

          {leases.length === 0 && !loading && (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">Aucun bail enregistré</p>
            </div>
          )}
        </div>
      )}

      {/* Modale de prévisualisation PDF */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewUrl(null)} />
          <div className="relative w-full max-w-4xl h-[90vh] bg-[var(--surface)] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <p className="font-medium text-[var(--text-primary)] text-sm">Bail PDF</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  download
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-xs font-medium transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </a>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-secondary hover:bg-bg-secondary border border-white/[0.08] text-slate-300 text-xs font-medium transition-all"
                >
                  <Eye className="h-3.5 w-3.5" /> Ouvrir dans un onglet
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-secondary transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
            <iframe
              src={previewUrl}
              className="flex-1 w-full"
              title="Bail PDF"
            />
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg bg-[var(--surface)] border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-[var(--text-primary)] text-lg">Nouveau bail</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bien *</label>
                <select
                  value={selectedProp}
                  onChange={e => setSelectedProp(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50"
                >
                  <option value="" className="bg-[var(--surface)]">Sélectionner un bien</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>
                  ))}
                </select>
              </div>
              {[
                { key: 'tenant_name', label: 'Nom du locataire *', required: true },
                { key: 'tenant_email', label: 'Email', type: 'email' },
                { key: 'tenant_phone', label: 'Téléphone' },
                { key: 'monthly_rent', label: 'Loyer mensuel (€) *', type: 'number', required: true },
                { key: 'charges', label: 'Charges (€)', type: 'number' },
                { key: 'deposit', label: 'Dépôt de garantie (€)', type: 'number' },
                { key: 'start_date', label: 'Date début *', type: 'date', required: true },
                { key: 'end_date', label: 'Date fin (optionnel)', type: 'date' },
              ].map(({ key, label, type = 'text', required }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              ))}
              {/* Section indice de référence */}
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-3">
                  <p className="text-xs font-medium text-slate-300">Indice de référence à la signature</p>
                  <div className="group relative">
                    <Info className="h-3.5 w-3.5 text-slate-600 cursor-help" />
                    <div className="absolute bottom-5 left-0 w-64 px-3 py-2 bg-[var(--bg)] border border-border rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Ces informations figurent dans votre bail, clause d'indexation. Elles permettent le calcul exact de la révision annuelle.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Indice utilisé</label>
                    <select
                      value={form.irl_reference_indice}
                      onChange={e => setForm(f => ({ ...f, irl_reference_indice: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="irl" className="bg-[var(--surface)]">IRL — location nue/meublée</option>
                      <option value="ilc" className="bg-[var(--surface)]">ILC — local commercial</option>
                      <option value="ilat" className="bg-[var(--surface)]">ILAT — tertiaire</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Valeur de l'indice</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex : 141.36"
                      value={form.irl_reference_valeur}
                      onChange={e => setForm(f => ({ ...f, irl_reference_valeur: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm font-mono focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Trimestre de référence</label>
                    <select
                      value={form.irl_reference_trimestre}
                      onChange={e => setForm(f => ({ ...f, irl_reference_trimestre: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="" className="bg-[var(--surface)]">— Trimestre</option>
                      <option value="1" className="bg-[var(--surface)]">T1 (janv.–mars)</option>
                      <option value="2" className="bg-[var(--surface)]">T2 (avr.–juin)</option>
                      <option value="3" className="bg-[var(--surface)]">T3 (juil.–sept.)</option>
                      <option value="4" className="bg-[var(--surface)]">T4 (oct.–déc.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Année de référence</label>
                    <input
                      type="number"
                      placeholder="Ex : 2024"
                      value={form.irl_reference_annee}
                      onChange={e => setForm(f => ({ ...f, irl_reference_annee: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold mt-2"
              >
                <Plus className="h-4 w-4" /> Créer le bail
              </button>
            </form>

            {selectedProp && (
              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <p className="text-xs text-slate-400 mb-3">Ou analysez un bail PDF existant avec l'IA</p>
                <UploadBail
                  propertyId={selectedProp}
                  onSuccess={data => { toast.success('PDF analysé'); load() }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
