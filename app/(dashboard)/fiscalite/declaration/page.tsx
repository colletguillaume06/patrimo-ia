'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { calculateLmnpSimulation, calculateDepreciation } from '@/lib/fiscal/lmnp'
import { calculateFoncierSimulation } from '@/lib/fiscal/foncier'
import { calculateSciSimulation } from '@/lib/fiscal/sci'
import {
  Copy, CheckCircle, ChevronDown, ChevronRight, Bot,
  Send, Sparkles, Info, AlertTriangle, BookOpen, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { useCopilot } from '@/hooks/useCopilot'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

interface CaseDeclaration {
  code: string
  label: string
  value: number
  note?: string
  obligatoire: boolean
  lien_notice?: string
}

interface Formulaire {
  id: string
  nom: string
  titre: string
  deadline: string
  lien_officiel: string
  description: string
  cases: CaseDeclaration[]
  checklist: string[]
  pieges: string[]
}

// ─── Copier avec feedback ─────────────────────────────────────────────────

function CopyValue({ value, label }: { value: number; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value.toFixed(2))
    setCopied(true)
    toast.success(`${value.toFixed(2)} € copié`)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-sm font-mono font-semibold"
      style={{
        background: copied ? 'var(--success-bg)' : 'var(--bg-secondary)',
        borderColor: copied ? 'var(--success-border)' : 'var(--border)',
        color: copied ? 'var(--success-text)' : 'var(--text-primary)',
      }}>
      {copied
        ? <><CheckCircle className="h-3.5 w-3.5" /> Copié</>
        : <><Copy className="h-3.5 w-3.5" /> {value.toFixed(2)} €</>
      }
    </button>
  )
}

// ─── Section accordéon — fond blanc ─────────────────────────────────────

