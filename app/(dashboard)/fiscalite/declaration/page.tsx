'use client'

import { useEffect, useRef, useState } from 'react'
import { detenuSurAnnee } from '@/lib/fiscal/bien-vendu'
import { bilanBien, type BilanBien, type Alerte } from '@/lib/fiscal/bilan'
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
import { BackButton } from '@/components/ui/BackButton'

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

// ─── Compte de résultat détaillé (LMNP réel) ─────────────────────────────

const fmtCR = (n: number) =>
  n === 0 ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'

function CRRow({ code, label, value, indent = false }: { code?: string; label: string; value: number; indent?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b last:border-0"
      style={{ borderColor: 'rgba(0,0,0,0.04)', paddingLeft: indent ? 20 : 0 }}>
      {code
        ? <span className="text-[11px] font-mono font-semibold w-14 flex-shrink-0" style={{ color: '#94A3B8' }}>{code}</span>
        : <span className="w-14 flex-shrink-0" />}
      <span className="text-sm flex-1 min-w-0" style={{ color: '#334155' }}>{label}</span>
      <span className="text-sm font-mono tabular-nums flex-shrink-0" style={{ color: '#0F172A' }}>{fmtCR(value)}</span>
    </div>
  )
}

function CRSubtotal({ label, value, strong = false, color }: { label: string; value: number; strong?: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 mt-1 border-t-2"
      style={{ borderColor: strong ? '#1D4ED8' : 'rgba(0,0,0,0.12)' }}>
      <span className="w-14 flex-shrink-0" />
      <span className={cn('text-sm flex-1 min-w-0', strong ? 'font-bold' : 'font-semibold')}
        style={{ color: color ?? '#0F172A' }}>{label}</span>
      <span className={cn('text-sm font-mono tabular-nums flex-shrink-0', strong ? 'font-bold' : 'font-semibold')}
        style={{ color: color ?? '#0F172A' }}>{fmtCR(value)}</span>
    </div>
  )
}

