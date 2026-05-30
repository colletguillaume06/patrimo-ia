'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { CheckCircle2, ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import Link from 'next/link'

export default function RapprochementPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('payments')
      .select('*, lease:leases(tenant_name, monthly_rent, charges, property:properties(name, city))')
      .gte('due_date', start)
      .lte('due_date', end)
      .order('due_date')
    setPayments(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedMonth])

  const handleMarkPaid = async (paymentId: string) => {
    await supabase.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', paymentId)
    toast.success('Loyer rapproché — marqué comme reçu')
    load()
  }

  const handleMarkPartiel = async (paymentId: string, montantRecu: number, montantAttendu: number) => {
    const solde = montantAttendu - montantRecu
    await supabase.from('payments').update({
      status: 'partial',
      amount: montantRecu,
      note: `Paiement partiel — solde dû : ${solde.toFixed(2)}€`,
    }).eq('id', paymentId)
    toast.success(`Paiement partiel enregistré — solde : ${formatCurrency(solde)}`)
    load()
  }

  const total_attendu = payments.reduce((s, p) => s + ((p.lease?.monthly_rent ?? 0) + (p.lease?.charges ?? 0)), 0)
  const total_recu = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const en_attente = payments.filter(p => p.status === 'pending' || p.status === 'late').length

  const moisLabel = format(selectedMonth, 'MMMM yyyy', { locale: fr })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/loyers" className="text-slate-400 hover:text-[var(--text-primary)] text-sm flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Loyers</Link>
        <span className="text-slate-600">/</span>
        <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">Rapprochement bancaire</h1>
      </div>

      {/* Sélecteur mois */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedMonth(m => subMonths(m, 1))} className="h-9 w-9 rounded-lg bg-bg-secondary border border-white/[0.08] flex items-center justify-center hover:bg-bg-secondary"><ChevronLeft className="h-4 w-4 text-slate-400" /></button>
        <span className="font-display font-semibold text-[var(--text-primary)] capitalize min-w-36 text-center">{moisLabel}</span>
        <button onClick={() => setSelectedMonth(m => subMonths(m, -1))} className="h-9 w-9 rounded-lg bg-bg-secondary border border-white/[0.08] flex items-center justify-center hover:bg-bg-secondary"><ChevronRight className="h-4 w-4 text-slate-400" /></button>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Attendu', value: formatCurrency(total_attendu), color: 'text-[var(--text-primary)]' },
          { label: 'Reçu', value: formatCurrency(total_recu), color: 'text-[var(--success)]' },
          { label: 'Écart', value: formatCurrency(total_attendu - total_recu), color: total_attendu - total_recu === 0 ? 'text-[var(--success)]' : 'text-red-400' },
          { label: 'En attente', value: `${en_attente} loyer${en_attente > 1 ? 's' : ''}`, color: en_attente === 0 ? 'text-[var(--success)]' : 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Tableau de rapprochement */}
      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Rapprochement — {moisLabel}</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Aucun loyer ce mois</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                  {['Bien','Locataire','Attendu','Reçu','Écart','Statut','Action'].map(h =>
                    <th key={h} className="text-left py-2.5 px-3 font-medium">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const attendu = (p.lease?.monthly_rent ?? 0) + (p.lease?.charges ?? 0)
                  const recu = p.status === 'paid' ? p.amount : p.status === 'partial' ? p.amount : 0
                  const ecart = attendu - recu
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 px-3 text-slate-300">{p.lease?.property?.name ?? '—'}</td>
                      <td className="py-3 px-3 text-[var(--text-primary)] font-medium">{p.lease?.tenant_name ?? '—'}</td>
                      <td className="py-3 px-3 text-[var(--text-primary)]">{formatCurrency(attendu)}</td>
                      <td className="py-3 px-3">
                        {p.status === 'paid' ? <span className="text-[var(--success)] font-semibold">{formatCurrency(recu)}</span> :
                         p.status === 'partial' ? <span className="text-amber-400">{formatCurrency(recu)}</span> :
                         <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        {ecart === 0 ? <span className="text-[var(--success)]">0 €</span> : <span className="text-red-400">{formatCurrency(ecart)}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-[var(--success-bg)] text-[var(--success)]' : p.status === 'partial' ? 'bg-amber-400/10 text-amber-400' : 'bg-slate-400/10 text-slate-400'}`}>
                          {p.status === 'paid' ? 'Rapproché' : p.status === 'partial' ? 'Partiel' : p.status === 'late' ? 'En retard' : 'En attente'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {p.status !== 'paid' && (
                          <button onClick={() => handleMarkPaid(p.id)}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[var(--success-bg)] hover:bg-green-400/20 border border-[var(--success)/20] text-[var(--success)] text-xs font-medium transition-all">
                            <Link2 className="h-3 w-3" /> Rapprocher
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={2} className="py-2.5 px-3 text-xs font-semibold text-[var(--text-primary)]">TOTAL</td>
                  <td className="py-2.5 px-3 text-[var(--text-primary)] font-bold">{formatCurrency(total_attendu)}</td>
                  <td className="py-2.5 px-3 text-[var(--success)] font-bold">{formatCurrency(total_recu)}</td>
                  <td className="py-2.5 px-3 font-bold" style={{ color: total_attendu - total_recu === 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(total_attendu - total_recu)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
