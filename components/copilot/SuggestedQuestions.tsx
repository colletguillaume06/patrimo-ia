import { Lightbulb } from 'lucide-react'
import { SUGGESTED_QUESTIONS } from '@/lib/openai/prompts'

interface SuggestedQuestionsProps {
  onSelect: (q: string) => void
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="p-4 border-b border-border">
      <p className="flex items-center gap-1.5 text-xs text-text-secondary mb-3">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        Questions suggérées
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs px-3 py-1.5 rounded-full bg-bg-tertiary/30 border border-border text-text-tertiary hover:text-text-primary hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
