import { LogoStatic } from '@/components/layout/Logo'
import Link from 'next/link'
import { ArrowRight, Building2, Bot, Calculator, FileText, Shield, Zap, CheckCircle, Sparkles, Star, BarChart3, Banknote } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0F172A]">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoStatic variant="dark" size="sm" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#475569]">
            <a href="#features" className="hover:text-[#0F172A] transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-[#0F172A] transition-colors">Tarifs</a>
            <Link href="/login" className="hover:text-[#0F172A] transition-colors">Connexion</Link>
          </div>
          <Link href="/register" className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ background: '#1D4ED8' }}>
            Essai gratuit <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #F0F6FF 0%, #FFFFFF 60%)' }}>
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-8" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            <Sparkles className="h-3.5 w-3.5" /> Propulsé par IA — LLaMA 3.3 via Groq
          </div>
          <h1 className="font-display font-bold text-5xl md:text-[62px] leading-[1.08] tracking-tight text-[#0F172A] mb-6">
            Gérez votre patrimoine<br /><span style={{ color: '#1D4ED8' }}>comme un professionnel</span>
          </h1>
          <p className="text-xl text-[#475569] max-w-2xl mx-auto mb-10 leading-relaxed">
            Patrimo IA centralise vos biens, calcule votre fiscalité LMNP / SCI / foncier et répond à vos questions juridiques en 30 secondes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white text-base font-semibold hover:opacity-90 transition-all shadow-lg" style={{ background: '#1D4ED8', boxShadow: '0 8px 24px rgba(29,78,216,0.3)' }}>
              Commencer gratuitement <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[#475569] text-base font-medium border border-black/[0.10] hover:border-black/20 transition-all">
              J'ai déjà un compte
            </Link>
          </div>
          <div className="flex items-center justify-center gap-2 mt-8">
            <span className="text-sm font-medium text-[#1D4ED8] bg-blue-50 border border-blue-100 px-4 py-2 rounded-full">
              🚀 Rejoignez les premiers propriétaires en accès anticipé
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
            <h2 className="font-display font-bold text-4xl text-[#0F172A] mb-4">Un accompagnement complet</h2>
            <p className="text-[#475569] max-w-2xl mx-auto text-lg">De la création du bail à la déclaration d'impôts — Patrimo IA vous accompagne à chaque étape de votre gestion immobilière.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: FileText,
                title: 'Création & gestion des baux',
                desc: 'Générez vos baux conformes en 2 minutes (meublé, nu, commercial, mobilité). Importez vos contrats existants — l\'IA extrait locataire, loyer et clauses automatiquement.',
                color: '#1D4ED8', bg: '#EFF6FF'
              },
              {
                icon: Building2,
                title: 'Visibilité complète sur vos biens',
                desc: 'Tableau de bord par bien : rendement, cashflow, vacance, travaux, diagnostics, financement — tout au même endroit, en temps réel.',
                color: '#0C4A6E', bg: '#E0F2FE'
              },
              {
                icon: Banknote,
                title: 'Suivi des loyers simplifié',
                desc: 'Encaissements, retards, relances automatiques. Rapprochement bancaire en un clic depuis votre relevé CSV. Zéro oubli, zéro retard.',
                color: '#166534', bg: '#F0FDF4'
              },
              {
                icon: BarChart3,
                title: 'Préparation aux déclarations',
                desc: 'Vos données organisées pour la 2044, 2042-C-PRO et 2072. Importez votre déclaration N-1 — l\'IA analyse et prépare votre dossier fiscal.',
                color: '#7C3AED', bg: '#F5F3FF'
              },
              {
                icon: Bot,
                title: 'Conseiller IA disponible 24h/24',
                desc: 'Posez vos questions en langage naturel : révision IRL, régime fiscal, déficit foncier, amortissements LMNP — réponse en 30 secondes.',
                color: '#0891B2', bg: '#E0F7FF'
              },
              {
                icon: Shield,
                title: 'Vos données restent les vôtres',
                desc: 'Hébergement en Europe, chiffrement bout-en-bout, conforme RGPD. Exportez tout à tout moment pour votre expert-comptable.',
                color: '#991B1B', bg: '#FEF2F2'
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="p-6 rounded-2xl border hover:shadow-md hover:-translate-y-0.5 transition-all" style={{ border: '1px solid rgba(0,0,0,0.07)', background: '#fff' }}>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="font-display font-semibold text-[#0F172A] text-base mb-2">{title}</h3>
                <p className="text-sm text-[#475569] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profils */}
      <section className="py-12 border-y border-black/[0.06]" style={{ background: '#F8FAFC' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-[#64748B] mb-4 uppercase tracking-wide">Adapté à tous les profils</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[['LMNP Régime réel','#166534','#F0FDF4'],['Foncier nu','#1E40AF','#EFF6FF'],['SCI IS / IR','#0C4A6E','#E0F2FE'],['Airbnb saisonnier','#9A3412','#FFF7ED'],['Bail commercial 3-6-9','#5B21B6','#F5F3FF']].map(([l,c,b]) => (
              <span key={l} className="px-4 py-2 rounded-full text-sm font-semibold border" style={{ background: b, color: c, borderColor: `${c}30` }}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-4xl text-[#0F172A] mb-4">Tarifs simples</h2>
            <p className="text-[#475569] text-lg">Commencez gratuitement, évoluez à votre rythme.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { plan: 'Starter', price: 0, desc: 'Pour découvrir', features: ['2 biens','Dashboard basique','Suivi loyers','Exports CSV'], cta: 'Commencer', h: false },
              { plan: 'Pro', price: 29, desc: 'Le plus populaire', features: ['10 biens','Copilot IA illimité','OCR baux PDF','Fiscalité avancée','Relances auto','GED documents'], cta: 'Démarrer en Pro', h: true },
              { plan: 'Premium', price: 79, desc: 'Multi-investisseur', features: ['Biens illimités','Tout Pro inclus','SCI multi-associés','Export comptable','Support prioritaire'], cta: 'Démarrer en Premium', h: false },
            ].map(({ plan, price, desc, features, cta, h }) => (
              <div key={plan} className="relative p-7 rounded-2xl border transition-all"
                style={{ border: h ? '2px solid #1D4ED8' : '1px solid rgba(0,0,0,0.08)', background: h ? '#EFF6FF' : '#fff', boxShadow: h ? '0 8px 32px rgba(29,78,216,0.12)' : 'none' }}>
                {h && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#1D4ED8' }}>Recommandé</div>}
                <p className="font-display font-bold text-lg text-[#0F172A] mb-0.5">{plan}</p>
                <p className="text-sm text-[#64748B] mb-4">{desc}</p>
                <div className="mb-6">
                  <span className="font-display font-bold text-4xl text-[#0F172A]">{price === 0 ? 'Gratuit' : `${price}€`}</span>
                  {price > 0 && <span className="text-[#64748B] text-sm">/mois</span>}
                </div>
                <ul className="space-y-2.5 mb-7">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#475569]">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#166534' }} />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block text-center h-10 rounded-xl text-sm font-semibold leading-[40px] transition-all"
                  style={h ? { background: '#1D4ED8', color: '#fff' } : { background: '#F1F5F9', color: '#0F172A', border: '1px solid rgba(0,0,0,0.08)' }}>
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Réassurance */}
      <section className="py-12 border-t border-black/[0.06]" style={{ background: '#F8FAFC' }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            [Shield,'Données hébergées en France','RGPD · Chiffrement AES-256'],
            [Zap,'À jour loi ALUR & ELAN','Indices IRL/ILC/ILAT actualisés'],
            [Bot,'Support humain inclus','9h–18h · lun–ven'],
            [FileText,'Compatible expert-comptable','Export CSV · 2044 · 2072'],
          ].map(([Icon, label, sub]: any) => (
            <div key={label}><Icon className="h-6 w-6 mx-auto mb-2 text-[#1D4ED8]" /><p className="text-sm font-semibold text-[#0F172A]">{label}</p><p className="text-xs text-[#64748B] mt-0.5">{sub}</p></div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-black/[0.06] text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <LogoStatic variant="dark" size="sm" />
        </div>
        <p className="text-xs text-[#94A3B8] mb-2">© {new Date().getFullYear()} Patrimo IA · Tous droits réservés</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/cgu" className="text-xs text-[#94A3B8] hover:text-[#475569]">CGU</Link>
          <Link href="/confidentialite" className="text-xs text-[#94A3B8] hover:text-[#475569]">Confidentialité</Link>
        </div>
      </footer>
    </div>
  )
}
