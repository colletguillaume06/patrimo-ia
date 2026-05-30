import Link from 'next/link'
import { AlertTriangle, Info, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types'

interface AlertsPanelProps {
  alerts: Alert[]
}

const severityConfig = {
  high: {
    color: 'text-[#B91C1C]',
    bg: 'bg-[#FEE8E8]',
    border: 'border-red-200',
    icon: AlertTriangle,
    dot: 'bg-red-500 animate-pulse',
  },
  medium: {
    color: 'text-[#C27820]',
    bg: 'bg-[#FEF3DC]',
    border: 'border-amber-200',
    icon: AlertTriangle,
    dot: 'bg-amber-500',
  },
  low: {
    color: 'text-[#1B4FD8]',
    bg: 'bg-[#EEF3FF]',
    border: 'border-blue-200',
    icon: Info,
    dot: 'bg-blue-400',
  },
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) return null

  const urgent = alerts.filter(a => a.severity === 'high')
  const other = alerts.filter(a => a.severity !== 'high')

  return (
    <div className="space-y-2">
      {/* Alertes urgentes — pleine largeur, bien visibles */}
      {urgent.map((alert, i) => {
        const config = severityConfig.high
        return (
          <div key={i} className={cn(
            'flex items-start gap-4 p-4 rounded-xl border',
            config.bg, config.border
          )}>
            <div className="flex-shrink-0 mt-0.5">
              <div className={cn('h-2 w-2 rounded-full mt-1.5', config.dot)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', config.color)}>
                {alert.property_name}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{alert.message}</p>
            </div>
            {alert.action_label && alert.action_href && (
              <Link href={alert.action_href}
                className={cn('flex-shrink-0 flex items-center gap-1 text-sm font-semibold whitespace-nowrap', config.color)}>
                {alert.action_label} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )
      })}

      {/* Alertes secondaires — grille compacte */}
      {other.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {other.slice(0, 4).map((alert, i) => {
            const config = severityConfig[alert.severity]
            const Icon = config.icon
            return (
              <div key={i} className={cn(
                'flex items-start gap-3 p-3 rounded-xl border',
                config.bg, config.border
              )}>
                <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{alert.property_name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{alert.message}</p>
                  {alert.action_label && alert.action_href && (
                    <Link href={alert.action_href}
                      className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium', config.color)}>
                      {alert.action_label} <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
