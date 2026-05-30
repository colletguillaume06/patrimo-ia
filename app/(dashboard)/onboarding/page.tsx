'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, ArrowRight, ArrowLeft, CheckCircle2,
  User, Building2, Calculator, Rocket
} from 'lucide-react'

type Objectif = 'debutant' | 'experimente' | 'familial'
type NbBiens = '1-3' | '4-10' | '10+'
type TypeBien = 'lmnp' | 'sci' | 'airbnb' | 'nu' | 'commerce'
type TMI = '11' | '30' | '41' | '45'
type RegimeFiscal = 'lmnp_reel' | 'micro_bic' | 'foncier_nu' | 'sci_ir' | 'sci_is'

const STEPS = [
  { id: 1, label: 'Profil', icon: User },
  { id: 2, label: 'Biens', icon: Building2 },
  { id: 3, label: 'Fiscalité', icon: Calculator },
  { id: 4, label: 'Prêt !', icon: Rocket },
]

const OBJECTIFS: { value: Objectif; label: string; desc: string; emoji: string }[] = [
  { value: 'debutant', label: 'Investisseur débutant', desc: 'Je commence à construire mon patrimoine', emoji: '🌱' },
  { value: 'experimente', label: 'Investisseur expérimenté', desc: 'J\'ai déjà plusieurs biens et je veux optimiser', emoji: '🚀' },
  { value: 'familial', label: 'Patrimoine familial', desc: 'Je gère le patrimoine de ma famille ou d\'une SCI', emoji: '🏛️' },
]

const NB_BIENS: { value: NbBiens; label: string }[] = [
  { value: '1-3', label: '1 à 3 biens' },
  { value: '4-10', label: '4 à 10 biens' },
  { value: '10+', label: 'Plus de 10 biens' },
]

const TYPES_BIENS: { value: TypeBien; label: string; desc: string; color: string }[] = [
  { value: 'lmnp', label: 'LMNP', desc: 'Meublé non professionnel', color: '#10B981' },
  { value: 'sci', label: 'SCI', desc: 'Société civile immobilière', color: '#06B6D4' },
  { value: 'airbnb', label: 'Airbnb', desc: 'Location saisonnière', color: '#F59E0B' },
  { value: 'nu', label: 'Foncier nu', desc: 'Location nue classique', color: '#1A56DB' },
  { value: 'commerce', label: 'Commerce', desc: 'Bail commercial 3-6-9', color: '#8B5CF6' },
]

const REGIMES: { value: RegimeFiscal; label: string; desc: string }[] = [
  { value: 'lmnp_reel', label: 'LMNP Réel', desc: 'Amortissements + charges déductibles' },
  { value: 'micro_bic', label: 'Micro-BIC', desc: 'Abattement forfaitaire 50%' },
  { value: 'foncier_nu', label: 'Foncier nu (réel)', desc: 'Charges déductibles, déficit imputable' },
  { value: 'sci_ir', label: 'SCI à l\'IR', desc: 'Transparence fiscale entre associés' },
  { value: 'sci_is', label: 'SCI à l\'IS', desc: 'Impôt société + amortissements' },
]

