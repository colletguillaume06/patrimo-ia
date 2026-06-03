'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { Bot, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { differenceInDays, differenceInMonths } from 'date-fns'

interface Suggestion {
  question: string
  context: string
  urgence?: boolean
}

const SUGGESTIONS_FALLBACK: Suggestion[] = [
  { question: 'Quel régime fiscal est le plus avantageux pour mon LMNP ?', context: 'Fiscalité' },
  { question: 'Comment calculer la révision de loyer avec l\'IRL ?', context: 'Loyers' },
  { question: 'Quelles charges sont déductibles en location nue ?', context: 'Fiscalité' },
  { question: 'Comment optimiser mon cashflow immobilier ?', context: 'Gestion' },
]

export function AiCopilotWidget() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(SUGGESTIONS_FALLBACK)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const buildSuggestions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: props } = await supabase
        .from('properties')
        .select('id, name, type, leases(tenant_name, monthly_rent, last_revision_date, start_date, is_active, payments(status, due_date, amount))')
        .eq('user_id', user.id)

      const now = new Date()
      const contextual: Suggestion[] = []

      for (const prop of (props ?? [])) {
        for (const lease of (prop.leases ?? []) as any[]) {
          if (!lease.is_active) continue

          // Loyer en retard → suggestion urgente
          const late = (lease.payments ?? []).filter((p: any) => {
            return p.status === 'pending' && differenceInDays(now, new Date(p.due_date)) >= 5
          })
          if (late.length > 0) {
            contextual.push({
              question: `Comment rédiger une relance pour ${lease.tenant_name} qui n'a pas payé son loyer ?`,
              context: '⚠️ Loyer en retard',
              urgence: true,
            })
          }

          // Révision IRL disponible
          const lastRev = lease.last_revision_date ? new Date(lease.last_revision_date) : new Date(lease.start_date)
          if (differenceInMonths(now, lastRev) >= 12) {
            contextual.push({
              question: `Comment calculer la révision de loyer de ${prop.name} avec l'IRL du dernier trimestre ?`,
              context: '📈 Révision possible',
            })
          }
        }

        // Suggestion par type de bien
        if (prop.type === 'lmnp' && contextual.length < 2) {
          contextual.push({
            question: `Régime réel ou micro-BIC pour ${prop.name} — quelle est la meilleure option ?`,
            context: '💡 LMNP',
          })
        }
        if (prop.type === 'nu' && contextual.length < 2) {
          contextual.push({
            question: `Comment déclarer les revenus fonciers de ${prop.name} en régime réel ?`,
            context: '💡 Foncier nu',
          })
        }
        if (prop.type === 'commerce' && contextual.length < 2) {
          contextual.push({
            question: `Quels sont mes droits pour réviser le loyer de ${prop.name} avec l'ILC ?`,
            context: '💡 Bail commercial',
          })
        }
      }

      // Compléter avec fallback si moins de 4 suggestions
      const final = [...contextual, ...SUGGESTIONS_FALLBACK]
        .filter((s, i, arr) => arr.findIndex(x => x.question === s.question) === i)
        .slice(0, 4)

      setSuggestions(final.length > 0 ? final : SUGGESTIONS_FALLBACK)
      setLoading(false)
    }

    buildSuggestions()
  }, [])

  return (
    <GlassCard className="h-full flex flex-col" glow="blue">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Copilot IA</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Suggestions basées sur votre situation</p>
        </div>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
      </div>

      <div className="space-y-2 flex-1">
        {suggestions.map((s, i) => (
          <Link
            key={i}
            href={`/copilot?q=${encodeURIComponent(s.question)}`}
            className="flex items-start gap-2 p-2.5 rounded-lg border hover:border-blue-400/40 transition-all group"
            style={{
              background: s.urgence ? '#FEF2F2' : 'var(--bg-secondary)',
              borderColor: s.urgence ? '#FECACA' : 'var(--border)',
            }}>
            <Bot className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: s.urgence ? '#DC2626' : '#64748B' }} />
            <div className="flex-1 min-w-0">
              {s.context && (
                <span className="text-[10px] font-semibold mb-0.5 block"
                  style={{ color: s.urgence ? '#DC2626' : '#1D4ED8' }}>
                  {s.context}
                </span>
              )}
              <span className="text-xs line-clamp-2 transition-colors group-hover:text-blue-600"
                style={{ color: 'var(--text-primary)' }}>
                {s.question}
              </span>
            </div>
            <ArrowRight className="h-3 w-3 flex-shrink-0 mt-1" style={{ color: '#94A3B8' }} />
          </Link>
        ))}
      </div>

      <Link
        href="/copilot"
        className="mt-4 flex items-center justify-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-all"
        style={{ background: 'var(--bg-secondary)', border: '1px solid #93C5FD', color: '#1D4ED8' }}>
        Ouvrir le Copilot <ArrowRight className="h-4 w-4" />
      </Link>
    </GlassCard>
  )
}
