import { Bot, User } from 'lucide-react'
import type { AiMessage } from '@/types'

interface MessageBubbleProps {
  message: AiMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-blue-500 text-white text-sm">
          {message.content}
        </div>
        <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-blue-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-400/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-blue-400" />
      </div>
      <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/[0.08] text-sm text-slate-200">
        {message.content ? (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)]">
            {message.content.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < message.content.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  )
}
