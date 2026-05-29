'use client'

import { useState, useCallback } from 'react'
import type { AiMessage } from '@/types'

export function useCopilot(initialMessages: AiMessage[] = []) {
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string, property_id?: string) => {
    setApiError(null)

    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      user_id: '',
      role: 'user',
      content,
      property_id: property_id ?? null,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    const assistantMsg: AiMessage = {
      id: assistantId,
      user_id: '',
      role: 'assistant',
      content: '',
      property_id: property_id ?? null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          property_id: property_id ?? null,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      // Erreur non-stream (503 clé manquante, 401, etc.)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const errMsg = errData.error ?? `Erreur ${res.status}`
        setApiError(errMsg)
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        return
      }

      if (!res.body) throw new Error('Pas de stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) { setApiError(parsed.error); break }
            const delta = parsed.choices?.[0]?.delta?.content ?? ''
            fullContent += delta
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            ))
          } catch {}
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Erreur de connexion. Vérifiez votre réseau et réessayez.' }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  return { messages, isLoading, apiError, sendMessage }
}