function CompteResultatLMNP({ items, year }: { items: { prop: any; b: BilanBien }[]; year: number }) {
  const biens = items.map(({ prop, b }, i) => ({
    id: prop.id, idx: String(i + 1), name: prop.name, loyers: b.recettes.brut,
    copro: b.charges.copro, assurance: b.charges.assurance, taxe: b.charges.taxeFonciere + b.charges.cfe,
    travaux: b.charges.travauxDeductibles, gestion: b.charges.gestion + b.charges.autres + b.charges.commissionPlateforme,
    amort: b.amortissementsDeductibles, interets: b.charges.interets,
  }))
  const sum = (f: (b: typeof biens[number]) => number) => biens.reduce((s, b) => s + f(b), 0)
  const totalProduits = sum(b => b.loyers)
  const totalCoproEtc = sum(b => b.copro) + sum(b => b.travaux) + sum(b => b.assurance) + sum(b => b.taxe) + sum(b => b.gestion)
  const totalAmort = sum(b => b.amort)
  const totalChargesExploit = totalCoproEtc + totalAmort
  const resultatExploit = totalProduits - totalChargesExploit
  const totalChargesFin = sum(b => b.interets)
  const resultatFin = -totalChargesFin
  const resultatCourant = resultatExploit + resultatFin
  const totalCharges = totalChargesExploit + totalChargesFin
  const resultatNet = resultatCourant
  const reportes = items.reduce((s, x) => s + x.b.amortissementsReportes, 0)
  return (
    <div>
      <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: '#64748B' }}>
        Exercice {year} · {biens.length} bien{biens.length > 1 ? 's' : ''} meublé{biens.length > 1 ? 's' : ''}
      </p>
      <p className="text-xs font-bold uppercase tracking-wide mt-2 mb-1" style={{ color: '#166534' }}>Produits d'exploitation</p>
      <p className="text-[11px] font-medium mb-1" style={{ color: '#94A3B8' }}>Production vendue de services (loyers et provisions de charges encaissés)</p>
      {biens.map(b => <CRRow key={b.id} code={`7000${b.idx}`} label={`Loyers — ${b.name}`} value={b.loyers} indent />)}
      <CRSubtotal label="TOTAL DES PRODUITS D'EXPLOITATION (I)" value={totalProduits} color="#166534" />
      <p className="text-xs font-bold uppercase tracking-wide mt-5 mb-1" style={{ color: '#991B1B' }}>Charges d'exploitation</p>
      <p className="text-[11px] font-medium mb-1" style={{ color: '#94A3B8' }}>Achats et charges externes</p>
      {biens.map(b => b.travaux > 0 && <CRRow key={`t${b.id}`} code="615" label={`Entretien & réparations — ${b.name}`} value={b.travaux} indent />)}
      {biens.map(b => b.copro > 0 && <CRRow key={`c${b.id}`} code="614" label={`Charges de copropriété — ${b.name}`} value={b.copro} indent />)}
      {biens.map(b => b.assurance > 0 && <CRRow key={`a${b.id}`} code="616" label={`Assurances — ${b.name}`} value={b.assurance} indent />)}
      {biens.map(b => b.gestion > 0 && <CRRow key={`g${b.id}`} code="628" label={`Frais de gestion & divers — ${b.name}`} value={b.gestion} indent />)}
      {biens.map(b => b.taxe > 0 && <CRRow key={`x${b.id}`} code="635" label={`Taxe foncière (hors TEOM refacturée) & CFE — ${b.name}`} value={b.taxe} indent />)}
      <CRSubtotal label="Total achats et charges externes" value={totalCoproEtc} />
      <p className="text-[11px] font-medium mt-3 mb-1" style={{ color: '#94A3B8' }}>Dotations aux amortissements</p>
      {biens.map(b => b.amort > 0 && <CRRow key={`d${b.id}`} code="6811" label={`Dotation amortissements — ${b.name}`} value={b.amort} indent />)}
      {totalAmort === 0 && <p className="text-xs italic py-1" style={{ color: '#94A3B8', paddingLeft: 20 }}>Aucun amortissement déductible pour {year}</p>}
      <CRSubtotal label="TOTAL DES CHARGES D'EXPLOITATION (II)" value={totalChargesExploit} color="#991B1B" />
      <CRSubtotal label="RÉSULTAT D'EXPLOITATION (I − II)" value={resultatExploit} color={resultatExploit >= 0 ? '#166534' : '#991B1B'} />
      <p className="text-xs font-bold uppercase tracking-wide mt-5 mb-1" style={{ color: '#991B1B' }}>Charges financières</p>
      {biens.map(b => b.interets > 0 && <CRRow key={`i${b.id}`} code="661" label={`Intérêts d'emprunt — ${b.name}`} value={b.interets} indent />)}
      {totalChargesFin === 0 && <p className="text-xs italic py-1" style={{ color: '#94A3B8', paddingLeft: 20 }}>Aucune charge financière</p>}
      <CRSubtotal label="RÉSULTAT FINANCIER" value={resultatFin} color={resultatFin >= 0 ? '#166534' : '#991B1B'} />
      <CRSubtotal label="RÉSULTAT COURANT AVANT IMPÔTS" value={resultatCourant} color={resultatCourant >= 0 ? '#166534' : '#991B1B'} />
      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
        <CRRow label="Total des produits" value={totalProduits} />
        <CRRow label="Total des charges" value={totalCharges} />
        <CRSubtotal label={resultatNet >= 0 ? 'RÉSULTAT NET — Bénéfice' : 'RÉSULTAT NET — Perte (déficit reportable)'} value={resultatNet} strong color={resultatNet >= 0 ? '#166534' : '#991B1B'} />
      </div>
      {reportes > 0 && <p className="text-xs mt-3" style={{ color: '#92400E' }}>Amortissements non déduits cette année (reportés sans limite de durée) : {fmtCR(reportes)}</p>}
      <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
        Ventilation reconstituée depuis vos données de l'exercice {year} : loyers encaissés, charges de copropriété (appels de fonds saisis, sinon provisions mensuelles), taxe foncière et assurance payées, travaux payés, amortissements limités au résultat avant amortissement. Les intérêts d'emprunt sont estimés s'ils ne sont pas saisis — votre comptable retiendra le tableau d'amortissement bancaire.
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
          <p className="text-sm font-semibold text-white">Patrimo — Assistant fiscal</p>
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
  const [allProperties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [tmi, setTmi] = useState(30)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, leases(*, payments(*)), expenses(*), incidents(*), depreciation_plans(*), sci_associates(*), airbnb_bookings(*)')
        .order('name')
      setProperties(data ?? [])
      setLoading(false)
    }
    load()
  }, [year])

  // Calculs par type
  // Bien vendu : déclaré jusqu'à l'année de vente incluse, exclu ensuite
  const properties = allProperties.filter(p => detenuSurAnnee(p, year))
  const lmnpProps = properties.filter(p => p.type === 'lmnp' || p.type === 'airbnb')
  const nuProps = properties.filter(p => p.type === 'nu' || p.type === 'commerce')
  const sciProps = properties.filter(p => p.type === 'sci')

  // Tous les chiffres viennent de la source unique lib/fiscal/bilan.ts (mêmes valeurs que Tableau fiscal / Fiscalité / exports)
  const bilans: Record<string, BilanBien> = {}
  for (const p of properties) bilans[p.id] = bilanBien(p, year)
  const bil = (p: any) => bilans[p.id]
  const alertesTous: { bien: string; a: Alerte }[] = properties.flatMap(p => bil(p).alertes.map(a => ({ bien: p.name, a })))
  const ordre = { erreur: 0, attention: 1, info: 2 } as const
  alertesTous.sort((x, y) => ordre[x.a.gravite] - ordre[y.a.gravite])

  // Agrégats pour le chat
  const totalPatrimoine = properties.reduce((s, p) => s + (p.purchase_price ?? 0), 0)
  const chatContext = `Situation fiscale ${year}: ${lmnpProps.length} LMNP, ${nuProps.length} foncier nu, ${sciProps.length} SCI. Patrimoine: ${formatCurrency(totalPatrimoine)}. TMI: ${tmi}%.`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <BackButton />

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
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y} className="bg-[var(--bg-secondary)]">{y}</option>
              ))}
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

      {/* Contrôles de cohérence */}
      {alertesTous.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
          <p className="font-display font-semibold text-base mb-3" style={{ color: '#0F172A' }}>
            Points à vérifier avant de déclarer ({alertesTous.length})
          </p>
          <div className="space-y-2">
            {alertesTous.map((x, i) => {
              const c = x.a.gravite === 'attention' ? { bg: '#FFFBEB', bd: '#FCD34D', tx: '#92400E', ic: '⚠️' } : x.a.gravite === 'erreur' ? { bg: '#FEF2F2', bd: '#FCA5A5', tx: '#991B1B', ic: '🚨' } : { bg: '#F8FAFC', bd: 'rgba(0,0,0,0.08)', tx: '#475569', ic: 'ℹ️' }
              return (
                <div key={i} className="p-3 rounded-lg text-xs" style={{ background: c.bg, border: `1px solid ${c.bd}`, color: c.tx }}>
                  <p className="font-semibold">{c.ic} {x.bien} — {x.a.titre}</p>
                  <p className="mt-0.5 leading-relaxed">{x.a.detail}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                const b = bil(prop)
                const isReel = prop.lmnp_regime === 'reel'
                const abatt = prop.type === 'airbnb' && !prop.meuble_classe ? 0.30 : 0.50
                const plafondMicro = prop.type === 'airbnb' && !prop.meuble_classe ? 15000 : 83600
                const taux = tmi / 100 + 0.186
                const impotMicro = b.recettes.brut * (1 - abatt) * taux
                const impotReel = Math.max(0, b.resultat) * taux
                return (
                  <div key={prop.id} className="mb-5">
                    <p className="text-sm font-semibold mb-3 pb-2 border-b"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                      {prop.name} — Régime {isReel ? 'réel' : 'micro-BIC'}
                    </p>
                    {isReel ? (
                      <>
                        <CaseLine c={{ code: '5NA', label: 'Bénéfice BIC non professionnel (régime réel)', value: Math.max(0, b.resultat), obligatoire: true, note: `Recettes ${formatCurrency(b.recettes.brut)} − charges ${formatCurrency(b.chargesDeductibles)} − amortissements déduits ${formatCurrency(b.amortissementsDeductibles)}. Si le résultat est négatif, laissez vide et remplissez 5NY.` }} />
                        <CaseLine c={{ code: '5NY', label: 'Déficit BIC non professionnel', value: b.deficit?.total ?? 0, obligatoire: false, note: 'Imputable uniquement sur les bénéfices BIC meublés des 10 années suivantes. Les amortissements ne peuvent pas créer ce déficit.' }} />
                        <CaseLine c={{ code: 'Info', label: 'Recettes brutes encaissées', value: b.recettes.brut, obligatoire: false, note: 'À reporter aussi sur la liasse 2031/2033 ; sert au contrôle des seuils.' }} />
                        {b.amortissementsReportes > 0 && <CaseLine c={{ code: 'Info', label: 'Amortissements reportés (non déduits)', value: b.amortissementsReportes, obligatoire: false, note: 'Reportables sans limite de durée — à conserver dans le tableau des amortissements.' }} />}
                        <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
                          <strong>⚠️ Régime réel :</strong> la liasse fiscale (2031 + 2033) est obligatoire — via votre expert-comptable ou en ligne sur impots.gouv.fr. Si vous êtes adhérent d'un OGA, l'abattement de 20 % n'existe plus : seule la liasse compte.
                        </div>
                      </>
                    ) : (
                      <>
                        <CaseLine c={{ code: '5ND', label: 'Recettes BIC non professionnelles (micro-BIC)', value: b.recettes.brut, obligatoire: true, note: `Recettes brutes (loyers + charges encaissés). L'abattement de ${abatt * 100} % est appliqué automatiquement par l'administration. Plafond : ${formatCurrency(plafondMicro)}.` }} />
                        {b.recettes.brut > plafondMicro && <div className="mt-2 p-3 rounded-lg text-xs" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B' }}>🚨 Recettes au-dessus du plafond micro-BIC ({formatCurrency(plafondMicro)}) : le régime réel s'applique.</div>}
                      </>
                    )}
                    <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
                      Comparatif (TMI {tmi} % + prélèvements sociaux 18,6 %) : micro-BIC ≈ <strong>{formatCurrency(impotMicro)}</strong> · réel ≈ <strong>{formatCurrency(impotReel)}</strong>
                      {impotReel < impotMicro - 1 ? ` → le réel économise ${formatCurrency(impotMicro - impotReel)}.` : impotMicro < impotReel - 1 ? ` → le micro-BIC économise ${formatCurrency(impotReel - impotMicro)}.` : '.'}
                    </div>
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

          {/* ── Compte de résultat détaillé LMNP ── */}
          {lmnpProps.length > 0 && (
            <Section title="Compte de résultat détaillé"
              icon={<BookOpen className="h-4 w-4" style={{ color: '#166534' }} />}
              badge="Comme votre comptable">
              <div className="mb-4">
                <p className="text-sm" style={{ color: '#475569' }}>
                  Présentation comptable de vos locations meublées (régime réel), ventilée par bien
                  et par poste — produits, charges, amortissements et résultat de l'exercice.
                </p>
              </div>
              <CompteResultatLMNP items={lmnpProps.map(p => ({ prop: p, b: bil(p) }))} year={year} />
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
                const b = bil(prop)
                const L = b.l2044
                const microBase = L.l215 * 0.7
                return (
                  <div key={prop.id} className="mb-5">
                    <p className="text-sm font-semibold mb-3 pb-2 border-b"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                      {prop.name}{b.mois < 12 ? ` — ${b.mois} mois pris en compte` : ''}
                    </p>
                    <CaseLine c={{ code: '211', label: 'Loyers bruts encaissés', value: L.l211, obligatoire: true, note: `${b.recettes.nbPaiements} loyer(s) reçu(s) en ${year}, hors provisions de charges (${formatCurrency(b.recettes.provisions)} de provisions encaissées, non imposables).` }} />
                    <CaseLine c={{ code: '221', label: 'Frais d\'administration et de gestion (réels)', value: L.l221, obligatoire: false, note: 'Honoraires de gestion, frais de syndic hors provisions, frais de procédure, autres charges saisies.' }} />
                    <CaseLine c={{ code: '222', label: 'Forfait « autres frais de gestion » (20 € par local)', value: L.l222, obligatoire: false, note: 'Forfait de 20 € par logement loué, sans justificatif.' }} />
                    <CaseLine c={{ code: '223', label: 'Primes d\'assurance (PNO, GLI)', value: L.l223, obligatoire: false, note: 'Assurance propriétaire non occupant et garantie loyers impayés payées dans l\'année.' }} />
                    <CaseLine c={{ code: '224', label: 'Réparations, entretien, amélioration', value: L.l224, obligatoire: false, note: 'Travaux PAYÉS dans l\'année. Construction, reconstruction et agrandissement exclus.' }} />
                    <CaseLine c={{ code: '227', label: 'Taxes foncières', value: L.l227, obligatoire: false, note: b.charges.teomRefacturee > 0 ? `Taxe brute ${formatCurrency(b.charges.taxeFonciereBrute)} − TEOM refacturée au locataire ${formatCurrency(b.charges.teomRefacturee)} (non déductible).` : 'Montant payé dans l\'année (hors TEOM si elle est récupérée sur le locataire).' }} />
                    <CaseLine c={{ code: '229', label: 'Provisions de copropriété payées', value: L.l229, obligatoire: false, note: 'Provisions payées au syndic dans l\'année (appels de fonds).' }} />
                    <CaseLine c={{ code: '230', label: `Régularisation des provisions déduites en ${year - 1}`, value: L.l230, obligatoire: false, note: `À SOUSTRAIRE : part récupérable sur le locataire des charges réelles ${year - 1}, issue de votre régularisation de charges.` }} />
                    <CaseLine c={{ code: '240', label: 'Total des frais et charges (221 à 229 − 230)', value: L.l240, obligatoire: true }} />
                    <CaseLine c={{ code: '250', label: 'Intérêts d\'emprunt', value: L.l250, obligatoire: false, note: b.charges.interetsEstimes ? 'ESTIMATION d\'après taux et durée du prêt — reprenez le montant de l\'attestation de la banque.' : 'Intérêts + assurance emprunteur + frais de dossier du prêt.' }} />
                    <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <CaseLine c={{ code: '261', label: b.l2044.l261 >= 0 ? 'Revenu foncier net (215 − 240 − 250)' : 'Déficit foncier', value: Math.abs(L.l261), obligatoire: true, note: b.l2044.l261 >= 0 ? 'Reporté ligne 420, puis case 4BA de la 2042 (additionner avec vos autres biens).' : 'Voir la répartition ci-dessous.' }} />
                      {b.deficit && (
                        <>
                          <CaseLine c={{ code: '4BC', label: 'Déficit imputable sur le revenu global', value: b.deficit.imputableGlobal, obligatoire: false, note: `Hors part due aux intérêts, plafonné à 10 700 €/an. Vérifiez la case exacte (4BB/4BC) selon la notice 2044.` }} />
                          <CaseLine c={{ code: 'Report', label: 'Déficit reportable sur revenus fonciers (10 ans)', value: b.deficit.reportable, obligatoire: false, note: 'Part due aux intérêts + excédent au-delà du plafond : à inscrire dans le cadre « déficits antérieurs » (lignes 450-451) de la 2044 des années suivantes.' }} />
                        </>
                      )}
                    </div>
                    {L.l215 <= 15000 && L.l215 > 0 && (
                      <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1E40AF' }}>
                        Micro-foncier possible (recettes ≤ 15 000 € et pas de bien en dispositif spécial) : base imposable {formatCurrency(microBase)} (abattement 30 %, case 4BE) contre {formatCurrency(Math.max(0, L.l261))} au réel. {L.l261 > microBase ? 'Le micro-foncier est plus avantageux cette année — mais l\'option engage 3 ans.' : 'Le réel est plus avantageux.'}
                      </div>
                    )}
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
                const b = bil(prop)
                const isIS = prop.sci_regime === 'is'
                const revenus = isIS ? b.recettes.brut : b.recettes.loyers
                const resultat = b.resultat
                const sim = calculateSciSimulation({ resultat_comptable: resultat, regime: (prop.sci_regime ?? 'ir') as 'ir' | 'is', taux_marginal: tmi / 100 })
                return (
                  <div key={prop.id} className="mb-5">
                    <p className="text-sm font-semibold mb-3 pb-2 border-b"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                      {prop.sci_name ?? prop.name} — {prop.sci_regime?.toUpperCase() ?? 'IR'}
                    </p>
                    <CaseLine c={{ code: 'Cadre A', label: 'Revenus bruts de la société', value: revenus, obligatoire: true, note: isIS ? 'Loyers et provisions encaissés.' : 'Loyers encaissés hors provisions de charges.' }} />
                    <CaseLine c={{ code: 'Cadre B', label: 'Charges déductibles (hors intérêts)', value: b.chargesDeductiblesHorsInterets, obligatoire: true }} />
                    <CaseLine c={{ code: 'Intérêts', label: 'Intérêts d\'emprunt', value: b.charges.interets, obligatoire: false, note: b.charges.interetsEstimes ? 'Estimation — reprenez l\'attestation bancaire.' : undefined }} />
                    {isIS && <CaseLine c={{ code: 'Amort.', label: 'Amortissements déduits', value: b.amortissementsDeductibles, obligatoire: false, note: b.amortissementsReportes > 0 ? `${formatCurrency(b.amortissementsReportes)} reportés.` : undefined }} />}
                    <CaseLine c={{ code: 'Résultat', label: resultat >= 0 ? 'Bénéfice net' : 'Déficit net', value: Math.abs(resultat), obligatoire: true }} />
                    {isIS && <CaseLine c={{ code: 'IS dû', label: 'Impôt sur les sociétés (15 % < 42 500 €, 25 % au-delà)', value: sim.is_du, obligatoire: true, note: 'Acomptes : 15/03, 15/06, 15/09, 15/12' }} />}
                    {!isIS && (prop.sci_associates ?? []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>QUOTE-PART PAR ASSOCIÉ — à reporter sur leur 2044 personnelle</p>
                        {(prop.sci_associates ?? []).map((a: any) => (
                          <CaseLine key={a.id} c={{
                            code: `${a.share_pct}%`, label: `Quote-part de ${a.name}`,
                            value: Math.round(resultat * a.share_pct / 100 * 100) / 100, obligatoire: true,
                            note: `${a.name} reporte ce montant sur sa 2044 (revenus fonciers de la SCI).`,
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
            Ces informations sont données à titre indicatif. Patrimo n'est pas un cabinet de conseil fiscal. Pour les situations complexes, consultez un expert-comptable ou un conseiller fiscal agréé.
          </div>
        </div>
      </div>
    </div>
  )
}
