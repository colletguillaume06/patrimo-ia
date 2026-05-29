'use client'

import { useState, useCallback } from 'react'
import type { AiMessage } from '@/types'

export function useCopilot(initialMessages: AiMessage[] = []) {
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (content: string, property_id?: string) => {
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

    const assistantMsg: AiMessage = {
      id: crypto.randomUUID(),
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
          history: messages.slice(-10),
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Erreur de connexion au copilot')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content ?? ''
            fullContent += delta
            setMessages(prev => prev.map(m =>
              m.id === assistantMsg.id ? { ...m, content: fullContent } : m
            ))
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: 'Désolé, une erreur est survenue. Veuillez réessayer.' }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  return { messages, isLoading, sendMessage }
}
