'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { Bot, ArrowRight, Sparkles } from 'lucide-react'
import { SUGGESTED_QUESTIONS } from '@/lib/openai/prompts'

export function AiCopilotWidget() {
  const questions = SUGGESTED_QUESTIONS.slice(0, 4)

  return (
    <GlassCard className="h-full flex flex-col" glow="blue">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-[var(--text-primary)] text-sm">Copilot IA</h2>
          <p className="text-xs text-[var(--text-muted)]">Votre expert immobilier</p>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {questions.map((q) => (
          <Link
            key={q}
            href={`/copilot?q=${encodeURIComponent(q)}`}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8F7F4] hover:bg-white/[0.06] border border-[var(--border-subtle)] hover:border-blue-500/20 transition-all group"
          >
            <Bot className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-blue-400 flex-shrink-0 transition-colors" />
            <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] flex-1 transition-colors line-clamp-1">
              {q}
            </span>
            <ArrowRight className="h-3 w-3 text-[var(--text-subtle)] group-hover:text-blue-400 flex-shrink-0 transition-colors" />
          </Link>
        ))}
      </div>

      <Link
        href="/copilot"
        className="mt-4 flex items-center justify-center gap-2 p-2.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-medium transition-all"
      >
        Ouvrir le Copilot <ArrowRight className="h-4 w-4" />
      </Link>
    </GlassCard>
  )
}
