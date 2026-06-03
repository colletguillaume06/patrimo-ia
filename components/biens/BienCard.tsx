import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { MapPin, ArrowRight, Moon, TrendingUp } from 'lucide-react'
import type { PropertyWithMetrics } from '@/types'
import { CompletudeScore } from './CompletudeScore'

interface BienCardProps {
  bien: PropertyWithMetrics & {
    airbnb_nuits_ytd?: number
    airbnb_monthly_avg?: number
  }
}

export function BienCard({ bien }: BienCardProps) {
  const isAirbnb = bien.type === 'airbnb'
  const year = new Date().getFullYear()
  const monthsElapsed = new Date().getMonth() // 0-indexed

  // ── Métriques adaptées selon le type ──
  const kpis = isAirbnb ? [
    {
      label: `Revenus ${year} (réels)`,
      value: bien.total_revenue_ytd > 0 ? formatCurrency(bien.total_revenue_ytd) : '—',
      color: bien.total_revenue_ytd > 0 ? 'var(--success-text, #166534)' : 'var(--text-primary)',
      sub: bien.airbnb_nuits_ytd ? `${bien.airbnb_nuits_ytd} nuits` : undefined,
    },
    {
      label: 'Rendement brut',
      value: bien.gross_yield !== null ? formatPct(bien.gross_yield) : '—',
      color: bien.gross_yield ? 'var(--success-text, #166634)' : 'var(--text-primary)',
      sub: bien.gross_yield ? 'sur prix achat' : undefined,
    },
    {
      label: 'Cashflow net / mois',
      value: bien.monthly_cashflow !== null ? formatCurrency(bien.monthly_cashflow) : '—',
      color: (bien.monthly_cashflow ?? 0) >= 0 ? 'var(--success-text, #166634)' : '#EF4444',
      sub: bien.airbnb_monthly_avg && bien.airbnb_monthly_avg > 0
        ? `moy. ${formatCurrency(bien.airbnb_monthly_avg)}/mois`
        : 'charges uniquement',
    },
    {
      label: 'Surface',
      value: bien.surface_m2 ? `${bien.surface_m2} m²` : '—',
      color: 'var(--text-primary)',
    },
  ] : [
    {
      label: 'Loyer mensuel',
      value: bien.active_lease ? formatCurrency(bien.active_lease.monthly_rent) : '—',
      color: 'var(--text-primary)',
      sub: bien.active_lease ? `+ ${bien.active_lease.charges ?? 0}€ charges` : undefined,
    },
    {
      label: 'Rendement brut',
      value: bien.gross_yield !== null ? formatPct(bien.gross_yield) : '—',
      color: bien.gross_yield ? 'var(--success-text, #166634)' : 'var(--text-primary)',
    },
    {
      label: 'Cashflow net / mois',
      value: bien.monthly_cashflow !== null ? formatCurrency(bien.monthly_cashflow) : '—',
      color: (bien.monthly_cashflow ?? 0) >= 0 ? 'var(--success-text, #166634)' : '#EF4444',
    },
    {
      label: 'Surface',
      value: bien.surface_m2 ? `${bien.surface_m2} m²` : '—',
      color: 'var(--text-primary)',
    },
  ]

  return (
    <GlassCard hover className="group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <ProfileBadge type={bien.type} size="sm" />
            {isAirbnb && bien.airbnb_nuits_ytd !== undefined && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: (bien.airbnb_nuits_ytd ?? 0) > 100 ? '#FEF3DC' : '#F0FDF4',
                  color: (bien.airbnb_nuits_ytd ?? 0) > 100 ? '#92400E' : '#166534',
                }}>
                <Moon className="h-3 w-3" />
                {bien.airbnb_nuits_ytd}/{(bien as any).airbnb_max_nights ?? 120} nuits
              </span>
            )}
          </div>
          <h3 className="font-display font-semibold text-base truncate" style={{ color: 'var(--text-primary)' }}>
            {bien.name}
          </h3>
          {bien.city && (
            <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              <MapPin className="h-3 w-3" />
              {bien.city} {bien.postal_code && `(${bien.postal_code})`}
            </p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-xl p-3"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
              {kpi.label}
            </p>
            <p className="text-sm font-bold font-mono" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            {kpi.sub && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{kpi.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Revenus YTD — barre de progression Airbnb */}
      {isAirbnb && bien.purchase_price && bien.total_revenue_ytd > 0 && (
        <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span style={{ color: 'var(--text-secondary)' }}>Revenus YTD vs objectif annuel</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(bien.total_revenue_ytd)}
            </span>
          </div>
          {bien.airbnb_monthly_avg && bien.airbnb_monthly_avg > 0 && (
            <>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (monthsElapsed / 12) * 100)}%`,
                    background: '#166534',
                  }} />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Projection annuelle : {formatCurrency(bien.airbnb_monthly_avg * 12)}
              </p>
            </>
          )}
        </div>
      )}

      {/* Score complétude */}
      <div className="px-1 pb-1">
        <CompletudeScore property={bien} />
      </div>

      <Link
        href={`/biens/${bien.id}`}
        className="flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-medium transition-all"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        Voir le détail <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </GlassCard>
  )
}
