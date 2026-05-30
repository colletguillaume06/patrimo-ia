import { cn } from '@/lib/utils'
import type { PaymentStatus } from '@/types'

const config: Record<PaymentStatus, { label: string; className: string }> = {
  paid:    { label: 'Payé',        className: 'bg-success-bg text-success-text border-success-border' },
  late:    { label: 'En retard',   className: 'bg-danger-bg text-danger-text border-danger-border' },
  partial: { label: 'Partiel',     className: 'bg-warning-bg text-warning-text border-warning-border' },
  pending: { label: 'En attente',  className: 'bg-bg-tertiary text-text-secondary border-border' },
}

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = config[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', className)}>
      {label}
    </span>
  )
}
