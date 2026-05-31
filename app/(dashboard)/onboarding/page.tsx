'use client'
import Image from 'next/image'
import { Logo } from '@/components/layout/Logo'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, ArrowRight, ArrowLeft, CheckCircle2,
  User, Building2, Calculator, Rocket, Bot, Info
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
  { value: 'experimente', label: 'Investisseur expérimenté', desc: 'J\'ai plusieurs biens et je veux optimiser', emoji: '🚀' },
  { value: 'familial', label: 'Patrimoine familial', desc: 'Je gère le patrimoine de ma famille ou d\'une SCI', emoji: '🏛️' },
]

const NB_BIENS: { value: NbBiens; label: string }[] = [
  { value: '1-3', label: '1 à 3 biens' },
  { value: '4-10', label: '4 à 10 biens' },
  { value: '10+', label: 'Plus de 10 biens' },
]

const TYPES_BIENS: { value: TypeBien; label: string; desc: string; color: string }[] = [
  { value: 'lmnp', label: 'LMNP', desc: 'Location meublée non professionnelle', color: '#166534' },
  { value: 'sci', label: 'SCI', desc: 'Société civile immobilière', color: '#0C4A6E' },
  { value: 'airbnb', label: 'Airbnb', desc: 'Location saisonnière courte durée', color: '#C2410C' },
  { value: 'nu', label: 'Foncier nu', desc: 'Location nue classique', color: '#1E40AF' },
  { value: 'commerce', label: 'Commerce', desc: 'Bail commercial 3-6-9', color: '#5B21B6' },
]

const TMI_OPTIONS: { value: TMI; label: string; sub: string }[] = [
  { value: '11', label: '11%', sub: 'Revenus < 28 797 €/an' },
  { value: '30', label: '30%', sub: 'Revenus 28 797 – 82 341 €' },
  { value: '41', label: '41%', sub: 'Revenus 82 341 – 177 106 €' },
  { value: '45', label: '45%', sub: 'Revenus > 177 106 €' },
]

