'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/loyers/StatusBadge'
import { RelanceModal } from '@/components/loyers/RelanceModal'
import { RevisionModal } from '@/components/loyers/RevisionModal'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format, startOfYear, endOfYear } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Send, CheckCircle, TrendingUp, ArrowUpDown, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import Link from 'next/link'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const CURRENT_YEAR = new Date().getFullYear()

export default function LoyersPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [activeLeases, setActiveLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [relancePayment, setRelancePayment] = useState<any | null>(null)
  const [revisionLease, setRevisionLease] = useState<any | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const supabase = createClient()

  // Navigation mois
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-based
  const [viewYear] = useState(CURRENT_YEAR)

  const load = async () => {
    const yearStart = `${viewYear}-01-01`
    const yearEnd = `${viewYear}-12-31`

    const [paymentsRes, leasesRes] = await Promise.all([
      supabase
        .from('payments')
        .select(`*, lease:leases(id, tenant_name, tenant_email, monthly_rent, is_active, indexation_index, last_revision_date, property:properties(name, city, indice_revision))`)
        .gte('due_date', yearStart)
        .lte('due_date', yearEnd)
        .order('due_date', { ascending: false }),
      supabase
        .from('leases')
        .select('id, tenant_name, monthly_rent, charges, is_active, start_date, end_date, property:properties(name)')
        .or(`is_active.eq.true,end_date.gte.${yearStart}`),
    ])
    setPayments(paymentsRes.data ?? [])
    setActiveLeases(leasesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Mois affiché ─────────────────────────────────────────
  const moisStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const paiementsMois = payments.filter(p => p.due_date?.startsWith(moisStr))

  // Baux affichés pour le mois : baux actifs + baux clos (bien vendu, bail terminé) couvrant ce mois
  // ou ayant un paiement ce mois-là, pour que l'historique des mois passés reste complet.
  const debutMois = `${moisStr}-01`
  const finMois = `${moisStr}-31`
  const leasesDuMois = activeLeases.filter(l =>
    l.is_active ||
    paiementsMois.some(p => p.lease_id === l.id || p.lease?.id === l.id) ||
    (!!l.end_date && (!l.start_date || l.start_date <= finMois) && l.end_date >= debutMois)
  )

  const totalAttenduMois = leasesDuMois.reduce((s, l) => s + (l.monthly_rent ?? 0) + (l.charges ?? 0), 0)
  const totalEncaisseMois = paiementsMois.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalRestantMois = Math.max(0, totalAttenduMois - totalEncaisseMois)
  const pctEncaisse = totalAttenduMois > 0 ? Math.round((totalEncaisseMois / totalAttenduMois) * 100) : 0

  // ── Statistiques année ────────────────────────────────────
  const stats = {
    paid: payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    late: payments.filter(p => p.status === 'late').reduce((s, p) => s + p.amount, 0),
    pending: payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
    nbLate: payments.filter(p => p.status === 'late').length,
  }

  // ── Marquer payé (ou créer l'entrée si elle n'existe pas) ──
  const handleMarkPaid = async (leaseId: string, amount: number, existingPaymentId?: string) => {
    setMarkingId(leaseId)
    if (existingPaymentId) {
      const { error } = await supabase.from('payments').update({
        status: 'paid', paid_date: new Date().toISOString().split('T')[0],
      }).eq('id', existingPaymentId)
      if (error) toast.error('Erreur : ' + error.message)
      else toast.success('Paiement enregistré ✓')
    } else {
      // Créer l'entrée pour ce mois
      const { error } = await supabase.from('payments').insert({
        lease_id: leaseId,
        due_date: `${moisStr}-01`,
        amount,
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
      })
      if (error) toast.error('Erreur : ' + error.message)
      else toast.success('Paiement enregistré ✓')
    }
    setMarkingId(null)
    load()
  }

  const handleMarkUnpaid = async (paymentId: string) => {
    const { error } = await supabase.from('payments').update({ status: 'pending', paid_date: null }).eq('id', paymentId)
    if (error) { toast.error('Erreur : ' + error.message); return }
    toast.success('Paiement annulé — remis en attente')
    load()
  }

  const handleMarkLate = async (leaseId: string, amount: number, existingPaymentId?: string) => {
    setMarkingId(leaseId)
    if (existingPaymentId) {
      await supabase.from('payments').update({ status: 'late' }).eq('id', existingPaymentId)
    } else {
      await supabase.from('payments').insert({ lease_id: leaseId, due_date: `${moisStr}-01`, amount, status: 'late' })
    }
    setMarkingId(null)
    load()
  }

  // ── Paiements du mois affichés dans la liste historique ──
  const paymentsDisplayed = payments.filter(p => p.due_date?.startsWith(moisStr))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Suivi des loyers {viewYear}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Gestion des paiements mois par mois</p>
        </div>
        <Link href="/loyers/rapprochement"
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ArrowUpDown className="h-4 w-4" /> Rapprochement bancaire
        </Link>
      </div>

      {/* Sélecteur de mois */}
      <div className="flex items-center gap-2">
        <button onClick={() => setViewMonth(m => Math.max(0, m - 1))} disabled={viewMonth === 0}
          className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <ChevronLeft className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        {MONTHS_FR.map((m, i) => (
          <button key={i} onClick={() => setViewMonth(i)}
            className="h-8 px-3 rounded-lg text-xs font-medium transition-all"
            style={viewMonth === i
              ? { background: '#1D4ED8', color: '#fff' }
              : { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {m.slice(0, 3)}
          </button>
        ))}
        <button onClick={() => setViewMonth(m => Math.min(11, m + 1))} disabled={viewMonth === 11}
          className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Récapitulatif du mois sélectionné */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Loyers {MONTHS_FR[viewMonth]} {viewYear}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Total à encaisser ce mois</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalAttenduMois)}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{leasesDuMois.length} bail{leasesDuMois.length > 1 ? 'x' : ''} ce mois</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Encaissé : <strong style={{ color: '#059669' }}>{formatCurrency(totalEncaisseMois)}</strong></span>
            <span>Restant : <strong style={{ color: totalRestantMois > 0 ? '#F59E0B' : '#059669' }}>{formatCurrency(totalRestantMois)}</strong></span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-2.5 rounded-full transition-all"
              style={{ width: `${pctEncaisse}%`, background: pctEncaisse === 100 ? '#059669' : pctEncaisse > 50 ? '#1D4ED8' : '#F59E0B' }} />
          </div>
          <p className="text-xs mt-1 text-right font-semibold" style={{ color: pctEncaisse === 100 ? '#059669' : 'var(--text-tertiary)' }}>
            {pctEncaisse}% encaissé
          </p>
        </div>

        {/* Liste des baux actifs avec boutons d'action par locataire */}
        <div className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          {leasesDuMois.map(l => {
            const payMois = paiementsMois.find(p => p.lease_id === l.id || p.lease?.id === l.id)
            const statut = payMois?.status ?? 'pending'
            const montant = (l.monthly_rent ?? 0) + (l.charges ?? 0)
            const isMarking = markingId === l.id
            return (
              <div key={l.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all"
                style={{ background: statut === 'paid' ? 'rgba(5,150,105,0.06)' : statut === 'late' ? 'rgba(220,38,38,0.06)' : 'var(--bg-secondary)', border: `1px solid ${statut === 'paid' ? 'rgba(5,150,105,0.2)' : statut === 'late' ? 'rgba(220,38,38,0.2)' : 'var(--border)'}` }}>
                {/* Indicateur statut */}
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ background: statut === 'paid' ? '#059669' : statut === 'late' ? '#DC2626' : '#F59E0B' }} />

                {/* Identité */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{l.tenant_name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{(l.property as any)?.name}</span>
                </div>

                {/* Montant */}
                <span className="text-sm font-semibold font-mono w-20 text-right"
                  style={{ color: statut === 'paid' ? '#059669' : statut === 'late' ? '#DC2626' : '#F59E0B' }}>
                  {formatCurrency(montant)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {statut === 'paid' ? (
                    <>
                      <button
                        onClick={() => {
                          if (confirm(`Annuler le paiement reçu de ${l.tenant_name} ? Il repassera « en attente ».`)) handleMarkUnpaid(payMois.id)
                        }}
                        className="group flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                        title="Cliquer pour annuler (paiement non reçu)">
                        <Check className="h-3 w-3 group-hover:hidden" />
                        <X className="h-3 w-3 hidden group-hover:block" />
                        <span className="group-hover:hidden">Reçu</span>
                        <span className="hidden group-hover:inline">Annuler</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button disabled={isMarking}
                        onClick={() => handleMarkPaid(l.id, montant, payMois?.id)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all"
                        style={{ background: '#059669' }}>
                        <CheckCircle className="h-3.5 w-3.5" />
                        {isMarking ? '…' : 'Reçu'}
                      </button>
                      <button disabled={isMarking}
                        onClick={() => handleMarkLate(l.id, montant, payMois?.id)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all border"
                        style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FEF2F2' }}>
                        Retard
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* KPIs année */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: `Total encaissé ${viewYear}`, value: formatCurrency(stats.paid), color: 'text-[var(--success)]', glow: 'green' as const },
          { label: 'En retard', value: formatCurrency(stats.late), color: 'text-red-400', glow: 'red' as const },
          { label: 'En attente', value: formatCurrency(stats.pending), color: 'text-amber-400', glow: 'amber' as const },
          { label: 'Loyers en retard', value: `${stats.nbLate}`, color: 'text-red-400', glow: 'red' as const },
        ].map(({ label, value, color, glow }) => (
          <GlassCard key={label} glow={glow} className="p-4">
            <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Historique des paiements du mois */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Historique — {MONTHS_FR[viewMonth]} {viewYear}
        </h2>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }} />)}</div>
        ) : paymentsDisplayed.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            Aucun paiement enregistré pour {MONTHS_FR[viewMonth]} — utilisez les boutons ci-dessus pour saisir les encaissements
          </p>
        ) : (
          <div className="space-y-2">
            {paymentsDisplayed.map(pay => (
              <div key={pay.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pay.lease?.tenant_name ?? 'N/A'}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>· {pay.lease?.property?.name ?? '—'}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Échéance {format(new Date(pay.due_date), 'dd MMM yyyy', { locale: fr })}
                    {pay.paid_date && ` · Reçu le ${format(new Date(pay.paid_date), 'dd MMM', { locale: fr })}`}
                  </p>
                </div>
                <p className="text-sm font-semibold font-mono w-24 text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pay.amount)}</p>
                <StatusBadge status={pay.status} />
                <div className="flex items-center gap-2">
                  {pay.status !== 'paid' && (
                    <button onClick={() => handleMarkPaid(pay.lease_id, pay.amount, pay.id)}
                      className="h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                      style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <CheckCircle className="h-3.5 w-3.5" /> Marquer reçu
                    </button>
                  )}
                  {(pay.status === 'late' || pay.status === 'pending') && (
                    <button onClick={() => setRelancePayment(pay)}
                      className="h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                      style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8', border: '1px solid rgba(29,78,216,0.2)' }}>
                      <Send className="h-3.5 w-3.5" /> Relance
                    </button>
                  )}
                  {pay.lease?.is_active && (
                    <button onClick={() => setRevisionLease(pay.lease)}
                      className="h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                      style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <TrendingUp className="h-3.5 w-3.5" /> Réviser IRL
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {relancePayment && <RelanceModal payment={relancePayment} onClose={() => setRelancePayment(null)} onSuccess={load} />}
      {revisionLease && <RevisionModal lease={revisionLease} onClose={() => setRevisionLease(null)} onSuccess={load} />}
    </div>
  )
}