function Section({ title, icon, children, defaultOpen = false, badge }:
  { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors text-left"
        style={{ background: open ? '#F8FAFC' : '#fff' }}>
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-display font-semibold text-base" style={{ color: '#0F172A' }}>
            {title}
          </span>
          {badge && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
              style={{ background: '#1D4ED8' }}>
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
          : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 border-t" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.06)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Ligne de case fiscale ────────────────────────────────────────────────

function CaseLine({ c }: { c: CaseDeclaration }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b last:border-0"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
      {/* Code case — badge bleu */}
      <div className="flex-shrink-0 w-20 pt-0.5">
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono text-white"
          style={{ background: '#1D4ED8' }}>
          {c.code}
        </span>
      </div>
      {/* Label + note */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{c.label}</p>
        {c.note && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#475569' }}>{c.note}</p>
        )}
        {!c.obligatoire && (
          <span className="inline-block text-xs font-medium mt-1 px-2 py-0.5 rounded-full"
            style={{ background: '#F1F5F9', color: '#64748B' }}>Optionnel</span>
        )}
      </div>
      {/* Valeur + copier */}
      <div className="flex-shrink-0">
        <CopyValue value={c.value} />
      </div>
    </div>
  )
}

// ─── Chat IA fiscal ───────────────────────────────────────────────────────

const SUGGESTED_FISCAL = [
  'Quelle est la différence entre micro-BIC et régime réel ?',
  'Comment déclarer mon LMNP en régime réel ?',
  'Quels amortissements puis-je déduire ?',
  'Comment imputer mon déficit foncier ?',
  'Dois-je déposer une 2072 pour ma SCI ?',
  'Comment calculer la plus-value à la revente ?',
]

function ChatFiscal({ context }: { context: string }) {
  const { messages, isLoading, apiError, sendMessage } = useCopilot([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = (msg?: string) => {
    const text = msg ?? input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-[560px] rounded-xl overflow-hidden shadow-sm"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>

      {/* Header bleu */}
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ background: '#1D4ED8' }}>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Propilot — Assistant fiscal</p>
          <p className="text-xs text-white/70">Spécialisé 2042 · 2044 · 2072 · LMNP · SCI</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-300" />
          <span className="text-xs text-white/80">En ligne</span>
        </div>
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#F8FAFC' }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#64748B' }}>
            Questions fréquentes
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_FISCAL.map(q => (
              <button key={q} onClick={() => handleSend(q)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#475569', background: '#fff' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ background: '#F8FAFC' }}>
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: '#EFF6FF' }}>
              <Bot className="h-6 w-6" style={{ color: '#1D4ED8' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Posez vos questions sur votre déclaration
            </p>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>
              Je connais votre situation fiscale et vos biens
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: '#1D4ED8' }}>
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div className={cn('max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed', msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm')}
              style={msg.role === 'user'
                ? { background: '#1D4ED8', color: '#fff' }
                : { background: '#fff', color: '#0F172A', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
              }>
              {msg.content
                ? msg.content.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
                ))
                : <span className="flex gap-1 py-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full animate-bounce bg-blue-300"
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Erreur API */}
      {apiError && (
        <div className="px-4 py-2 text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
          ⚠️ {apiError}
        </div>
      )}

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff' }}>
        <div className="flex items-end gap-2 px-4 py-2.5 rounded-xl border transition-all focus-within:border-blue-400"
          style={{ borderColor: 'rgba(0,0,0,0.12)', background: '#F8FAFC' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ex: Comment déclarer mon déficit LMNP ?"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none"
            style={{ color: '#0F172A', minHeight: '22px', maxHeight: '80px' }} />
          <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: '#1D4ED8' }}>
            <Send className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function DeclarationPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear() - 1)
  const [tmi, setTmi] = useState(30)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, leases(*), expenses(*), depreciation_plans(*), sci_associates(*)')
        .order('name')
      setProperties(data ?? [])
      setLoading(false)
    }
    load()
  }, [year])

  // Calculs par type
  const lmnpProps = properties.filter(p => p.type === 'lmnp')
  const nuProps = properties.filter(p => p.type === 'nu')
  const sciProps = properties.filter(p => p.type === 'sci')

  const getExpensesYtd = (prop: any) =>
    (prop.expenses ?? []).filter((e: any) => new Date(e.date).getFullYear() === year)

  const getLmnpData = (prop: any) => {
    const recettes = (prop.leases ?? []).filter((l: any) => l.is_active).reduce((s: number, l: any) => s + (l.monthly_rent ?? 0) * 12, 0)
    const charges = getExpensesYtd(prop).reduce((s: number, e: any) => s + e.amount, 0) + prop.monthly_charges * 12 + prop.property_tax + prop.insurance_annual
    const amortissements = calculateDepreciation(prop.depreciation_plans ?? [])
    const sim = calculateLmnpSimulation({ recettes, charges_reelles: charges, amortissements, taux_marginal: tmi / 100 })
    return { recettes, charges, amortissements, sim }
  }

  const getFoncierData = (prop: any) => {
    const revenus = (prop.leases ?? []).filter((l: any) => l.is_active).reduce((s: number, l: any) => s + (l.monthly_rent ?? 0) * 12, 0)
    const charges = getExpensesYtd(prop).reduce((s: number, e: any) => e.fiscal_deductible ? s + e.amount : s, 0) + prop.monthly_charges * 12 + prop.property_tax + prop.insurance_annual + prop.loan_monthly * 12
    const sim = calculateFoncierSimulation({ revenus_bruts: revenus, charges_deductibles: charges, taux_marginal: tmi / 100 })
    return { revenus, charges, sim }
  }

  // Agrégats pour le chat
  const totalPatrimoine = properties.reduce((s, p) => s + (p.purchase_price ?? 0), 0)
  const chatContext = `Situation fiscale ${year}: ${lmnpProps.length} LMNP, ${nuProps.length} foncier nu, ${sciProps.length} SCI. Patrimoine: ${formatCurrency(totalPatrimoine)}. TMI: ${tmi}%.`

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: '#0F172A' }}>
            Aide à la déclaration
          </h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>
            Montants pré-calculés depuis vos données · Cliquez sur une valeur pour la copier
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#475569' }}>Revenus</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="h-9 px-3 rounded-lg border text-sm focus:outline-none focus:border-accent"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {[2025, 2024, 2023].map(y => <option key={y} value={y} className="bg-[var(--bg-secondary)]">{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#475569' }}>TMI</span>
            <select value={tmi} onChange={e => setTmi(Number(e.target.value))}
              className="h-9 px-3 rounded-lg border text-sm focus:outline-none focus:border-accent"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {[11, 30, 41, 45].map(r => <option key={r} value={r} className="bg-[var(--bg-secondary)]">{r}%</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl border"
        style={{ background: '#EFF6FF', borderColor: '#93C5FD' }}>
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#1E40AF' }} />
        <p className="text-sm" style={{ color: '#1E40AF' }}>
          Ces montants sont calculés automatiquement depuis vos données. Ils sont <strong>indicatifs</strong> — vérifiez avec votre expert-comptable avant de déposer. Liens officiels vers impots.gouv.fr fournis pour chaque formulaire.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── COLONNE GAUCHE : Formulaires ── */}
        <div className="space-y-4">

          {/* ── 2042 ── */}
          <Section title="Formulaire 2042" defaultOpen
            icon={<BookOpen className="h-4 w-4" style={{ color: '#1D4ED8' }} />}
            badge="Tout le monde">
            <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: '#475569' }}>
                Déclaration principale de revenus — à déposer avant fin mai sur impots.gouv.fr.
              </p>
              <a href="https://www.impots.gouv.fr/portail/formulaire/2042/declaration-des-revenus" target="_blank"
                className="inline-flex items-center gap-1 text-xs mt-1.5 hover:underline"
                style={{ color: '#1D4ED8' }}>
                <ExternalLink className="h-3 w-3" /> Formulaire officiel 2042
              </a>
            </div>
            <div className="p-3 rounded-lg mb-3" style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.08)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>VOTRE CHECKLIST 2042</p>
              {[
                'Vos relevés de loyers perçus (quittances)',
                'Attestation de taxe foncière',
                'Relevés de charges de copropriété',
                'Intérêts d\'emprunt (attestation banque)',
              ].map(item => (
                <p key={item} className="text-xs flex items-center gap-2 mb-1" style={{ color: '#475569' }}>
                  <CheckCircle className="h-3 w-3 flex-shrink-0" style={{ color: '#166534' }} /> {item}
                </p>
              ))}
            </div>
          </Section>

          {/* ── 2042-C-PRO (LMNP) ── */}
          {lmnpProps.length > 0 && (
            <Section title="2042-C-PRO — LMNP / LMP"
              icon={<BookOpen className="h-4 w-4" style={{ color: '#166534' }} />}
              badge={`${lmnpProps.length} bien${lmnpProps.length > 1 ? 's' : ''}`}
              defaultOpen>
              <div className="mb-4">
                <p className="text-sm mb-2" style={{ color: '#475569' }}>
                  Revenus des locations meublées non professionnelles — annexe à joindre à votre 2042.
                </p>
                <a href="https://www.impots.gouv.fr/portail/formulaire/2042-c-pro/declaration-complementaire-des-revenus-des-professions-non-salariees" target="_blank"
                  className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: '#1D4ED8' }}>
                  <ExternalLink className="h-3 w-3" /> Notice 2042-C-PRO
                </a>
              </div>

              {lmnpProps.map(prop => {
                const { recettes, charges, amortissements, sim } = getLmnpData(prop)
                const isReel = prop.lmnp_regime === 'reel'
                return (
                  <div key={prop.id} className="mb-5">
                    <p className="text-sm font-semibold mb-3 pb-2 border-b"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                      {prop.name} — Régime {isReel ? 'réel' : 'micro-BIC'}
                    </p>

                    {isReel ? (
                      <>
                        <CaseLine c={{ code: '5NA', label: 'Bénéfice BIC non professionnel (régime réel)', value: Math.max(0, sim.resultat_bic), obligatoire: true, note: 'À remplir si résultat positif — sinon laisser vide et remplir 5NY' }} />
                        <CaseLine c={{ code: '5NY', label: 'Déficit BIC non professionnel reportable', value: Math.abs(Math.min(0, sim.resultat_bic)), obligatoire: false, note: 'À remplir si résultat négatif — imputable sur revenus BIC des 10 ans suivants' }} />
                        <CaseLine c={{ code: '5QA', label: 'Recettes brutes perçues (pour info)', value: recettes, obligatoire: false, note: 'Sert au calcul du plafond des cotisations sociales' }} />

                        <div className="mt-3 p-3 rounded-lg text-xs"
                          style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
                          <strong>⚠️ Régime réel :</strong> Vous devez également joindre la <strong>liasse 2033</strong> (bilan simplifié) ou avoir mandaté un expert-comptable (OGA). Sans adhésion à un OGA, une majoration de 25% s'applique sur vos bénéfices.
                        </div>
                      </>
                    ) : (
                      <>
                        <CaseLine c={{ code: '5ND', label: 'Recettes BIC non professionnelles (micro-BIC)', value: recettes, obligatoire: true, note: `L'administration appliquera automatiquement l'abattement de 50% → base imposable : ${formatCurrency(sim.micro_bic_base)}` }} />
                        <div className="mt-3 p-3 rounded-lg text-xs"
                          style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', color: 'var(--info-text)' }}>
                          💡 En micro-BIC : saisissez vos <strong>recettes brutes</strong> (pas les charges). L'abattement 50% est calculé automatiquement. Si vos charges réelles dépassent 50%, passez au régime réel.
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Pièges LMNP */}
              <div className="mt-2 p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#991B1B' }}>🚨 Pièges courants LMNP</p>
                {[
                  'Oublier de déclarer le résultat même si = 0€ (régime réel obligatoire)',
                  'Confondre recettes HT et TTC (LMNP = exonéré TVA en général)',
                  'Ne pas reporter le déficit des années précédentes (cases 5GA à 5JA)',
                ].map(p => (
                  <p key={p} className="text-xs mb-1" style={{ color: '#991B1B' }}>• {p}</p>
                ))}
              </div>
            </Section>
          )}

          {/* ── 2044 (Foncier nu) ── */}
          {nuProps.length > 0 && (
            <Section title="Formulaire 2044 — Revenus fonciers"
              icon={<BookOpen className="h-4 w-4" style={{ color: '#1E40AF' }} />}
              badge={`${nuProps.length} bien${nuProps.length > 1 ? 's' : ''}`}>
              <div className="mb-4">
                <p className="text-sm mb-2" style={{ color: '#475569' }}>
                  Déclaration des revenus fonciers (location nue) — régime réel.
                  Si revenus totaux ≤ 15 000€, vous pouvez opter pour le micro-foncier (case 4BE sur la 2042).
                </p>
                <a href="https://www.impots.gouv.fr/portail/formulaire/2044/declaration-des-revenus-fonciers" target="_blank"
                  className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: '#1D4ED8' }}>
                  <ExternalLink className="h-3 w-3" /> Notice 2044
                </a>
              </div>

              {nuProps.map(prop => {
                const { revenus, charges, sim } = getFoncierData(prop)
                const interets = (prop.loan_monthly ?? 0) * 12
                const taxeFonciere = prop.property_tax ?? 0
                const chargesHorsInterets = charges - interets
                return (
                  <div key={prop.id} className="mb-5">
                    <p className="text-sm font-semibold mb-3 pb-2 border-b"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                      {prop.name}
                    </p>
                    <CaseLine c={{ code: '110', label: 'Revenus bruts encaissés (loyers)', value: revenus, obligatoire: true, note: 'Total des loyers perçus + provisions sur charges récupérables' }} />
                    <CaseLine c={{ code: '221', label: 'Frais de gestion et d\'administration', value: prop.monthly_charges * 12 * 0.3, obligatoire: false, note: 'Forfait 20€ par logement OU frais réels (gérance, assurance PNO...)' }} />
                    <CaseLine c={{ code: '224', label: 'Primes d\'assurance (PNO + GLI)', value: (prop.insurance_annual ?? 0), obligatoire: false, note: 'Assurance Propriétaire Non Occupant + garantie loyers impayés' }} />
                    <CaseLine c={{ code: '225', label: 'Dépenses de réparation et entretien', value: chargesHorsInterets * 0.6, obligatoire: false, note: 'Travaux déductibles (réparation, entretien) — PAS les travaux de construction' }} />
                    <CaseLine c={{ code: '229', label: 'Taxe foncière', value: taxeFonciere, obligatoire: false, note: 'Montant de la taxe foncière de l\'année (non la TOM)' }} />
                    <CaseLine c={{ code: '250', label: 'Intérêts d\'emprunt', value: interets, obligatoire: false, note: 'Intérêts + assurance emprunteur — à demander à votre banque (IFU)' }} />
                    <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <CaseLine c={{ code: '420', label: sim.revenu_net >= 0 ? 'Revenu net foncier' : 'Déficit foncier', value: Math.abs(sim.revenu_net), obligatoire: true, note: sim.revenu_net < 0 ? `Déficit imputable sur revenu global : max 10 700€/an (art. 156 CGI). Excédent : ${formatCurrency(Math.max(0, Math.abs(sim.revenu_net) - 10700))} reportable 10 ans` : 'Ce montant s\'ajoute à vos autres revenus imposables' }} />
                    </div>
                  </div>
                )
              })}

              <div className="mt-2 p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#991B1B' }}>🚨 Pièges courants 2044</p>
                {[
                  'Déduire des travaux de construction/agrandissement (non déductibles — augmentent le prix de revient)',
                  'Oublier l\'attestation d\'intérêts de votre banque (IFU)',
                  'Ne pas reporter les déficits des années antérieures (cases 156 ou 570)',
                  'Dépasser le seuil micro-foncier 15 000€ sans s\'en apercevoir',
                ].map(p => (
                  <p key={p} className="text-xs mb-1" style={{ color: '#991B1B' }}>• {p}</p>
                ))}
              </div>
            </Section>
          )}

          {/* ── 2072 (SCI) ── */}
          {sciProps.length > 0 && (
            <Section title="Formulaire 2072 — SCI"
              icon={<BookOpen className="h-4 w-4" style={{ color: 'var(--warning-text)' }} />}
              badge={`${sciProps.length} SCI`}>
              <div className="mb-4">
                <p className="text-sm mb-2" style={{ color: '#475569' }}>
                  Déclaration de résultats de la SCI — à déposer avant le <strong>15 mai</strong> (ou le 2ème jour ouvré).
                  Chaque associé reporte sa quote-part sur sa 2044 personnelle.
                </p>
                <a href="https://www.impots.gouv.fr/portail/formulaire/2072/declaration-de-resultats-et-de-revenus-de-la-sci" target="_blank"
                  className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: '#1D4ED8' }}>
                  <ExternalLink className="h-3 w-3" /> Notice 2072
                </a>
              </div>

              {sciProps.map(prop => {
                const revenus = (prop.leases ?? []).filter((l: any) => l.is_active).reduce((s: number, l: any) => s + (l.monthly_rent ?? 0) * 12, 0)
                const charges = getExpensesYtd(prop).reduce((s: number, e: any) => s + e.amount, 0) + prop.monthly_charges * 12 + prop.property_tax + prop.insurance_annual
                const sim = calculateSciSimulation({ resultat_comptable: revenus - charges, regime: (prop.sci_regime ?? 'ir') as 'ir' | 'is', taux_marginal: tmi / 100 })
                return (
                  <div key={prop.id} className="mb-5">
                    <p className="text-sm font-semibold mb-3 pb-2 border-b"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                      {prop.sci_name ?? prop.name} — {prop.sci_regime?.toUpperCase() ?? 'IR'}
                    </p>
                    <CaseLine c={{ code: 'Cadre A', label: 'Revenus bruts de la société', value: revenus, obligatoire: true }} />
                    <CaseLine c={{ code: 'Cadre B', label: 'Charges déductibles totales', value: charges, obligatoire: true }} />
                    <CaseLine c={{ code: 'Résultat', label: sim.resultat_comptable >= 0 ? 'Bénéfice net' : 'Déficit net', value: Math.abs(sim.resultat_comptable), obligatoire: true }} />

                    {prop.sci_regime === 'is' && (
                      <CaseLine c={{ code: 'IS dû', label: 'Impôt sur les sociétés (15% < 42 500€, 25% au-delà)', value: sim.is_du, obligatoire: true, note: 'Acomptes : 15/03, 15/06, 15/09, 15/12' }} />
                    )}

                    {prop.sci_regime !== 'is' && (prop.sci_associates ?? []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>
                          QUOTE-PART PAR ASSOCIÉ — à reporter sur leur 2044 personnelle
                        </p>
                        {(prop.sci_associates ?? []).map((a: any) => (
                          <CaseLine key={a.id} c={{
                            code: `${a.share_pct}%`,
                            label: `Quote-part de ${a.name}`,
                            value: Math.round(sim.resultat_comptable * a.share_pct / 100 * 100) / 100,
                            obligatoire: true,
                            note: `${a.name} doit reporter ce montant ligne 420 de sa 2044`,
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </Section>
          )}

          {/* ── Calendrier des échéances ── */}
          <Section title="Calendrier des échéances"
            icon={<AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning-text)' }} />}>
            <div className="space-y-2">
              {[
                { date: '15 janv.', label: 'CFE — Cotisation Foncière des Entreprises', concerne: 'LMNP', urgent: false },
                { date: '15 mai', label: 'Dépôt 2072 (SCI)', concerne: 'SCI', urgent: sciProps.length > 0 },
                { date: 'Fin mai', label: 'Déclaration 2042 + 2042-C-PRO + 2044', concerne: 'Tous', urgent: true },
                { date: '15 juin', label: '1er acompte IS (SCI à l\'IS)', concerne: 'SCI IS', urgent: false },
                { date: '15 oct.', label: 'Taxe foncière', concerne: 'Tous', urgent: false },
                { date: '15 déc.', label: 'Solde IS + 3ème acompte', concerne: 'SCI IS', urgent: false },
              ].map(e => (
                <div key={e.date} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: e.urgent ? 'var(--danger-bg)' : 'var(--bg-secondary)', border: `1px solid ${e.urgent ? 'var(--danger-border)' : 'var(--border)'}` }}>
                  <span className="text-xs font-bold w-16 flex-shrink-0"
                    style={{ color: e.urgent ? 'var(--danger-text)' : 'var(--text-tertiary)' }}>
                    {e.date}
                  </span>
                  <span className="text-sm flex-1" style={{ color: '#0F172A' }}>{e.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {e.concerne}
                  </span>
                </div>
              ))}
            </div>
          </Section>

        </div>

        {/* ── COLONNE DROITE : Chat IA ── */}
        <div className="space-y-4">
          <div>
            <h2 className="font-display font-semibold text-base mb-1" style={{ color: '#0F172A' }}>
              Assistant déclaration IA
            </h2>
            <p className="text-sm" style={{ color: '#475569' }}>
              Posez toutes vos questions — l'IA connaît votre situation et les formulaires fiscaux français.
            </p>
          </div>
          <ChatFiscal context={chatContext} />

          {/* Ressources officielles */}
          <GlassCard>
            <h3 className="font-semibold text-sm mb-3" style={{ color: '#0F172A' }}>
              Ressources officielles
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Notice 2042 complète', url: 'https://www.impots.gouv.fr/sites/default/files/formulaires/2042/2024/2042_4133.pdf' },
                { label: 'Notice 2044 — Revenus fonciers', url: 'https://www.impots.gouv.fr/sites/default/files/formulaires/2044/2024/2044_4113.pdf' },
                { label: 'Notice 2042-C-PRO — LMNP', url: 'https://www.impots.gouv.fr/sites/default/files/formulaires/2042-c-pro/2024/2042-c-pro_3018.pdf' },
                { label: 'Bofip — LMNP régime réel', url: 'https://bofip.impots.gouv.fr/bofip/5765-PGP.html' },
                { label: 'Simulateur impôt officiel', url: 'https://www.impots.gouv.fr/simulateur/calcul-de-l-impot' },
              ].map(r => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border transition-all hover:border-accent group"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <span className="text-sm" style={{ color: '#0F172A' }}>{r.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: '#1D4ED8' }} />
                </a>
              ))}
            </div>
          </GlassCard>

          {/* Disclaimer final */}
          <div className="p-4 rounded-xl text-center text-xs"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            Ces informations sont données à titre indicatif. Propilot AI n'est pas un cabinet de conseil fiscal. Pour les situations complexes, consultez un expert-comptable ou un conseiller fiscal agréé.
          </div>
        </div>
      </div>
    </div>
  )
}
