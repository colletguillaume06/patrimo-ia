import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { MapPin, TrendingUp, ArrowRight } from 'lucide-react'
import type { PropertyWithMetrics } from '@/types'

interface BienCardProps {
  bien: PropertyWithMetrics
}

export function BienCard({ bien }: BienCardProps) {
  return (
    <GlassCard hover className="group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ProfileBadge type={bien.type} size="sm" />
          </div>
          <h3 className="font-display font-semibold text-[var(--text-primary)] text-base truncate">{bien.name}</h3>
          {bien.city && (
            <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="h-3 w-3" />
              {bien.city} {bien.postal_code && `(${bien.postal_code})`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-xs text-slate-500 mb-0.5">Loyer mensuel</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {bien.active_lease ? formatCurrency(bien.active_lease.monthly_rent) : '—'}
          </p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-xs text-slate-500 mb-0.5">Rendement brut</p>
          <p className="text-sm font-semibold text-[var(--success)]">
            {bien.gross_yield !== null ? formatPct(bien.gross_yield) : '—'}
          </p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-xs text-slate-500 mb-0.5">Cashflow net</p>
          <p className={`text-sm font-semibold ${(bien.monthly_cashflow ?? 0) >= 0 ? 'text-[var(--success)]' : 'text-red-400'}`}>
            {bien.monthly_cashflow !== null ? formatCurrency(bien.monthly_cashflow) : '—'}
          </p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-xs text-slate-500 mb-0.5">Surface</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {bien.surface_m2 ? `${bien.surface_m2} m²` : '—'}
          </p>
        </div>
      </div>

      <Link
        href={`/biens/${bien.id}`}
        className="flex items-center justify-center gap-2 h-9 rounded-lg bg-white/[0.04] hover:bg-blue-500/10 border border-white/[0.08] hover:border-blue-500/20 text-sm text-slate-400 hover:text-blue-400 transition-all"
      >
        Voir le détail <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </GlassCard>
  )
}
