import { Lightbulb } from 'lucide-react'
import { SUGGESTED_QUESTIONS } from '@/lib/openai/prompts'

interface SuggestedQuestionsProps {
  onSelect: (q: string) => void
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="p-4 border-b border-white/[0.06]">
      <p className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        Questions suggérées
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-[#0A0908] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
