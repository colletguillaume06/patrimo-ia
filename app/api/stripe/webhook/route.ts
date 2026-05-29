import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const service = await createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const user_id = session.metadata?.user_id
    const plan = session.metadata?.plan as 'pro' | 'premium' | undefined

    if (user_id && plan) {
      await service.from('profiles').update({
        plan,
        stripe_subscription_id: session.subscription as string,
      }).eq('id', user_id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await service.from('profiles').update({ plan: 'starter', stripe_subscription_id: null })
      .eq('stripe_customer_id', sub.customer as string)
  }

  return NextResponse.json({ received: true })
}
