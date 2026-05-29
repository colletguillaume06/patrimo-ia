import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend, getRelanceTemplate } from '@/lib/resend/templates'
import { calculateRevisionIRL, calculateRevisionILC, calculateRevisionILAT, IRL_CURRENT, ILC_CURRENT, ILAT_CURRENT, getQuarterLabel } from '@/lib/fiscal/indices'
import { z } from 'zod'

const schema = z.object({
  lease_id: z.string().uuid(),
  ancien_indice: z.number().positive(),
  notify: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { lease_id, ancien_indice, notify } = parsed.data
  const service = await createServiceClient()

  const { data: lease } = await service
    .from('leases')
    .select('*, property:properties(name, user_id, indice_revision)')
    .eq('id', lease_id)
    .single()

  if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
  if (lease.property?.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const indice = lease.property?.indice_revision ?? 'irl'
  let nouveau_loyer: number

  if (indice === 'ilc') {
    nouveau_loyer = calculateRevisionILC(lease.monthly_rent, ancien_indice)
  } else if (indice === 'ilat') {
    nouveau_loyer = calculateRevisionILAT(lease.monthly_rent, ancien_indice)
  } else {
    nouveau_loyer = calculateRevisionIRL(lease.monthly_rent, ancien_indice)
  }

  const hausse = nouveau_loyer - lease.monthly_rent
  const hausse_pct = (hausse / lease.monthly_rent) * 100

  // Appliquer la révision
  await service.from('leases').update({
    monthly_rent: nouveau_loyer,
    last_revision_date: new Date().toISOString().split('T')[0],
  }).eq('id', lease_id)

  // Notifier le locataire si demandé
  if (notify && lease.tenant_email) {
    const { data: profile } = await service.from('profiles').select('full_name').eq('id', user.id).single()

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@propilot.ai',
      to: lease.tenant_email,
      subject: `Révision de votre loyer — ${lease.property?.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Révision annuelle de votre loyer</h2>
          <p>Bonjour ${lease.tenant_name},</p>
          <p>Conformément à l'article de révision de votre bail et à l'indice ${indice.toUpperCase()} publié par l'INSEE, votre loyer fait l'objet d'une révision annuelle.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;">Ancien loyer</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${lease.monthly_rent.toFixed(2)} €</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Ancien indice ${indice.toUpperCase()}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${ancien_indice}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Nouvel indice ${indice.toUpperCase()}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${indice === 'irl' ? IRL_CURRENT : indice === 'ilc' ? ILC_CURRENT : ILAT_CURRENT} (${getQuarterLabel()})</td>
            </tr>
            <tr style="background: #e8f4e8; font-weight: bold;">
              <td style="padding: 10px; border: 1px solid #ddd;">Nouveau loyer</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${nouveau_loyer.toFixed(2)} €</td>
            </tr>
          </table>
          <p>Cette révision prend effet à compter du <strong>${new Date().toLocaleDateString('fr-FR')}</strong>.</p>
          <p>Cordialement,<br>${profile?.full_name ?? 'Votre propriétaire'}</p>
        </div>
      `,
    })
  }

  return NextResponse.json({
    ancien_loyer: lease.monthly_rent,
    nouveau_loyer,
    hausse,
    hausse_pct: Math.round(hausse_pct * 100) / 100,
    indice,
  })
}
