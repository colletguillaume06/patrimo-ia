'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { UploadBail } from '@/components/baux/UploadBail'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, Plus, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function BauxPage() {
  const [leases, setLeases] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedProp, setSelectedProp] = useState('')
  const [form, setForm] = useState({
    tenant_name: '', tenant_email: '', tenant_phone: '',
    monthly_rent: '', charges: '', deposit: '',
    start_date: '', end_date: '',
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
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Bail ajouté')
      setShowAdd(false)
      setForm({ tenant_name: '', tenant_email: '', tenant_phone: '', monthly_rent: '', charges: '', deposit: '', start_date: '', end_date: '' })
      load()
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Baux</h1>
          <p className="text-slate-400 text-sm mt-1">{leases.length} bail{leases.length > 1 ? 'x' : ''} enregistré{leases.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all"
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
                      <p className="text-sm font-semibold text-white">{lease.tenant_name}</p>
                      {lease.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Actif
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 bg-white/[0.06] px-2 py-0.5 rounded-full">Terminé</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{lease.property?.name} · {lease.property?.city}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-semibold text-white">{formatCurrency(lease.monthly_rent)}/mois</span>
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
                    {lease.pdf_url && (
                      <a
                        href={lease.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10] transition-colors"
                      >
                        <FileText className="h-4 w-4 text-slate-400" />
                      </a>
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg bg-[#111E35] border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-white text-lg">Nouveau bail</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
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
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none focus:border-blue-500/50"
                >
                  <option value="" className="bg-[#111E35]">Sélectionner un bien</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#111E35]">{p.name}</option>
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
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold mt-2"
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
