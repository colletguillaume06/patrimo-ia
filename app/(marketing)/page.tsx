import Link from 'next/link'
import { ArrowRight, Building2, Bot, Calculator, FileText, Shield, Zap, CheckCircle, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B1628] text-white overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-10 bg-[#0B1628]/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-white">Propilot <span className="text-blue-400">AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Connexion</Link>
          <Link href="/register" className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-sm font-semibold transition-all">
            Essai gratuit <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute top-40 left-1/4 h-64 w-64 rounded-full bg-cyan-400/5 blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            Propulsé par GPT-4o
          </div>

          <h1 className="font-display font-bold text-5xl md:text-7xl leading-tight mb-6">
            Votre patrimoine immo,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              piloté par l'IA
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Gérez vos biens, optimisez votre fiscalité, suivez vos loyers — avec un copilote IA qui connaît votre patrimoine sur le bout des doigts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="flex items-center gap-2 h-13 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-base transition-all shadow-lg shadow-blue-500/25">
              Commencer gratuitement <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="h-13 px-8 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] text-white font-medium text-base transition-all">
              Voir la démo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '2 400+', label: 'Propriétaires' },
            { value: '18 500', label: 'Biens gérés' },
            { value: '€ 4.2M', label: 'Loyers suivis/mois' },
            { value: '97%', label: 'Taux de satisfaction' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-display font-bold text-3xl text-white mb-1">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-4xl text-white mb-4">Tout ce qu'il faut pour un propriétaire serein</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">De la gestion quotidienne à l'optimisation fiscale avancée, Propilot s'adapte à votre profil.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Bot, title: 'Copilote IA', desc: 'Questions-réponses en langage naturel sur votre patrimoine, analyses fiscales, simulations en temps réel.', color: '#1A56DB' },
              { icon: Calculator, title: 'Fiscalité optimisée', desc: 'LMNP réel, micro-BIC, foncier nu, SCI IS/IR — simulations comparatives avec votre TMI réel.', color: '#10B981' },
              { icon: Building2, title: 'Multi-profils', desc: 'Airbnb, SCI, LMNP, nu, commerce — chaque bien a son tableau de bord adapté à son profil fiscal.', color: '#06B6D4' },
              { icon: FileText, title: 'OCR baux IA', desc: 'Uploadez vos baux PDF — l\'IA extrait automatiquement loyer, charges, durée, clauses importantes.', color: '#F59E0B' },
              { icon: Zap, title: 'Relances automatiques', desc: 'Loyer en retard ? Propilot envoie la relance adaptée : rappel courtois, ferme, ou mise en demeure.', color: '#8B5CF6' },
              { icon: Shield, title: 'Sécurisé & confidentiel', desc: 'Données chiffrées, RLS Supabase, aucun partage avec des tiers. Vos données vous appartiennent.', color: '#EF4444' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                <div className="h-10 w-10 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profils */}
      <section className="py-12 px-6 bg-white/[0.02] border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-4">Adapté à tous les profils d'investisseurs</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['LMNP Réel', 'Foncier nu', 'SCI IS/IR', 'Airbnb', 'Bail commercial 3-6-9'].map(p => (
              <span key={p} className="px-4 py-1.5 rounded-full border border-white/[0.10] bg-white/[0.04] text-sm text-slate-300">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-4xl text-white mb-4">Tarifs simples, sans surprise</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { plan: 'Starter', price: 0, desc: 'Pour découvrir', features: ['2 biens', 'Dashboard', 'Suivi loyers'], highlight: false },
              { plan: 'Pro', price: 29, desc: 'Le plus populaire', features: ['10 biens', 'OCR baux IA', 'Copilot IA illimité', 'Fiscalité avancée', 'Relances auto'], highlight: true },
              { plan: 'Premium', price: 79, desc: 'Multi-investisseur', features: ['Biens illimités', 'SCI multi-associés', 'Export comptable', 'API', 'Support prioritaire'], highlight: false },
            ].map(({ plan, price, desc, features, highlight }) => (
              <div key={plan} className={`p-6 rounded-2xl border ${highlight ? 'border-blue-500/50 bg-blue-500/5 relative' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 rounded-full text-xs font-semibold text-white">
                    Recommandé
                  </div>
                )}
                <p className="font-display font-semibold text-lg text-white mb-0.5">{plan}</p>
                <p className="text-xs text-slate-500 mb-4">{desc}</p>
                <div className="mb-6">
                  <span className="font-display font-bold text-4xl text-white">{price === 0 ? 'Gratuit' : `${price}€`}</span>
                  {price > 0 && <span className="text-slate-500 text-sm">/mois</span>}
                </div>
                <ul className="space-y-2 mb-6">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center h-10 px-4 rounded-xl text-sm font-semibold transition-all leading-[40px] ${highlight ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-white/[0.06] hover:bg-white/[0.10] text-white'}`}
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.06] text-center">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-display font-bold text-white">Propilot <span className="text-blue-400">AI</span></span>
        </div>
        <p className="text-xs text-slate-600">© 2025 Propilot AI. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