// Conseils de l'assistant pour chaque étape
const ASSISTANT_TIPS: Record<number, { titre: string; conseil: string; points: string[] }> = {
  1: {
    titre: 'Bienvenue sur Patrimo 👋',
    conseil: 'Je vais vous guider pour configurer votre espace en 4 étapes rapides. Plus vos informations sont précises, plus mes simulations fiscales seront exactes.',
    points: [
      'Votre profil permet d\'adapter l\'interface à vos besoins',
      'Vous pourrez modifier ces informations à tout moment',
      'Aucune donnée bancaire n\'est demandée ici',
    ],
  },
  2: {
    titre: 'Vos types de biens 🏠',
    conseil: 'Sélectionnez tous les types de biens que vous gérez. Chaque profil a son propre tableau de bord fiscal et ses alertes spécifiques.',
    points: [
      'LMNP : régime réel ou micro-BIC, amortissements déductibles',
      'SCI : IS ou IR, liasse 2072 obligatoire avant le 15 mai',
      'Airbnb : plafond légal 120 nuits/an, BIC meublé tourisme',
      'Nu : déficit foncier imputable sur le revenu global',
      'Commerce : révision ILC/ILAT, bail 3-6-9',
    ],
  },
  3: {
    titre: 'Votre situation fiscale 📊',
    conseil: 'La TMI (Tranche Marginale d\'Imposition) est le taux auquel est imposé votre dernier euro de revenu. Elle sert à calculer l\'impôt sur vos revenus immobiliers.',
    points: [
      'Trouvez votre TMI sur votre dernier avis d\'imposition',
      'TMI 30% = vous payez 30% sur chaque € de revenu supplémentaire',
      'En LMNP réel, les amortissements réduisent à 0€ le résultat imposable',
      'En foncier nu, un déficit est déductible jusqu\'à 10 700€/an',
    ],
  },
  4: {
    titre: 'Vous êtes prêt ! 🎉',
    conseil: 'Votre espace est configuré. Je vous recommande de commencer par ajouter votre premier bien et son bail pour voir vos simulations fiscales en temps réel.',
    points: [
      '➡️ Ajoutez un bien via "Mes biens"',
      '➡️ Importez votre bail PDF pour l\'analyse automatique',
      '➡️ Consultez "Aide déclaration" avant votre prochaine déclaration',
      '➡️ Posez-moi toutes vos questions via le Copilot IA',
    ],
  },
}

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
    if (step === 3) return tmi !== null
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

  const tip = ASSISTANT_TIPS[step]

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}>

      <div className="w-full max-w-4xl">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Logo size="md" linkTo="/" />
        </div>

        {/* Stepper */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium transition-all"
                  style={{ color: step === s.id ? 'var(--accent)' : step > s.id ? '#166534' : 'var(--text-tertiary)' }}>
                  {step > s.id
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <s.icon className="h-4 w-4" />
                  }
                  <span>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-8 h-px" style={{ background: 'var(--border)' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Grid : formulaire + assistant */}
        <div className={`grid gap-6 ${step < 4 ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1 max-w-lg mx-auto'}`}>

          {/* Formulaire */}
          <div className="lg:col-span-3 rounded-2xl p-7 shadow-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

            {/* Étape 1 — Profil */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
                    Bienvenue 👋
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Quelques questions pour personnaliser votre expérience.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Comment vous appelez-vous ?
                  </label>
                  <input type="text" placeholder="Votre prénom" value={prenom}
                    onChange={e => setPrenom(e.target.value)} autoFocus
                    className="w-full h-11 px-4 rounded-xl text-sm focus:outline-none transition-all"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Quel est votre profil ?
                  </label>
                  <div className="space-y-2">
                    {OBJECTIFS.map(o => (
                      <button key={o.value} onClick={() => setObjectif(o.value)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                        style={{
                          border: objectif === o.value ? `2px solid var(--accent)` : '1px solid var(--border)',
                          background: objectif === o.value ? 'var(--brand-light, #EEF3FF)' : 'var(--bg-secondary)',
                        }}>
                        <span className="text-2xl">{o.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{o.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{o.desc}</p>
                        </div>
                        {objectif === o.value && <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Étape 2 — Biens */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
                    Votre portefeuille
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Dites-nous en plus sur vos biens immobiliers.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Combien de biens gérez-vous ?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {NB_BIENS.map(n => (
                      <button key={n.value} onClick={() => setNbBiens(n.value)}
                        className="py-3 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          border: nbBiens === n.value ? `2px solid var(--accent)` : '1px solid var(--border)',
                          background: nbBiens === n.value ? 'var(--brand-light, #EEF3FF)' : 'var(--bg-secondary)',
                          color: nbBiens === n.value ? 'var(--accent)' : 'var(--text-primary)',
                        }}>
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Quels types de biens ? <span style={{ color: 'var(--text-tertiary)' }}>(plusieurs possibles)</span>
                  </label>
                  <div className="space-y-2">
                    {TYPES_BIENS.map(t => {
                      const selected = typesBiens.includes(t.value)
                      return (
                        <button key={t.value} onClick={() => toggleType(t.value)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                          style={{
                            border: selected ? `2px solid ${t.color}` : '1px solid var(--border)',
                            background: selected ? `${t.color}10` : 'var(--bg-secondary)',
                          }}>
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                          <div className="flex-1">
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                            <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>{t.desc}</span>
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
              <div className="space-y-5">
                <div>
                  <h1 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
                    Votre situation fiscale
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Pour des simulations précises dès le départ.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                    Votre Tranche Marginale d'Imposition (TMI)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TMI_OPTIONS.map(t => (
                      <button key={t.value} onClick={() => setTmi(t.value)}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                          border: tmi === t.value ? `2px solid var(--accent)` : '1px solid var(--border)',
                          background: tmi === t.value ? 'var(--brand-light, #EEF3FF)' : 'var(--bg-secondary)',
                        }}>
                        <p className="text-xl font-bold" style={{ color: tmi === t.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {t.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t.sub}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    Trouvez votre TMI sur votre dernier avis d'imposition (case "Taux marginal")
                  </p>
                </div>
              </div>
            )}

            {/* Étape 4 — Succès */}
            {step === 4 && (
              <div className="text-center py-6 space-y-5">
                <div className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: 'linear-gradient(135deg, #EEF3FF, #DBEAFE)' }}>
                  <Rocket className="h-10 w-10" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
                    Tout est prêt, {prenom} ! 🎉
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Votre compte est configuré. Votre tableau de bord vous attend.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Profil', value: OBJECTIFS.find(o => o.value === objectif)?.emoji ?? '✓' },
                    { label: 'Biens', value: typesBiens.length > 0 ? `${typesBiens.length} type${typesBiens.length > 1 ? 's' : ''}` : '—' },
                    { label: 'TMI', value: tmi ? `${tmi}%` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                    </div>
                  ))}
                </div>
                <button onClick={handleFinish} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)', boxShadow: '0 4px 14px rgba(27,79,216,0.3)' }}>
                  {saving ? 'Enregistrement...' : <><Sparkles className="h-4 w-4" /> Accéder à mon dashboard</>}
                </button>
              </div>
            )}

            {/* Navigation */}
            {step < 4 && (
              <div className="flex items-center gap-3 mt-7 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-1.5 h-11 px-4 rounded-xl text-sm font-medium transition-all"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </button>
                )}
                <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: canNext() ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {step === 3 ? 'Voir le récap' : 'Continuer'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Assistant IA — colonne droite */}
          {step < 4 && (
            <div className="lg:col-span-2 rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: '#1D4ED8', color: '#fff' }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Assistant Patrimo IA</p>
                  <p className="text-xs text-white/70">Je vous guide étape par étape</p>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <p className="text-sm font-semibold text-white mb-2">{tip.titre}</p>
                <p className="text-sm text-white/85 leading-relaxed">{tip.conseil}</p>
              </div>

              <div className="space-y-2.5">
                {tip.points.map((point, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                      {i + 1}
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>

              {/* Barre de progression */}
              <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="flex justify-between text-xs text-white/60 mb-1.5">
                  <span>Progression</span>
                  <span>{step}/4</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(step / 4) * 100}%`, background: '#fff' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
