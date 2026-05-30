import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/templates'
import { z } from 'zod'

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const fromName = profile?.full_name ?? 'Patrimo'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1A1714;">
      ${parsed.data.body.replace(/\n/g, '<br/>').replace(/•/g, '&bull;')}
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #E5E2DB;" />
      <p style="font-size: 12px; color: #9B9589;">Email envoyé via <strong>Patrimo</strong></p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@propilot.ai',
    to: parsed.data.to,
    subject: parsed.data.subject,
    html,
    replyTo: user.email,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
