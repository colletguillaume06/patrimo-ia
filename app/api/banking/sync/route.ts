import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTransactions, matchTransaction, type BankTransaction, type LouerAttendu } from '@/lib/nordigen/client'
import { format, subMonths } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await createServiceClient()

  // Récupérer la connexion bancaire active
  const { data: connection } = await service
    .from('banking_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!connection?.account_id) {
    return NextResponse.json({ error: 'Aucune connexion bancaire active' }, { status: 400 })
  }

  try {
    // Récupérer les transactions des 3 derniers mois
    const dateFrom = format(subMonths(new Date(), 3), 'yyyy-MM-dd')
    const { transactions } = await getTransactions(connection.account_id, dateFrom)
    const bookedTx: BankTransaction[] = transactions?.booked ?? []

    // Récupérer les loyers en attente de paiement
    // Récupérer les loyers via les propriétés de l'utilisateur
    const { data: userProps } = await service
      .from('properties')
      .select('id')
      .eq('user_id', user.id)
    const propIds = (userProps ?? []).map((p: any) => p.id)

    const { data: payments } = await (service as any)
      .from('payments')
      .select('id, amount, due_date, lease:leases(tenant_name)')
      .in('status', ['pending', 'late'])
      .gte('due_date', dateFrom)

    const loyers: LouerAttendu[] = (payments ?? []).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      due_date: p.due_date,
      tenant_name: p.lease?.tenant_name ?? '',
      lease_id: p.id,
    }))

    let matched = 0
    let created = 0

    for (const tx of bookedTx) {
      const amount = parseFloat(tx.transactionAmount.amount)
      if (amount <= 0) continue // On ignore les débits

      // Vérifier si déjà en base
      const { data: existing } = await service
        .from('banking_transactions')
        .select('id')
        .eq('transaction_id', tx.transactionId)
        .single()

      if (!existing) {
        // Essayer de matcher avec un loyer
        const match = matchTransaction(tx, loyers)

        const { data: newTx } = await service.from('banking_transactions').insert({
          connection_id: connection.id,
          user_id: user.id,
          transaction_id: tx.transactionId,
          amount,
          currency: tx.transactionAmount.currency,
          date: tx.bookingDate,
          description: tx.remittanceInformationUnstructured ?? null,
          debtor_name: tx.debtorName ?? null,
          creditor_name: tx.creditorName ?? null,
          matched_payment_id: match ? match.loyer.id : null,
          match_status: match ? 'matched' : 'unmatched',
        }).select().single()

        created++

        // Si match fiable (score > 70) → marquer le loyer comme payé
        if (match && match.score >= 70 && newTx) {
          await service.from('payments').update({
            status: 'paid',
            paid_date: tx.bookingDate,
            note: `Rapproché automatiquement (score: ${match.score}/100) — transaction bancaire ${tx.transactionId}`,
          }).eq('id', match.loyer.id)
          matched++
        }
      }
    }

    // Mettre à jour la date de sync
    await service.from('banking_connections').update({
      last_sync_at: new Date().toISOString(),
    }).eq('id', connection.id)

    return NextResponse.json({
      success: true,
      transactions_importees: created,
      loyers_rapproches: matched,
      message: `${created} transactions importées, ${matched} loyers rapprochés automatiquement`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
