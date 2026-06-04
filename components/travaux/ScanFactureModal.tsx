'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, Upload, Loader2, CheckCircle, X, Sparkles } from 'lucide-react'

interface ScanFactureModalProps {
  propertyId?: string
  onClose: () => void
  onSaved?: () => void
}

const CAT_LABELS: Record<string, string> = {
  travaux_deductibles: 'Travaux déductibles',
  travaux_amortissables: 'Travaux amortissables',
  charges: 'Charges',
  assurance: 'Assurance',
  gestion: 'Frais de gestion',
  taxe_fonciere: 'Taxe foncière',
  autre: 'Autre',
}

export function ScanFactureModal({ propertyId, onClose, onSaved }: ScanFactureModalProps) {
  const [step, setStep] = useState<'upload' | 'scanning' | 'confirm' | 'saving'>('upload')
  const [preview, setPreview] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [extracted, setExtracted] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProp, setSelectedProp] = useState(propertyId || '')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useState(() => {
    if (!propertyId) {
      supabase.from('properties').select('id, name').order('name').then(r => setProperties(r.data ?? []))
    }
  })

  const handleFile = async (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
    setStep('scanning')

    const fd = new FormData()
    fd.append('file', f)

    const res = await fetch('/api/scan/facture', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Erreur scan')
      setStep('upload')
      return
    }

    setExtracted(data.data)
    setForm({
      montant: data.data.montant_ttc || '',
      date: data.data.date || new Date().toISOString().split('T')[0],
      description: data.data.description || '',
      fournisseur: data.data.fournisseur || '',
      category: data.data.categorie || 'charges',
    })
    setStep('confirm')
  }

  const handleSave = async () => {
    if (!selectedProp && !propertyId) { toast.error('Sélectionnez un bien'); return }
    setStep('saving')

    const { error } = await supabase.from('expenses').insert({
      property_id: selectedProp || propertyId,
      amount: parseFloat(String(form.montant)) || 0,
      date: form.date,
      description: `${form.fournisseur ? form.fournisseur + ' — ' : ''}${form.description}`,
      category: form.category,
      deductible: ['travaux_deductibles', 'charges', 'assurance', 'gestion', 'taxe_fonciere'].includes(form.category),
    })

    if (error) { toast.error(error.message); setStep('confirm'); return }
    toast.success('Facture enregistrée ✓')
    onSaved?.()
    onClose()
  }

  const inputClass = "w-full h-10 px-3 rounded-lg text-sm focus:outline-none bg-white border border-slate-200 text-[#0F172A]"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== 'scanning' && step !== 'saving' ? onClose : undefined} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" style={{ color: '#1D4ED8' }} />
            <h2 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Scanner une facture</h2>
          </div>
          {step !== 'scanning' && step !== 'saving' && (
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <X className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <Camera className="h-10 w-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Photographiez ou importez la facture</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>JPG, PNG — L'IA extrait automatiquement le montant et les détails</p>
              </div>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
            </div>
          )}

          {/* SCANNING */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {preview && <img src={preview} className="max-h-32 rounded-lg mb-4 object-contain" alt="facture" />}
              <div className="h-12 w-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)' }}>
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Analyse en cours...</p>
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Sparkles className="h-3 w-3" /> Claude lit votre facture
              </p>
            </div>
          )}

          {/* CONFIRMATION */}
          {step === 'confirm' && (
            <div className="space-y-4">
              {/* Aperçu confiance */}
              {extracted?.confiance && (
                <div className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: extracted.confiance === 'haute' ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${extracted.confiance === 'haute' ? '#86EFAC' : '#FCD34D'}` }}>
                  <Sparkles className="h-3.5 w-3.5" style={{ color: extracted.confiance === 'haute' ? '#059669' : '#D97706' }} />
                  <span className="text-xs font-medium" style={{ color: extracted.confiance === 'haute' ? '#059669' : '#D97706' }}>
                    Confiance {extracted.confiance} — vérifiez et corrigez si besoin
                  </span>
                </div>
              )}

              {/* Bien */}
              {!propertyId && (
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Bien concerné *</label>
                  <select value={selectedProp} onChange={e => setSelectedProp(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none bg-white border border-slate-200 text-[#0F172A]">
                    <option value="">— Sélectionner</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Montant TTC (€) *</label>
                  <input type="number" step="0.01" value={form.montant}
                    onChange={e => setForm((f: any) => ({ ...f, montant: e.target.value }))}
                    className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Date *</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Fournisseur</label>
                <input type="text" value={form.fournisseur}
                  onChange={e => setForm((f: any) => ({ ...f, fournisseur: e.target.value }))}
                  className={inputClass} placeholder="Nom de l'entreprise" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Description</label>
                <input type="text" value={form.description}
                  onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                  className={inputClass} placeholder="Nature des travaux ou services" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Catégorie</label>
                <select value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none bg-white border border-slate-200 text-[#0F172A]">
                  {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('upload')} className="flex-1 h-10 rounded-xl border text-sm text-slate-500 border-slate-200">
                  Scanner autre
                </button>
                <button onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-white text-sm font-semibold"
                  style={{ background: '#1D4ED8' }}>
                  <CheckCircle className="h-4 w-4" /> Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* SAVING */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: '#1D4ED8' }} />
              <p style={{ color: 'var(--text-primary)' }}>Enregistrement...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
