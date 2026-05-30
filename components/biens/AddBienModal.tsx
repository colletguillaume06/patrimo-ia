'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import type { PropertyType } from '@/types'
import { Info } from 'lucide-react'

const PROPERTY_TYPES: { value: PropertyType; label: string; desc: string }[] = [
  { value: 'lmnp', label: 'LMNP', desc: 'Meublé non professionnel' },
  { value: 'nu', label: 'Nu', desc: 'Location nue / foncier' },
  { value: 'sci', label: 'SCI', desc: 'Société civile immobilière' },
  { value: 'airbnb', label: 'Airbnb', desc: 'Location saisonnière' },
  { value: 'commerce', label: 'Commerce', desc: 'Bail commercial 3-6-9' },
]

interface AddBienModalProps {
  onClose: () => void
}

export function AddBienModal({ onClose }: AddBienModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: '' as PropertyType | '',
    name: '',
    address: '',
    city: '',
    postal_code: '',
    surface_m2: '',
    purchase_price: '',
    purchase_year: '',
    monthly_charges: '',
    property_tax: '',
    insurance_annual: '',
    numero_fiscal: '',
    loan_monthly: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Non connecté'); return }

    const { error } = await supabase.from('properties').insert({
      user_id: user.id,
      type: form.type,
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      postal_code: form.postal_code || null,
      surface_m2: form.surface_m2 ? Number(form.surface_m2) : null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      purchase_year: form.purchase_year ? Number(form.purchase_year) : null,
      monthly_charges: Number(form.monthly_charges) || 0,
      property_tax: Number(form.property_tax) || 0,
      insurance_annual: Number(form.insurance_annual) || 0,
      loan_monthly: Number(form.loan_monthly) || 0,
      numero_fiscal: form.numero_fiscal || null,
    })

    setLoading(false)
    if (error) {
      toast.error('Erreur : ' + error.message)
    } else {
      toast.success('Bien ajouté avec succès !')
      router.refresh()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--surface)] border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-[var(--text-primary)] text-lg">
            {step === 'type' ? 'Type de bien' : 'Informations'}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10] transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {step === 'type' ? (
          <div className="space-y-2">
            {PROPERTY_TYPES.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => { set('type', value); setStep('details') }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-blue-500/30 transition-all text-left"
              >
                <ProfileBadge type={value} />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 mb-4 p-3 bg-white/[0.03] rounded-lg">
              <ProfileBadge type={form.type as PropertyType} />
              <button type="button" onClick={() => setStep('type')} className="text-xs text-blue-400 hover:text-blue-300">
                Changer
              </button>
            </div>

            {[
              { key: 'name', label: 'Nom du bien *', placeholder: 'Ex: Studio Montmartre', required: true },
              { key: 'address', label: 'Adresse', placeholder: '18 rue Lepic' },
              { key: 'city', label: 'Ville', placeholder: 'Paris' },
              { key: 'postal_code', label: 'Code postal', placeholder: '75018' },
              { key: 'surface_m2', label: 'Surface (m²)', placeholder: '28', type: 'number' },
              { key: 'purchase_price', label: "Prix d'acquisition (€)", placeholder: '185000', type: 'number' },
              { key: 'purchase_year', label: "Année d'achat", placeholder: '2020', type: 'number' },
              { key: 'monthly_charges', label: 'Charges mensuelles (€)', placeholder: '120', type: 'number' },
              { key: 'property_tax', label: 'Taxe foncière annuelle (€)', placeholder: '800', type: 'number' },
              { key: 'insurance_annual', label: 'Assurance annuelle (€)', placeholder: '350', type: 'number' },
              { key: 'loan_monthly', label: 'Mensualité crédit (€)', placeholder: '650', type: 'number' },
            ].map(({ key, label, placeholder, type = 'text', required }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={e => set(key, e.target.value)}
                  required={required}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            ))}

            {/* Numéro fiscal */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs text-slate-400">Numéro fiscal du bien</label>
                <div className="group relative">
                  <Info className="h-3.5 w-3.5 text-slate-600 cursor-help" />
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-56 px-3 py-2 bg-[var(--bg)] border border-white/[0.10] rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                    Numéro à 13 chiffres, visible sur votre taxe foncière
                  </div>
                </div>
              </div>
              <input
                type="text"
                placeholder="Ex : 0012345678901"
                value={form.numero_fiscal}
                onChange={e => set('numero_fiscal', e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('type')}
                className="flex-1 h-10 rounded-lg border border-white/[0.10] text-slate-400 hover:text-[var(--text-primary)] text-sm transition-all"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Ajout...' : <><Plus className="h-4 w-4" /> Ajouter</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
