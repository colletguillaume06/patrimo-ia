'use client'

import { useState, useRef, useEffect } from 'react'
import { useCopilot } from '@/hooks/useCopilot'
import { MessageBubble } from './MessageBubble'
import { SuggestedQuestions } from './SuggestedQuestions'
import { Send, Sparkles, AlertTriangle } from 'lucide-react'
import type { AiMessage } from '@/types'

interface ChatInterfaceProps {
  initialMessages?: AiMessage[]
  propertyId?: string
  initialQuestion?: string
}

export function ChatInterface({ initialMessages = [], propertyId, initialQuestion }: ChatInterfaceProps) {
  const { messages, isLoading, apiError, sendMessage } = useCopilot(initialMessages)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (initialQuestion && !hasInitialized.current && messages.length === 0) {
      hasInitialized.current = true
      sendMessage(initialQuestion, propertyId)
    }
  }, [initialQuestion])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput('')
    sendMessage(trimmed, propertyId)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-400/20 border border-blue-500/30 flex items-center justify-center">
          <Sparkles className="h-4.5 w-4.5 text-blue-400" />
        </div>
        <div>
          <p className="font-display font-semibold text-[var(--text-primary)]">Patrimo Copilot</p>
          <p className="text-xs text-slate-500">Expert en immobilier et fiscalité française</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${apiError ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
          <span className={`text-xs ${apiError ? 'text-red-400' : 'text-[var(--success)]'}`}>
            {apiError ? 'Hors ligne' : 'En ligne'}
          </span>
        </div>
      </div>

      {/* Bannière erreur API */}
      {apiError && (
        <div className="mx-4 mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Copilot indisponible</p>
            <p className="text-xs text-red-300/70 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {messages.length === 0 && (
        <SuggestedQuestions onSelect={q => sendMessage(q, propertyId)} />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="font-display font-semibold text-[var(--text-primary)] text-lg mb-2">Votre copilote immobilier</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              Posez vos questions sur votre patrimoine, la fiscalité, vos loyers, ou demandez des analyses personnalisées.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-end gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-blue-500/30 transition-all">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez une question sur votre patrimoine..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-text-tertiary focus:outline-none resize-none max-h-32"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all"
          >
            <Send className="h-3.5 w-3.5 text-[var(--text-primary)]" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Patrimo · Expert immobilier IA · Ne remplace pas un conseil fiscal professionnel
        </p>
      </div>
    </div>
  )
}
