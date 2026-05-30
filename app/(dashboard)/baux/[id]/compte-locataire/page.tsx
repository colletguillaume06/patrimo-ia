'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, Download, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function CompteLocatairePage() {
  const { id } = useParams<{ id: string }>()
  const [lease, setLease] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [lRes, pRes] = await Promise.all([
        supabase.from('leases').select('*, property:properties(name, address, city)').eq('id', id).single(),
        supabase.from('payments').select('*').eq('lease_id', id).order('due_date'),
      ])
      setLease(lRes.data)
      setPayments(pRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  const total_attendu = payments.reduce((s, p) => s + (lease?.monthly_rent + (lease?.charges ?? 0) || p.amount), 0)
  const total_recu = payments.filter(p => p.status === 'paid' || p.status === 'partial').reduce((s, p) => s + p.amount, 0)
  const solde_global = total_attendu - total_recu

  let cumul = 0
  const rows = payments.map(p => {
    const attendu = lease ? (lease.monthly_rent + (lease.charges ?? 0)) : p.amount
    const recu = p.status === 'paid' ? p.amount : p.status === 'partial' ? p.amount : 0
    const ecart = attendu - recu
    cumul += ecart
    return { ...p, attendu, recu, ecart, cumul }
  })

  const exportTxt = () => {
    const today = format(new Date(), 'dd/MM/yyyy')
    let txt = `RELEVÉ DE COMPTE LOCATAIRE\n`
    txt += `===============================\n\n`
    txt += `Locataire : ${lease?.tenant_name}\n`
    txt += `Bien : ${lease?.property?.name ?? lease?.property?.address}\n`
    txt += `Bail du : ${lease?.start_date ? format(new Date(lease.start_date), 'dd/MM/yyyy') : ''}\n`
    txt += `Établi le : ${today}\n\n`
    txt += `Mois         | Attendu    | Reçu       | Écart      | Cumul      | Statut\n`
    txt += `${'─'.repeat(85)}\n`
    rows.forEach(r => {
      const mois = format(new Date(r.due_date), 'MM/yyyy').padEnd(12)
      const attendu = formatCurrency(r.attendu).padStart(10)
      const recu = formatCurrency(r.recu).padStart(10)
      const ecart = formatCurrency(r.ecart).padStart(10)
      const cumul = formatCurrency(r.cumul).padStart(10)
      const statut = r.status === 'paid' ? 'Payé' : r.status === 'partial' ? 'Partiel' : r.status === 'late' ? 'En retard' : 'En attente'
      txt += `${mois} | ${attendu} | ${recu} | ${ecart} | ${cumul} | ${statut}\n`
    })
    txt += `${'─'.repeat(85)}\n`
    txt += `TOTAUX       | ${formatCurrency(total_attendu).padStart(10)} | ${formatCurrency(total_recu).padStart(10)} | ${formatCurrency(solde_global).padStart(10)}\n\n`
    txt += `Solde dû : ${formatCurrency(solde_global)}\n`
    txt += `\nDocument établi par Propilot AI — ${today}\n`

    const blob = new Blob([txt], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `releve-compte-${lease?.tenant_name?.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="max-w-4xl mx-auto"><div className="h-48 rounded-xl bg-white/[0.03] animate-pulse" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/baux/${id}`} className="text-slate-400 hover:text-[#0A0908] text-sm flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> {lease?.tenant_name}
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="font-display font-bold text-xl text-[#0A0908]">Relevé de compte</h1>
        </div>
        <button onClick={exportTxt} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-[#0A0908] text-sm transition-all">
          <Download className="h-4 w-4" /> Exporter
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total attendu', value: formatCurrency(total_attendu), color: 'text-[#0A0908]' },
          { label: 'Total reçu', value: formatCurrency(total_recu), color: 'text-green-400' },
          { label: 'Solde global', value: formatCurrency(solde_global), color: solde_global <= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Tableau complet */}
      <GlassCard>
        <h2 className="font-display font-semibold text-[#0A0908] mb-4">
          Historique complet — {lease?.tenant_name}
          <span className="text-slate-500 font-normal text-sm ml-2">
            {lease?.property?.name ?? lease?.property?.address}
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                {['Mois','Attendu','Reçu','Écart','Cumul','Statut'].map(h =>
                  <th key={h} className="text-right py-2.5 px-3 font-medium first:text-left">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const StatusIcon = r.status === 'paid' ? CheckCircle2 : r.status === 'late' ? AlertCircle : Clock
                const iconColor = r.status === 'paid' ? 'text-green-400' : r.status === 'late' ? 'text-red-400' : 'text-slate-500'
                return (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] text-right">
                    <td className="py-2.5 px-3 text-left text-slate-300 whitespace-nowrap">
                      {format(new Date(r.due_date), 'MMMM yyyy', { locale: fr })}
                    </td>
                    <td className="py-2.5 px-3 text-[#0A0908]">{formatCurrency(r.attendu)}</td>
                    <td className="py-2.5 px-3">
                      {r.recu > 0
                        ? <span className={r.status === 'partial' ? 'text-amber-400' : 'text-green-400'}>{formatCurrency(r.recu)}</span>
                        : <span className="text-slate-600">—</span>
                      }
                    </td>
                    <td className="py-2.5 px-3">
                      {r.ecart === 0
                        ? <span className="text-green-400">0 €</span>
                        : <span className="text-red-400">-{formatCurrency(r.ecart)}</span>
                      }
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={r.cumul <= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {formatCurrency(r.cumul)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center justify-end gap-1">
                        <StatusIcon className={`h-3.5 w-3.5 ${iconColor}`} />
                        <span className={`text-xs ${iconColor}`}>
                          {r.status === 'paid' ? 'Payé' : r.status === 'partial' ? 'Partiel' : r.status === 'late' ? 'En retard' : 'En attente'}
                        </span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/[0.12] bg-white/[0.02] text-right">
                <td className="py-3 px-3 text-left font-bold text-[#0A0908]">TOTAL</td>
                <td className="py-3 px-3 font-bold text-[#0A0908]">{formatCurrency(total_attendu)}</td>
                <td className="py-3 px-3 font-bold text-green-400">{formatCurrency(total_recu)}</td>
                <td className="py-3 px-3 font-bold" style={{ color: solde_global <= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(solde_global)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        {solde_global > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-400/5 border border-red-400/20">
            <p className="text-xs text-red-400 font-medium">
              ⚠️ Solde impayé de {formatCurrency(solde_global)} — à mentionner dans toute procédure de recouvrement
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
