import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency, monthsUntil } from '@/lib/utils'
import { calculateRevisionILC, calculateRevisionILAT } from '@/lib/fiscal/indices'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Property, Lease } from '@/types'

interface ProfileCommerceProps {
  property: Property & {
    active_lease: Lease | null
    gross_yield: number | null
  }
}

export function ProfileCommerce({ property: p }: ProfileCommerceProps) {
  const lease = p.active_lease
  const loyer_ht = lease?.monthly_rent ?? 0
  const startDate = lease?.start_date ? new Date(lease.start_date) : null
  const endDate = lease?.end_date ? new Date(lease.end_date) : null

  const monthsToEnd = endDate ? monthsUntil(endDate.toISOString()) : null
  const isPreavisAlert = monthsToEnd !== null && monthsToEnd <= 6

  const newRent = lease?.monthly_rent
    ? p.indice_revision === 'ilc'
      ? calculateRevisionILC(lease.monthly_rent, 128)
      : calculateRevisionILAT(lease.monthly_rent, 136)
    : null

  const startYear = startDate?.getFullYear()
  const now = new Date()
  const yearsSinceStart = startDate ? (now.getFullYear() - startDate.getFullYear()) : 0
  const nextRevision = startDate ? new Date(startDate.setFullYear(startDate.getFullYear() + Math.ceil(yearsSinceStart / 3) * 3)) : null

  const checklistItems = [
    { label: 'Dépôt de garantie versé', done: (lease?.deposit ?? 0) > 0 },
    { label: 'Assurance locataire vérifiée', done: false },
    { label: 'Révision triennale planifiée', done: nextRevision !== null },
    { label: 'TVA sur loyers configurée', done: false },
    { label: 'Préavis 6 mois surveillé', done: !isPreavisAlert },
  ]

  return (
    <div className="space-y-6">
      <GlassCard glow="cyan" className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <ProfileBadge type="commerce" />
            <h2 className="font-display font-bold text-2xl text-white mt-2">{p.name}</h2>
            <p className="text-slate-400 text-sm">{p.address}, {p.city}</p>
            {p.bail_type && <p className="text-xs text-slate-500 mt-0.5">Bail {p.bail_type}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Loyer HT mensuel', value: formatCurrency(loyer_ht), color: 'text-white' },
            { label: 'Révision dans', value: monthsToEnd !== null ? `${monthsToEnd} mois` : '—', color: isPreavisAlert ? 'text-red-400' : 'text-amber-400' },
            { label: 'Nouveau loyer estimé', value: newRent ? formatCurrency(newRent) : '—', color: 'text-green-400' },
            { label: 'Indice révision', value: (p.indice_revision ?? 'ILC').toUpperCase(), color: 'text-cyan-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Timeline 3-6-9 */}
      {startDate && (
        <GlassCard>
          <h3 className="font-display font-semibold text-white mb-4">Timeline bail 3-6-9</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.08]" />
            {[3, 6, 9].map(year => {
              const date = new Date(lease!.start_date)
              date.setFullYear(date.getFullYear() + year)
              const isPast = date < now
              const isNear = !isPast && monthsUntil(date.toISOString()) <= 6
              return (
                <div key={year} className="flex items-center gap-4 mb-4 pl-10 relative">
                  <div className={`absolute left-2.5 h-3 w-3 rounded-full border-2 ${isPast ? 'bg-green-400 border-green-400' : isNear ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-slate-600'}`} />
                  <div>
                    <p className="text-sm font-medium text-white">Fin période {year} ans</p>
                    <p className="text-xs text-slate-500">{date.toLocaleDateString('fr-FR')} · {isPast ? 'Passé' : `Dans ${monthsUntil(date.toISOString())} mois`}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {isPreavisAlert && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-400/5 border border-red-400/20">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">
            Le bail expire dans {monthsToEnd} mois. Le préavis de 6 mois est nécessaire pour ne pas le reconduire tacitement.
          </p>
        </div>
      )}

      {/* Checklist */}
      <GlassCard>
        <h3 className="font-display font-semibold text-white mb-4">Obligations bail commercial</h3>
        <div className="space-y-2">
          {checklistItems.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-3 p-2.5 rounded-lg">
              <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${done ? 'text-green-400' : 'text-slate-700'}`} />
              <span className={`text-sm ${done ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