const TMI_OPTIONS: { value: TMI; label: string; sub: string }[] = [
  { value: '11', label: '11%', sub: 'Revenus < 28 797 €' },
  { value: '30', label: '30%', sub: 'Revenus 28 797 – 82 341 €' },
  { value: '41', label: '41%', sub: 'Revenus 82 341 – 177 106 €' },
  { value: '45', label: '45%', sub: 'Revenus > 177 106 €' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [prenom, setPrenom] = useState('')
  const [objectif, setObjectif] = useState<Objectif | null>(null)
  const [nbBiens, setNbBiens] = useState<NbBiens | null>(null)
  const [typesBiens, setTypesBiens] = useState<TypeBien[]>([])
  const [regime, setRegime] = useState<RegimeFiscal | null>(null)
  const [tmi, setTmi] = useState<TMI | null>(null)

  const toggleType = (t: TypeBien) =>
    setTypesBiens(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const canNext = () => {
    if (step === 1) return prenom.trim().length >= 2 && objectif !== null
    if (step === 2) return nbBiens !== null && typesBiens.length > 0
    if (step === 3) return regime !== null && tmi !== null
    return true
  }

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        full_name: prenom,
        onboarding_done: true,
      }).eq('id', user.id)
    }
    setSaving(false)
    router.push('/dashboard')
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-[#0B1628] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-500/6 blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#0A0908]" />
          </div>
          <span className="font-display font-bold text-xl text-[#0A0908]">Propilot <span className="text-blue-400">AI</span></span>
        </div>

        {/* Stepper + barre de progression */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
                    step === s.id ? 'text-blue-400' : step > s.id ? 'text-green-400' : 'text-slate-600'
                  }`}>
                    {step > s.id
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <s.icon className="h-4 w-4" />
                    }
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-2 h-px bg-white/[0.08]" />
                  )}
                </div>
              ))}
            </div>
            {/* Barre de progression */}
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1.5 text-right">{step}/4</p>
          </div>
        )}

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">

          {/* Étape 1 — Profil */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-2xl text-[#0A0908] mb-1">Bienvenue 👋</h1>
                <p className="text-slate-400 text-sm">Quelques questions pour personnaliser votre expérience.</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Comment vous appelez-vous ?</label>
                <input
                  type="text"
                  placeholder="Votre prénom"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  autoFocus
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-[#0A0908] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Quel est votre profil ?</label>
                <div className="space-y-2">
                  {OBJECTIFS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setObjectif(o.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        objectif === o.value
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-2xl">{o.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-[#0A0908]">{o.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{o.desc}</p>
                      </div>
                      {objectif === o.value && <CheckCircle2 className="h-4 w-4 text-blue-400 ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Étape 2 — Biens */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-2xl text-[#0A0908] mb-1">Votre portefeuille</h1>
                <p className="text-slate-400 text-sm">Dites-nous en plus sur vos biens.</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Combien de biens gérez-vous ?</label>
                <div className="grid grid-cols-3 gap-2">
                  {NB_BIENS.map(n => (
                    <button
                      key={n.value}
                      onClick={() => setNbBiens(n.value)}
                      className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                        nbBiens === n.value
                          ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                          : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Quels types de biens ? <span className="text-slate-600">(plusieurs possibles)</span>
                </label>
                <div className="space-y-2">
                  {TYPES_BIENS.map(t => {
                    const selected = typesBiens.includes(t.value)
                    return (
                      <button
                        key={t.value}
                        onClick={() => toggleType(t.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-opacity-50 bg-opacity-10'
                            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                        style={selected ? { borderColor: `${t.color}50`, backgroundColor: `${t.color}10` } : {}}
                      >
                        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-[#0A0908]">{t.label}</span>
                          <span className="text-xs text-slate-500 ml-2">{t.desc}</span>
                        </div>
                        {selected && <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: t.color }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Étape 3 — Fiscalité */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-2xl text-[#0A0908] mb-1">Votre situation fiscale</h1>
                <p className="text-slate-400 text-sm">Pour des simulations précises dès le départ.</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Régime fiscal principal</label>
                <div className="space-y-2">
                  {REGIMES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRegime(r.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        regime === r.value
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-[#0A0908]">{r.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                      </div>
                      {regime === r.value && <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Votre tranche marginale d'imposition (TMI)</label>
                <div className="grid grid-cols-2 gap-2">
                  {TMI_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTmi(t.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tmi === t.value
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <p className="text-base font-bold text-[#0A0908]">{t.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{t.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Étape 4 — Prêt */}
          {step === 4 && (
            <div className="text-center py-4 space-y-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border border-blue-500/20 flex items-center justify-center mx-auto">
                <Rocket className="h-10 w-10 text-blue-400" />
              </div>

              <div>
                <h1 className="font-display font-bold text-2xl text-[#0A0908] mb-2">
                  Tout est prêt, {prenom} ! 🎉
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Propilot AI est configuré pour votre profil.<br />
                  Votre tableau de bord vous attend.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Profil', value: OBJECTIFS.find(o => o.value === objectif)?.emoji ?? '✓' },
                  { label: 'Biens', value: typesBiens.length > 0 ? `${typesBiens.length} type${typesBiens.length > 1 ? 's' : ''}` : '—' },
                  { label: 'TMI', value: tmi ? `${tmi}%` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                    <p className="text-lg font-bold text-[#0A0908]">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinish}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-[#0A0908] text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {saving ? 'Enregistrement...' : 'Accéder à mon dashboard'}
                {!saving && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex items-center gap-3 mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 h-11 px-4 rounded-xl border border-white/[0.10] text-slate-400 hover:text-[#0A0908] text-sm font-medium transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
              )}
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0908] text-sm font-semibold transition-all"
              >
                {step === 3 ? 'Voir le récap' : 'Continuer'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
