import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend, getRelanceTemplate } from '@/lib/resend/templates'
import { z } from 'zod'

const schema = z.object({ payment_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const service = await createServiceClient()

  const { data: payment } = await service
    .from('payments')
    .select(`
      *,
      lease:leases(
        tenant_name, tenant_email,
        property:properties(name, user_id)
      )
    `)
    .eq('id', parsed.data.payment_id)
    .single()

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.lease?.property?.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profile } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const relance_count = (payment.relance_count ?? 0) + 1
  const tenant_email = payment.lease?.tenant_email
  if (!tenant_email) return NextResponse.json({ error: 'No tenant email' }, { status: 400 })

  const { subject, html } = getRelanceTemplate({
    tenant_name: payment.lease.tenant_name,
    property_name: payment.lease.property.name,
    amount: payment.amount,
    due_date: new Date(payment.due_date).toLocaleDateString('fr-FR'),
    owner_name: profile?.full_name ?? 'Votre propriétaire',
    relance_count,
  })

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@propilot.ai',
    to: tenant_email,
    subject,
    html,
  })

  if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 })

  await service.from('payments').update({
    relance_count,
    last_relance_at: new Date().toISOString(),
    status: 'late',
  }).eq('id', parsed.data.payment_id)

  return NextResponse.json({ success: true, relance_count })
}
