'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'

export default function ParametresPage() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', iban: '', bic: '', titulaire_compte: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('profiles').select('*').single().then(r => {
      setProfile(r.data)
      setForm({
        full_name: r.data?.full_name ?? '',
        iban: (r.data as any)?.iban ?? '',
        bic: (r.data as any)?.bic ?? '',
        titulaire_compte: (r.data as any)?.titulaire_compte ?? '',
      })
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('profiles').update(form).eq('id', profile.id)
    setSaving(false); toast.success('Paramètres enregistrés')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Paramètres</h1>
        <p className="text-slate-400 text-sm mt-1">Vos informations personnelles et coordonnées bancaires</p>
      </div>

      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-400" /> Profil
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nom complet</label>
            <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
          </div>

          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-400 mb-3 font-medium">Coordonnées bancaires (injectées dans les appels de loyer et quittances)</p>
            {[
              { key: 'titulaire_compte', label: 'Titulaire du compte', placeholder: 'Jean Dupont' },
              { key: 'iban', label: 'IBAN', placeholder: 'FR76 3000 4000 0100 0000 0000 123' },
              { key: 'bic', label: 'BIC / SWIFT', placeholder: 'BNPAFRPP' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="mb-3">
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type="text" placeholder={placeholder} value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none font-mono" />
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving} className="h-10 px-6 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold disabled:opacity-50 transition-all">
            {saving ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </form>
      </GlassCard>
    </div>
  )
}
