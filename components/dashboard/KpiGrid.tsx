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
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#1B4FD8]',
      glow: 'blue' as const,
      trend: 'up' as const,
      trendValue: '+2.4%',
      trendColor: 'text-[#0E7A4F]',
    },
    {
      label: 'Cashflow mensuel',
      value: formatCurrency(metrics.monthly_cashflow),
      sub: 'net après charges',
      icon: TrendingUp,
      iconBg: metrics.monthly_cashflow >= 0 ? 'bg-[var(--success-bg)]' : 'bg-red-50',
      iconColor: metrics.monthly_cashflow >= 0 ? 'text-[#0E7A4F]' : 'text-[#B91C1C]',
      glow: metrics.monthly_cashflow >= 0 ? 'green' as const : 'red' as const,
      trend: metrics.monthly_cashflow >= 0 ? 'up' as const : 'down' as const,
      trendValue: metrics.monthly_cashflow >= 0 ? 'positif' : 'négatif',
      trendColor: metrics.monthly_cashflow >= 0 ? 'text-[#0E7A4F]' : 'text-[#B91C1C]',
    },
    {
      label: 'Loyers encaissés',
      value: formatCurrency(metrics.loyers_encaisses),
      sub: `sur ${formatCurrency(metrics.loyers_total)} attendus`,
      icon: Banknote,
      iconBg: 'bg-amber-50',
      iconColor: 'text-[#C27820]',
      glow: 'amber' as const,
      trend: metrics.loyers_encaisses >= metrics.loyers_total ? 'up' as const : 'down' as const,
      trendValue: metrics.loyers_total > 0 ? `${Math.round(metrics.loyers_encaisses / metrics.loyers_total * 100)}%` : '0%',
      trendColor: metrics.loyers_encaisses >= metrics.loyers_total ? 'text-[#0E7A4F]' : 'text-[#B91C1C]',
    },
    {
      label: 'Rendement moyen',
      value: formatPct(metrics.rendement_moyen),
      sub: 'rendement brut',
      icon: PieChart,
      iconBg: 'bg-cyan-50',
      iconColor: 'text-[#0891B2]',
      glow: 'cyan' as const,
      trend: metrics.rendement_moyen >= 4 ? 'up' as const : 'neutral' as const,
      trendValue: metrics.rendement_moyen >= 6 ? 'excellent' : metrics.rendement_moyen >= 4 ? 'bon' : 'faible',
      trendColor: metrics.rendement_moyen >= 4 ? 'text-[#0E7A4F]' : 'text-[#3D3A36]',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <GlassCard key={kpi.label} hover glow={kpi.glow} className="p-5 pt-6">
          <div className="flex items-start justify-between mb-3">
            {/* Label en uppercase petit */}
            <p className="text-[12px] font-medium text-[#3D3A36] uppercase tracking-wide">
              {kpi.label}
            </p>
            <div className={`h-8 w-8 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
              <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
            </div>
          </div>

          {/* Valeur principale — DM Mono obligatoire */}
          <p className="text-[26px] font-semibold text-[#0A0908] tracking-tight mb-2"
             style={{ fontFamily: 'var(--font-dm-mono)' }}>
            {kpi.value}
          </p>

          <div className="flex items-center gap-1.5">
            {kpi.trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-[#0E7A4F]" />}
            {kpi.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-[#B91C1C]" />}
            <span className={`text-[13px] font-medium ${kpi.trendColor}`}>
              {kpi.trendValue}
            </span>
            <span className="text-[12px] text-[#6B6560]">·</span>
            <span className="text-[12px] text-[#3D3A36]">{kpi.sub}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
