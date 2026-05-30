import { cn } from '@/lib/utils'
import type { PaymentStatus } from '@/types'

const config: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: 'Payé', className: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)/20]' },
  late: { label: 'En retard', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  partial: { label: 'Partiel', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  pending: { label: 'En attente', className: 'bg-slate-400/10 text-slate-400 border-slate-400/20' },
}

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = config[status]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', className)}>
      {label}
    </span>
  )
}
