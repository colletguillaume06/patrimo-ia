'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sparkles, User, Building2, FileText, ArrowRight, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Votre profil', icon: User },
  { id: 2, label: 'Premier bien', icon: Building2 },
  { id: 3, label: 'Premier bail', icon: FileText },
]

const PROPERTY_TYPES = [
  { value: 'lmnp', label: 'LMNP', desc: 'Meublé non professionnel', color: '#10B981' },
  { value: 'nu', label: 'Foncier nu', desc: 'Location nue classique', color: '#1A56DB' },
  { value: 'sci', label: 'SCI', desc: 'Société civile immobilière', color: '#06B6D4' },
  { value: 'airbnb', label: 'Airbnb', desc: 'Location saisonnière', color: '#F59E0B' },
  { value: 'commerce', label: 'Commerce', desc: 'Bail commercial 3-6-9', color: '#8B5CF6' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [propertyId, setPropertyId] = useState<string | null>(null)

  const [profile, setProfile] = useState({ full_name: '' })
  const [property, setProperty] = useState({
    type: '', name: '', city: '', surface_m2: '', purchase_price: '', monthly_charges: '', loan_monthly: '',
  })
  const [lease, setLease] = useState({
    tenant_name: '', tenant_email: '', monthly_rent: '', start_date: '',
  })

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user.id)
    setLoading(false)
    setStep(2)
  }

  const handleProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('properties').insert({
      user_id: user.id,
      type: property.type,
      name: property.name,
      city: property.city || null,
      surface_m2: property.surface_m2 ? Number(property.surface_m2) : null,
      purchase_price: property.purchase_price ? Number(property.purchase_price) : null,
      monthly_charges: Number(property.monthly_charges) || 0,
      loan_monthly: Number(property.loan_monthly) || 0,
    }).select().single()
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setPropertyId(data.id)
    setStep(3)
  }

  const handleLease = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propertyId) return
    setLoading(true)
    await supabase.from('leases').insert({
      property_id: propertyId,
      tenant_name: lease.tenant_name,
      tenant_email: lease.tenant_email || null,
      monthly_rent: Number(lease.monthly_rent),
      start_date: lease.start_date,
      is_active: true,
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    setLoading(false)
    setStep(4)
  }

  const handleSkipLease = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0B1628] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-500/6 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white">Propilot <span className="text-blue-400">AI</span></span>
        </div>

        {/* Stepper */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  step === s.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                  step > s.id ? 'text-green-400' : 'text-slate-600'
                }`}>
                  {step > s.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <div className="h-px w-6 bg-white/[0.08]" />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">

          {/* Étape 1 — Profil */}
          {step === 1 && (
            <>
              <h1 className="font-display font-bold text-2xl text-white mb-1">Bienvenue 👋</h1>
              <p className="text-slate-400 text-sm mb-6">Comment souhaitez-vous être appelé ?</p>
              <form onSubmit={handleProfile} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Votre nom complet</label>
                  <input
                    type="text"
                    placeholder="Jean Dupont"
                    value={profile.full_name}
                    onChange={e => setProfile({ full_name: e.target.value })}
                    required
                    autoFocus
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50">
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {/* Étape 2 — Premier bien */}
          {step === 2 && (
            <>
              <h1 className="font-display font-bold text-2xl text-white mb-1">Votre premier bien</h1>
              <p className="text-slate-400 text-sm mb-6">Quel type de bien souhaitez-vous gérer ?</p>

              {!property.type ? (
                <div className="space-y-2">
                  {PROPERTY_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setProperty(p => ({ ...p, type: t.value }))}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.16] bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left"
                    >
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${t.color}20` }}>
                        <Building2 className="h-4 w-4" style={{ color: t.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.label}</p>
                        <p className="text-xs text-slate-500">{t.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-600 ml-auto" />
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleProperty} className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2.5 py-1 rounded-full border text-blue-400 border-blue-400/30 bg-blue-400/10">
                      {PROPERTY_TYPES.find(t => t.value === property.type)?.label}
                    </span>
                    <button type="button" onClick={() => setProperty(p => ({ ...p, type: '' }))} className="text-xs text-slate-500 hover:text-slate-300">
                      Changer
                    </button>
                  </div>
                  {[
                    { key: 'name', label: 'Nom du bien *', placeholder: 'Ex: Studio Montmartre', required: true },
                    { key: 'city', label: 'Ville', placeholder: 'Paris' },
                    { key: 'surface_m2', label: 'Surface (m²)', placeholder: '45', type: 'number' },
                    { key: 'purchase_price', label: "Prix d'achat (€)", placeholder: '200000', type: 'number' },
                    { key: 'monthly_charges', label: 'Charges mensuelles (€)', placeholder: '150', type: 'number' },
                    { key: 'loan_monthly', label: 'Mensualité crédit (€)', placeholder: '800', type: 'number' },
                  ].map(({ key, label, placeholder, type = 'text', required }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-400 mb-1">{label}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={(property as any)[key]}
                        onChange={e => setProperty(p => ({ ...p, [key]: e.target.value }))}
                        required={required}
                        className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  ))}
                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50 mt-2">
                    {loading ? 'Enregistrement...' : <> Continuer <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Étape 3 — Premier bail */}
          {step === 3 && (
            <>
              <h1 className="font-display font-bold text-2xl text-white mb-1">Votre locataire</h1>
              <p className="text-slate-400 text-sm mb-6">Optionnel — vous pouvez le faire plus tard.</p>
              <form onSubmit={handleLease} className="space-y-3">
                {[
                  { key: 'tenant_name', label: 'Nom du locataire *', required: true },
                  { key: 'tenant_email', label: 'Email', type: 'email' },
                  { key: 'monthly_rent', label: 'Loyer mensuel (€) *', type: 'number', required: true },
                  { key: 'start_date', label: 'Date de début *', type: 'date', required: true },
                ].map(({ key, label, type = 'text', required }) => (
                  <div key={key}>
                    <label className="block text-xs text-slate-400 mb-1">{label}</label>
                    <input
                      type={type}
                      value={(lease as any)[key]}
                      onChange={e => setLease(l => ({ ...l, [key]: e.target.value }))}
                      required={required}
                      className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                ))}
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50 mt-2">
                  {loading ? 'Enregistrement...' : <> Terminer la configuration <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
              <button onClick={handleSkipLease} className="w-full text-center text-sm text-slate-500 hover:text-slate-300 mt-3 transition-colors">
                Passer cette étape →
              </button>
            </>
          )}

          {/* Succès */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-2xl bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="font-display font-bold text-2xl text-white mb-2">C'est parti ! 🚀</h1>
              <p className="text-slate-400 text-sm mb-8">
                Votre compte est configuré. Découvrez votre tableau de bord.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all"
              >
                Ouvrir mon tableau de bord <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
