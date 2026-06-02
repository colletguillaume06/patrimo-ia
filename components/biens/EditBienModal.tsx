'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Save } from 'lucide-react'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import type { PropertyType } from '@/types'

const PROPERTY_TYPES: { value: PropertyType; label: string; desc: string }[] = [
  { value: 'lmnp', label: 'LMNP', desc: 'Meublé non professionnel' },
  { value: 'nu', label: 'Nu', desc: 'Location nue / foncier' },
  { value: 'sci', label: 'SCI', desc: 'Société civile immobilière' },
  { value: 'airbnb', label: 'Airbnb', desc: 'Location saisonnière' },
  { value: 'commerce', label: 'Commerce', desc: 'Bail commercial 3-6-9' },
]

interface EditBienModalProps {
  propertyId: string
  onClose: () => void
}

const SECTIONS = [
  { key: 'infos', label: '📍 Informations générales' },
  { key: 'finances', label: '💰 Finances' },
  { key: 'pret', label: '🏦 Prêt immobilier' },
]

export function EditBienModal({ propertyId, onClose }: EditBienModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('infos')
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    supabase.from('properties').select('*').eq('id', propertyId).single()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name || '',
            type: data.type || 'nu',
            address: data.address || '',
            city: data.city || '',
            postal_code: data.postal_code || '',
            surface_m2: data.surface_m2 ?? '',
                  purchase_price: data.purchase_price ?? '',
            purchase_year: data.purchase_year ?? '',
            monthly_charges: data.monthly_charges ?? 0,
            property_tax: data.property_tax ?? 0,
            insurance_annual: data.insurance_annual ?? 0,
            numero_fiscal: data.numero_fiscal || '',
            loan_monthly: data.loan_monthly ?? 0,
            pret_banque: data.pret_banque || '',
            pret_capital: data.pret_capital ?? '',
            pret_taux_annuel: data.pret_taux_annuel ?? '',
            pret_duree_mois: data.pret_duree_mois ?? '',
            pret_date_debut: data.pret_date_debut || '',
            pret_assurance_mensuelle: data.pret_assurance_mensuelle ?? 0,
          })
        }
        setLoading(false)
      })
  }, [propertyId])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('properties').update({
      name: form.name,
      type: form.type,
      address: form.address || null,
      city: form.city || null,
      postal_code: form.postal_code || null,
      surface_m2: form.surface_m2 !== '' ? Number(form.surface_m2) : null,
      purchase_price: form.purchase_price !== '' ? Number(form.purchase_price) : null,
      purchase_year: form.purchase_year !== '' ? Number(form.purchase_year) : null,
      monthly_charges: Number(form.monthly_charges) || 0,
      property_tax: Number(form.property_tax) || 0,
      insurance_annual: Number(form.insurance_annual) || 0,
      numero_fiscal: form.numero_fiscal || null,
      loan_monthly: Number(form.loan_monthly) || 0,
      pret_banque: form.pret_banque || null,
      pret_capital: form.pret_capital !== '' ? Number(form.pret_capital) : null,
      pret_taux_annuel: form.pret_taux_annuel !== '' ? Number(form.pret_taux_annuel) : null,
      pret_duree_mois: form.pret_duree_mois !== '' ? Number(form.pret_duree_mois) : null,
      pret_date_debut: form.pret_date_debut || null,
      pret_assurance_mensuelle: Number(form.pret_assurance_mensuelle) || 0,
    }).eq('id', propertyId)

    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Bien mis à jour')
    router.refresh()
    onClose()
  }

  const inputClass = "w-full h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white border border-slate-200 text-[#0F172A] placeholder:text-slate-400"

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative h-12 w-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto bg-white">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <ProfileBadge type={form.type as PropertyType} />
            <div>
              <h2 className="font-display font-bold text-lg text-[#0F172A]">Modifier le bien</h2>
              <p className="text-xs text-slate-500">{form.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Navigation sections */}
        <div className="flex border-b border-slate-200 px-6">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className="px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                color: activeSection === s.key ? '#1D4ED8' : '#64748B',
                borderBottom: activeSection === s.key ? '2px solid #1D4ED8' : '2px solid transparent',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* SECTION 1 — Informations générales */}
          {activeSection === 'infos' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Nom du bien *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} placeholder="Ex: Studio Montmartre" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Type de bien *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROPERTY_TYPES.map(({ value, label, desc }) => (
                    <button key={value} type="button"
                      onClick={() => set('type', value)}
                      className="flex items-center gap-2 p-3 rounded-xl border transition-all text-left"
                      style={{
                        borderColor: form.type === value ? '#1D4ED8' : '#E2E8F0',
                        background: form.type === value ? '#EFF6FF' : 'white',
                      }}>
                      <ProfileBadge type={value} />
                      <div>
                        <p className="text-xs font-semibold text-[#0F172A]">{label}</p>
                        <p className="text-[10px] text-slate-500">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Adresse</label>
                  <input value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} placeholder="18 rue Lepic" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Code postal</label>
                  <input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} className={inputClass} placeholder="75018" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Ville</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="Paris" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Surface (m²)</label>
                  <input type="number" value={form.surface_m2} onChange={e => set('surface_m2', e.target.value)} className={inputClass} placeholder="65" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Numéro fiscal</label>
                  <input value={form.numero_fiscal} onChange={e => set('numero_fiscal', e.target.value)} className={inputClass} placeholder="0614801..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Année d'achat</label>
                  <input type="number" value={form.purchase_year} onChange={e => set('purchase_year', e.target.value)} className={inputClass} placeholder="2019" />
                </div>
              </div>
            </>
          )}

          {/* SECTION 2 — Finances */}
          {activeSection === 'finances' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Prix d'achat (€)</label>
                  <input type="number" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} className={inputClass} placeholder="185000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Charges mensuelles (€)</label>
                  <input type="number" value={form.monthly_charges} onChange={e => set('monthly_charges', e.target.value)} className={inputClass} placeholder="120" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Taxe foncière annuelle (€)</label>
                  <input type="number" value={form.property_tax} onChange={e => set('property_tax', e.target.value)} className={inputClass} placeholder="900" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Assurance annuelle (€)</label>
                  <input type="number" value={form.insurance_annual} onChange={e => set('insurance_annual', e.target.value)} className={inputClass} placeholder="350" />
                </div>
              </div>
            </>
          )}

          {/* SECTION 3 — Prêt */}
          {activeSection === 'pret' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Banque</label>
                  <input value={form.pret_banque} onChange={e => set('pret_banque', e.target.value)} className={inputClass} placeholder="BNP Paribas" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Capital emprunté (€)</label>
                  <input type="number" value={form.pret_capital} onChange={e => set('pret_capital', e.target.value)} className={inputClass} placeholder="150000" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Taux annuel (%)</label>
                  <input type="number" step="0.01" value={form.pret_taux_annuel} onChange={e => set('pret_taux_annuel', e.target.value)} className={inputClass} placeholder="2.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Durée (mois)</label>
                  <input type="number" value={form.pret_duree_mois} onChange={e => set('pret_duree_mois', e.target.value)} className={inputClass} placeholder="240" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Assurance/mois (€)</label>
                  <input type="number" value={form.pret_assurance_mensuelle} onChange={e => set('pret_assurance_mensuelle', e.target.value)} className={inputClass} placeholder="45" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Date 1ère échéance</label>
                <input type="date" value={form.pret_date_debut} onChange={e => set('pret_date_debut', e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-[#0F172A]">Mensualité crédit (€)</label>
                <input type="number" value={form.loan_monthly} onChange={e => set('loan_monthly', e.target.value)} className={inputClass} placeholder="650" />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl border text-sm text-slate-500 border-slate-200">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: '#1D4ED8' }}>
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
