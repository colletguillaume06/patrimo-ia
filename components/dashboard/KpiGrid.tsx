import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatPct } from '@/lib/utils'
import { TrendingUp, TrendingDown, Building2, Banknote, PieChart, ArrowUpRight } from 'lucide-react'
import type { DashboardMetrics } from '@/types'

interface KpiGridProps {
  metrics: DashboardMetrics
}

export function KpiGrid({ metrics }: KpiGridProps) {
  const kpis = [
    {
      label: 'Patrimoine total',
      value: formatCurrency(metrics.total_patrimoine, true),
      sub: `${metrics.biens_count} bien${metrics.biens_count > 1 ? 's' : ''}`,
      icon: Building2,
      glow: 'blue' as const,
      trend: 'up' as const,
      trendValue: '+2.4%',
    },
    {
      label: 'Cashflow mensuel',
      value: formatCurrency(metrics.monthly_cashflow),
      sub: 'net après charges',
      icon: TrendingUp,
      glow: metrics.monthly_cashflow >= 0 ? 'green' as const : 'red' as const,
      trend: metrics.monthly_cashflow >= 0 ? 'up' as const : 'down' as const,
      trendValue: metrics.monthly_cashflow >= 0 ? 'positif' : 'négatif',
    },
    {
      label: 'Loyers encaissés',
      value: formatCurrency(metrics.loyers_encaisses),
      sub: `sur ${formatCurrency(metrics.loyers_total)} attendus`,
      icon: Banknote,
      glow: 'amber' as const,
      trend: metrics.loyers_encaisses >= metrics.loyers_total ? 'up' as const : 'down' as const,
      trendValue: metrics.loyers_total > 0 ? `${Math.round(metrics.loyers_encaisses / metrics.loyers_total * 100)}%` : '0%',
    },
    {
      label: 'Rendement moyen',
      value: formatPct(metrics.rendement_moyen),
      sub: 'rendement brut',
      icon: PieChart,
      glow: 'cyan' as const,
      trend: metrics.rendement_moyen >= 4 ? 'up' as const : 'neutral' as const,
      trendValue: metrics.rendement_moyen >= 6 ? 'excellent' : metrics.rendement_moyen >= 4 ? 'bon' : 'faible',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <GlassCard key={kpi.label} hover glow={kpi.glow} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-400 font-medium">{kpi.label}</p>
            <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <kpi.icon className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono tracking-tight mb-1">
            {kpi.value}
          </p>
          <div className="flex items-center gap-2">
            {kpi.trend === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-green-400" />
            ) : kpi.trend === 'down' ? (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            ) : null}
            <span className={`text-xs font-medium ${
              kpi.trend === 'up' ? 'text-green-400' : kpi.trend === 'down' ? 'text-red-400' : 'text-slate-500'
            }`}>
              {kpi.trendValue}
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{kpi.sub}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
