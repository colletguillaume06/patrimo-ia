import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types'

interface AlertsPanelProps {
  alerts: Alert[]
}

const severityConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: AlertTriangle },
  medium: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: AlertTriangle },
  low: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: Info },
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) return null

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-white flex items-center gap-2">
          Alertes
          <span className="h-5 w-5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center">
            {alerts.length}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {alerts.slice(0, 3).map((alert, i) => {
          const config = severityConfig[alert.severity]
          const Icon = config.icon

          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                config.bg, config.border
              )}
            >
              <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{alert.property_name}</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{alert.message}</p>
                {alert.action_label && alert.action_href && (
                  <Link
                    href={alert.action_href}
                    className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium', config.color)}
                  >
                    {alert.action_label} <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
