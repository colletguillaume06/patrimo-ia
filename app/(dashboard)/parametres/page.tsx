'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { Settings, Mail, Trash2, ExternalLink, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function Toggle({ checked, onChange, label, description }: { checked: boolean, onChange: (v: boolean) => void, label: string, description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 h-6 w-11 rounded-full transition-colors"
        style={{ background: checked ? '#1D4ED8' : '#CBD5E1' }}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </button>
    </div>
  )
}

export default function ParametresPage() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', iban: '', bic: '', titulaire_compte: '' })
  const [quittancesAuto, setQuittancesAuto] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
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
      setQuittancesAuto((r.data as any)?.quittances_auto ?? true)
    })
  }, [])

  const handleQuittancesToggle = async (val: boolean) => {
    setQuittancesAuto(val)
    await supabase.from('profiles').update({ quittances_auto: val } as any).eq('id', profile.id)
    toast.success(val ? 'Quittances automatiques activées' : 'Quittances automatiques désactivées')
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Supprimer définitivement votre compte et TOUTES vos données ? Cette action est irréversible.')) return
    if (!confirm('Dernière confirmation : toutes vos données immobilières, baux, loyers et documents seront supprimés.')) return
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (res.ok) {
      toast.success('Compte supprimé')
      router.push('/')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Erreur lors de la suppression')
      setDeleting(false)
    }
  }

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

      {/* Toggle global quittances */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Mail className="h-4 w-4" style={{ color: '#1D4ED8' }} /> Automatisations emails
        </h2>
        <Toggle
          checked={quittancesAuto}
          onChange={handleQuittancesToggle}
          label="Quittances automatiques"
          description="Envoie une quittance par email à chaque locataire le 1er de chaque mois (si email renseigné). Peut être désactivé bien par bien ou bail par bail."
        />
        <p className="text-xs mt-2 pt-3 border-t" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>
          Pour désactiver uniquement sur un bien spécifique : Modifier le bien → section Bail & loyer → toggle quittances.
        </p>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-400" /> Profil
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Nom complet</label>
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
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">{label}</label>
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

      {/* Liens légaux */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield className="h-4 w-4" style={{ color: '#059669' }} /> Mentions légales & confidentialité
        </h2>
        <div className="space-y-2">
          {[
            { href: '/cgu', label: "Conditions Générales d'Utilisation" },
            { href: '/confidentialite', label: 'Politique de confidentialité (RGPD)' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} target="_blank"
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
              <ExternalLink className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </Link>
          ))}
        </div>
      </GlassCard>

      {/* Zone danger */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2 text-red-500">
          <Trash2 className="h-4 w-4" /> Zone de danger
        </h2>
        <div className="p-4 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <p className="text-sm font-semibold text-red-800 mb-1">Supprimer mon compte</p>
          <p className="text-xs text-red-600 mb-4 leading-relaxed">
            Cette action supprime définitivement votre compte et toutes vos données (biens, baux, loyers, documents).
            Cette action est <strong>irréversible</strong>. Vos données seront effacées sous 30 jours conformément au RGPD.
          </p>
          <button onClick={handleDeleteAccount} disabled={deleting}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#DC2626' }}>
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Suppression...' : 'Supprimer définitivement mon compte'}
          </button>
        </div>
      </GlassCard>
    </div>
  )
}
