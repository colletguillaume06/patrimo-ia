'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/loyers/StatusBadge'
import { RelanceModal } from '@/components/loyers/RelanceModal'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Send, CheckCircle } from 'lucide-react'

export default function LoyersPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [relancePayment, setRelancePayment] = useState<any | null>(null)
  const supabase = createClient()

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases(
          tenant_name, tenant_email, monthly_rent,
          property:properties(name, city)
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
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Suivi des loyers</h1>
        <p className="text-slate-400 text-sm mt-1">Historique et gestion des paiements</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total encaissé', value: formatCurrency(stats.paid), color: 'text-green-400', glow: 'green' as const },
          { label: 'En retard', value: formatCurrency(stats.late), color: 'text-red-400', glow: 'red' as const },
          { label: 'En attente', value: formatCurrency(stats.pending), color: 'text-amber-400', glow: 'amber' as const },
          { label: 'Nb loyers en retard', value: `${payments.filter(p => p.status === 'late').length}`, color: 'text-red-400', glow: 'red' as const },
        ].map(({ label, value, color, glow }) => (
          <GlassCard key={label} glow={glow} className="p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h2 className="font-display font-semibold text-white mb-4">Paiements</h2>
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
                    <span className="text-sm font-medium text-white">{pay.lease?.tenant_name ?? 'N/A'}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{pay.lease?.property?.name ?? 'Bien supprimé'}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Échéance {format(new Date(pay.due_date), 'dd MMM yyyy', { locale: fr })}
                    {pay.paid_date && ` · Payé le ${format(new Date(pay.paid_date), 'dd MMM', { locale: fr })}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-white w-24 text-right">{formatCurrency(pay.amount)}</p>
                <StatusBadge status={pay.status} />
                <div className="flex items-center gap-2">
                  {pay.status !== 'paid' && (
                    <button
                      onClick={() => handleMarkPaid(pay.id)}
                      className="h-8 px-3 rounded-lg bg-green-400/10 hover:bg-green-400/20 border border-green-400/20 text-green-400 text-xs font-medium transition-all flex items-center gap-1"
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
    </div>
  )
}
