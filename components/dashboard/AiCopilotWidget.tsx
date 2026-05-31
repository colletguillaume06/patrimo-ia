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
          <h2 className="font-display font-semibold text-sm" style={{ color: '#0F172A' }}>Copilot IA</h2>
          <p className="text-xs" style={{ color: '#475569' }}>Votre expert immobilier</p>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {questions.map((q) => (
          <Link
            key={q}
            href={`/copilot?q=${encodeURIComponent(q)}`}
            className="flex items-center gap-2 p-2.5 rounded-lg border hover:border-blue-400/40 transition-all group" style={{ background: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)' }}
          >
            <Bot className="h-3.5 w-3.5 flex-shrink-0 transition-colors group-hover:text-blue-500" style={{ color: '#64748B' }} />
            <span className="text-xs flex-1 transition-colors line-clamp-1 group-hover:text-blue-600" style={{ color: '#1E293B' }}>
              {q}
            </span>
            <ArrowRight className="h-3 w-3 flex-shrink-0 transition-colors group-hover:text-blue-500" style={{ color: '#94A3B8' }} />
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
