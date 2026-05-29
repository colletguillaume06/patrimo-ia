import { cn, getPropertyTypeLabel, getPropertyTypeColor } from '@/lib/utils'
import type { PropertyType } from '@/types'

interface ProfileBadgeProps {
  type: PropertyType
  className?: string
  size?: 'sm' | 'md'
}

export function ProfileBadge({ type, className, size = 'md' }: ProfileBadgeProps) {
  const label = getPropertyTypeLabel(type)
  const color = getPropertyTypeColor(type)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}15`,
      }}
    >
      {label}
    </span>
  )
}
