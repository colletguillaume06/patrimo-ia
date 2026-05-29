import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

interface RelanceContext {
  tenant_name: string
  property_name: string
  amount: number
  due_date: string
  owner_name: string
  relance_count: number
}

export function getRelanceTemplate(ctx: RelanceContext): { subject: string; html: string } {
  const { tenant_name, property_name, amount, due_date, owner_name, relance_count } = ctx
  const amountStr = amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

  if (relance_count === 1) {
    return {
      subject: `Rappel loyer — ${property_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Rappel de loyer</h2>
          <p>Bonjour ${tenant_name},</p>
          <p>Nous vous rappelons que votre loyer de <strong>${amountStr}</strong> pour le logement <strong>${property_name}</strong> était dû le ${due_date}.</p>
          <p>Si vous avez déjà effectué le virement, veuillez ignorer ce message.</p>
          <p>Dans le cas contraire, nous vous remercions de bien vouloir régulariser cette situation dans les meilleurs délais.</p>
          <p>Cordialement,<br>${owner_name}</p>
        </div>
      `,
    }
  }

  if (relance_count === 2) {
    return {
      subject: `2ème relance — Loyer impayé ${property_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Deuxième relance — Loyer impayé</h2>
          <p>Bonjour ${tenant_name},</p>
          <p>Malgré notre premier rappel, nous constatons que le loyer de <strong>${amountStr}</strong> dû le ${due_date} pour <strong>${property_name}</strong> n'a toujours pas été réglé.</p>
          <p>Nous vous demandons de procéder au paiement dans un délai de <strong>48 heures</strong>.</p>
          <p>Sans retour de votre part, nous serons contraints de prendre les mesures nécessaires.</p>
          <p>Cordialement,<br>${owner_name}</p>
        </div>
      `,
    }
  }

  return {
    subject: `MISE EN DEMEURE — Loyer impayé ${property_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #EF4444; padding: 20px;">
        <h2 style="color: #EF4444;">MISE EN DEMEURE</h2>
        <p>Bonjour ${tenant_name},</p>
        <p>Par la présente, nous vous mettons en demeure de régler la somme de <strong>${amountStr}</strong> correspondant au loyer de <strong>${property_name}</strong> dû le ${due_date}.</p>
        <p>Cette somme devra être versée dans un délai de <strong>8 jours</strong> à compter de la réception de ce courrier.</p>
        <p>À défaut de paiement, nous nous réservons le droit d'engager une procédure judiciaire pour recouvrement de la créance et résiliation du bail.</p>
        <p>Cordialement,<br><strong>${owner_name}</strong></p>
      </div>
    `,
  }
}
