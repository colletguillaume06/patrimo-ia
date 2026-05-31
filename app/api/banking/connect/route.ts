import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createRequisition } from '@/lib/nordigen/client'
import { z } from 'zod'

const schema = z.object({ institution_id: z.string() })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.NORDIGEN_SECRET_ID) {
    return NextResponse.json({ error: 'Nordigen non configuré' }, { status: 503 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'institution_id requis' }, { status: 400 })

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const redirectUrl = `${baseUrl}/api/banking/callback`

    // Créer la requisition Nordigen
    const requisition = await createRequisition({
      institution_id: parsed.data.institution_id,
      redirect_url: redirectUrl,
      reference: `patrimo-${user.id}-${Date.now()}`,
    })

    // Sauvegarder en base
    const service = await createServiceClient()
    await service.from('banking_connections').insert({
      user_id: user.id,
      institution_id: parsed.data.institution_id,
      requisition_id: requisition.id,
      status: 'pending',
    })

    // Retourner l'URL de redirection vers la banque
    return NextResponse.json({
      link: requisition.link,
      requisition_id: requisition.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
