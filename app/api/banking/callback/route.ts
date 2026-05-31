import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRequisition, getAccountDetails } from '@/lib/nordigen/client'

// L'utilisateur revient ici après avoir authentifié sa banque sur Nordigen
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requisition_id = searchParams.get('ref')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/rapprochement?error=bank_auth_failed`)
  }
  if (!requisition_id) {
    return NextResponse.redirect(`${baseUrl}/rapprochement?error=missing_ref`)
  }

  try {
    const service = await createServiceClient()

    // Trouver la connexion par requisition_id
    const { data: connection } = await service
      .from('banking_connections')
      .select('*')
      .eq('requisition_id', requisition_id)
      .single()

    if (!connection) {
      return NextResponse.redirect(`${baseUrl}/rapprochement?error=connection_not_found`)
    }

    // Récupérer les comptes liés
    const requisition = await getRequisition(requisition_id)
    const accounts = requisition.accounts ?? []

    if (accounts.length === 0) {
      await service.from('banking_connections').update({ status: 'error' }).eq('id', connection.id)
      return NextResponse.redirect(`${baseUrl}/rapprochement?error=no_accounts`)
    }

    // Prendre le premier compte (on peut en prendre plusieurs plus tard)
    const accountId = accounts[0]
    const details = await getAccountDetails(accountId).catch(() => null)
    const iban = details?.account?.iban ?? null
    const name = details?.account?.ownerName ?? null

    // Mettre à jour la connexion
    await service.from('banking_connections').update({
      account_id: accountId,
      iban,
      institution_name: name ?? connection.institution_id,
      status: 'active',
    }).eq('id', connection.id)

    return NextResponse.redirect(`${baseUrl}/rapprochement?connected=1`)
  } catch (err: any) {
    console.error('Banking callback error:', err)
    return NextResponse.redirect(`${baseUrl}/rapprochement?error=callback_failed`)
  }
}
