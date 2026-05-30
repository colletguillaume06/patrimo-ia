import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatBadgeProps {
  value: number | string
  label?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatBadge({ value, label, trend, className }: StatBadgeProps) {
  const trendColor = trend === 'up' ? 'text-[var(--success)]' : trend === 'down' ? 'text-red-400' : 'text-slate-400'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {trend && <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />}
      <span className={cn('text-sm font-medium', trendColor)}>{value}</span>
      {label && <span className="text-xs text-slate-500">{label}</span>}
    </div>
  )
}
