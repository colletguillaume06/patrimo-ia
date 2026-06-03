import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import {
  emailBienvenue, emailPremierBien, emailSituationFiscale,
  emailValeurGeneree, emailFidelisation
} from '@/lib/emails/onboarding-sequence'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://propilot-ai.vercel.app'
const FROM = 'Patrimo IA <onboarding@resend.dev>'

export async function POST(req: NextRequest) {
  // Vérification token cron
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const service = await createServiceClient()
  const now = new Date()

  // Récupérer les profils avec leur date d'inscription
  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('onboarding_done', true)

  let sent = 0
  const errors: string[] = []

  for (const profile of (profiles ?? [])) {
    try {
      // Récupérer l'email via auth.users
      const { data: { user } } = await service.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      const createdAt = new Date(profile.created_at)
      const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

      const emailData = {
        to: user.email,
        full_name: profile.full_name || 'Propriétaire',
        app_url: APP_URL,
      }

      let emailToSend: { subject: string; html: string } | null = null
      let emailKey = ''

      if (daysSince === 0) { emailToSend = emailBienvenue(emailData); emailKey = 'j0' }
      else if (daysSince === 1) { emailToSend = emailPremierBien(emailData); emailKey = 'j1' }
      else if (daysSince === 3) { emailToSend = emailSituationFiscale(emailData); emailKey = 'j3' }
      else if (daysSince === 7) { emailToSend = emailValeurGeneree(emailData); emailKey = 'j7' }
      else if (daysSince === 14) { emailToSend = emailFidelisation(emailData); emailKey = 'j14' }

      if (!emailToSend) continue

      // Vérifier si cet email a déjà été envoyé
      const { data: alreadySent } = await service
        .from('notifications')
        .select('id')
        .eq('user_id', profile.id)
        .eq('type', `onboarding_${emailKey}`)
        .maybeSingle()

      if (alreadySent) continue

      // Envoyer l'email
      const { error } = await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: emailToSend.subject,
        html: emailToSend.html,
      })

      if (!error) {
        // Marquer comme envoyé
        await service.from('notifications').insert({
          user_id: profile.id,
          type: `onboarding_${emailKey}`,
          title: `Email onboarding J+${emailKey.replace('j', '')}`,
          message: emailToSend.subject,
          read: true,
        })
        sent++
      } else {
        errors.push(`${user.email}: ${error.message}`)
      }
    } catch (err: any) {
      errors.push(`${profile.id}: ${err.message}`)
    }
  }

  return NextResponse.json({ success: true, sent, errors })
}
