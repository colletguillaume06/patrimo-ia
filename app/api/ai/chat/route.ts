import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/openai/prompts'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  message: z.string().min(1).max(2000),
  property_id: z.string().uuid().nullable().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
})

export async function POST(req: NextRequest) {
  // Vérification clé OpenAI en amont — retourne une erreur lisible si absente
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY non configurée. Ajoutez-la dans .env.local pour activer le Copilot.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { message, property_id, history = [] } = parsed.data
  const service = await createServiceClient()

  // Contexte portefeuille
  const [{ data: properties }, { count: lateCount }] = await Promise.all([
    service
      .from('properties')
      .select('*, leases(monthly_rent, is_active)')
      .eq('user_id', user.id),
    service
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'late'),
  ])

  const totalPatrimoine = (properties ?? []).reduce((s, p) => s + (p.purchase_price ?? 0), 0)
  const monthlyCashflow = (properties ?? []).reduce((s, p) => {
    const rent = (p.leases ?? []).filter((l: any) => l.is_active).reduce((ls: number, l: any) => ls + (l.monthly_rent ?? 0), 0)
    const charges = p.monthly_charges + p.loan_monthly + (p.property_tax / 12) + (p.insurance_annual / 12)
    return s + rent - charges
  }, 0)

  // Détail bien si property_id fourni (inclut les infos spécifiques au type)
  let propertyDetail = null
  if (property_id) {
    const { data } = await service
      .from('properties')
      .select('*, leases(tenant_name, monthly_rent, is_active, start_date, end_date), depreciation_plans(*)')
      .eq('id', property_id)
      .single()
    propertyDetail = data
  }

  const systemPrompt = buildSystemPrompt(
    { properties: properties ?? [], totalPatrimoine, monthlyCashflow, loyers_en_retard: lateCount ?? 0 },
    propertyDetail
  )

  // Import dynamique pour éviter que l'absence de clé ne crash au démarrage
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]

  // Sauvegarder le message user
  await service.from('ai_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
    property_id: property_id ?? null,
  })

  let stream: any
  try {
    stream = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      max_tokens: 1500,
      temperature: 0.7,
    })
  } catch (err: any) {
    const msg = err?.message ?? 'Erreur OpenAI'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  let assistantContent = ''
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          assistantContent += delta
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }
      } catch (err) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Stream interrompu' })}\n\n`)
        )
      } finally {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()

        if (assistantContent) {
          await service.from('ai_messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantContent,
            property_id: property_id ?? null,
          })
        }
      }
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
