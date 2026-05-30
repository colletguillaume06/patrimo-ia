'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/loyers/StatusBadge'
import { RelanceModal } from '@/components/loyers/RelanceModal'
import { RevisionModal } from '@/components/loyers/RevisionModal'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Send, CheckCircle, TrendingUp, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'

export default function LoyersPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [relancePayment, setRelancePayment] = useState<any | null>(null)
  const [revisionLease, setRevisionLease] = useState<any | null>(null)
  const supabase = createClient()

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases(
          id, tenant_name, tenant_email, monthly_rent,
          is_active, indexation_index, last_revision_date,
          property:properties(name, city, indice_revision)
        )
      `)
      .order('due_date', { ascending: false })
      .limit(100)
    setPayments(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadPayments() }, [])

  const handleMarkPaid = async (paymentId: string) => {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
      .eq('id', paymentId)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
    } else {
      toast.success('Paiement marqué comme reçu')
      loadPayments()
    }
  }

  const stats = {
    total: payments.reduce((s, p) => s + p.amount, 0),
    paid: payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    late: payments.filter(p => p.status === 'late').reduce((s, p) => s + p.amount, 0),
    pending: payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Suivi des loyers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Historique et gestion des paiements</p>
        </div>
        <Link href="/loyers/rapprochement"
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ArrowUpDown className="h-4 w-4" /> Rapprochement bancaire
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total encaissé', value: formatCurrency(stats.paid), color: 'text-[var(--success)]', glow: 'green' as const },
          { label: 'En retard', value: formatCurrency(stats.late), color: 'text-red-400', glow: 'red' as const },
          { label: 'En attente', value: formatCurrency(stats.pending), color: 'text-amber-400', glow: 'amber' as const },
          { label: 'Nb loyers en retard', value: `${payments.filter(p => p.status === 'late').length}`, color: 'text-red-400', glow: 'red' as const },
        ].map(({ label, value, color, glow }) => (
          <GlassCard key={label} glow={glow} className="p-4">
            <p className="text-sm font-medium text-[#0F172A] mb-1.5">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Paiements</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Aucun paiement enregistré</p>
        ) : (
          <div className="space-y-2">
            {payments.map(pay => (
              <div
                key={pay.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{pay.lease?.tenant_name ?? 'N/A'}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{pay.lease?.property?.name ?? 'Bien supprimé'}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Échéance {format(new Date(pay.due_date), 'dd MMM yyyy', { locale: fr })}
                    {pay.paid_date && ` · Payé le ${format(new Date(pay.paid_date), 'dd MMM', { locale: fr })}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] w-24 text-right">{formatCurrency(pay.amount)}</p>
                <StatusBadge status={pay.status} />
                <div className="flex items-center gap-2">
                  {pay.status !== 'paid' && (
                    <button
                      onClick={() => handleMarkPaid(pay.id)}
                      className="h-8 px-3 rounded-lg bg-[var(--success-bg)] hover:bg-green-400/20 border border-[var(--success)/20] text-[var(--success)] text-xs font-medium transition-all flex items-center gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Marquer reçu
                    </button>
                  )}
                  {(pay.status === 'late' || pay.status === 'pending') && (
                    <button
                      onClick={() => setRelancePayment(pay)}
                      className="h-8 px-3 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 text-blue-400 text-xs font-medium transition-all flex items-center gap-1"
                    >
                      <Send className="h-3.5 w-3.5" /> Relance
                    </button>
                  )}
                  {pay.lease?.is_active && (
                    <button
                      onClick={() => setRevisionLease(pay.lease)}
                      className="h-8 px-3 rounded-lg bg-[var(--success-bg)] hover:bg-green-400/20 border border-[var(--success)/20] text-[var(--success)] text-xs font-medium transition-all flex items-center gap-1"
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> Réviser IRL
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {relancePayment && (
        <RelanceModal
          payment={relancePayment}
          onClose={() => setRelancePayment(null)}
          onSuccess={loadPayments}
        />
      )}

      {revisionLease && (
        <RevisionModal
          lease={revisionLease}
          onClose={() => setRevisionLease(null)}
          onSuccess={loadPayments}
        />
      )}
    </div>
  )
}
