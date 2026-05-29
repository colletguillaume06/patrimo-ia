import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANS } from '@/lib/stripe/client'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  plan: z.enum(['pro', 'premium']),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const { plan } = parsed.data
  const service = await createServiceClient()
  const { data: profile } = await service.from('profiles').select('*').eq('id', user.id).single()

  const priceId = plan === 'pro'
    ? process.env.STRIPE_PRICE_PRO_MONTHLY
    : process.env.STRIPE_PRICE_PREMIUM_MONTHLY

  if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 })

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=cancelled`,
    metadata: { user_id: user.id, plan },
  })

  return NextResponse.json({ url: session.url })
}
