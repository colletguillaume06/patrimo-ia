import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'
import { buildSystemPrompt } from '@/lib/openai/prompts'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  message: z.string().min(1).max(2000),
  property_id: z.string().uuid().nullable().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { message, property_id, history = [] } = parsed.data

  const service = await createServiceClient()

  const { data: properties } = await service
    .from('properties')
    .select('*, leases(monthly_rent, is_active), expenses(amount)')
    .eq('user_id', user.id)

  const { count: lateCount } = await service
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'late')

  const totalPatrimoine = (properties ?? []).reduce((s, p) => s + (p.purchase_price ?? 0), 0)
  const monthlyRevenue = (properties ?? []).reduce((s, p) => {
    const active = p.leases?.filter((l: any) => l.is_active) ?? []
    return s + active.reduce((ls: number, l: any) => ls + (l.monthly_rent ?? 0), 0)
  }, 0)

  let propertyDetail = undefined
  if (property_id) {
    const { data } = await service
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single()
    propertyDetail = data
  }

  const systemPrompt = buildSystemPrompt({
    properties: properties ?? [],
    totalPatrimoine,
    monthlyCashflow: monthlyRevenue,
    loyers_en_retard: lateCount ?? 0,
  }, propertyDetail)

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
    max_tokens: 1500,
    temperature: 0.7,
  })

  await service.from('ai_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
    property_id: property_id ?? null,
  })

  let assistantContent = ''
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        assistantContent += delta
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
      controller.close()

      await service.from('ai_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: assistantContent,
        property_id: property_id ?? null,
      })
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
