import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'blue' | 'green' | 'amber' | 'cyan' | 'red'
}

const glowColors: Record<string, string> = {
  blue:  'var(--brand)',
  green: 'var(--success)',
  amber: 'var(--warning)',
  cyan:  'var(--sci)',
  red:   'var(--danger)',
}

export function GlassCard({ children, className, hover = false, glow }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass relative rounded-xl p-4 overflow-hidden transition-all',
        hover && 'hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
    >
      {glow && (
        <div
          className="absolute top-0 left-4 right-4 h-[3px] rounded-full"
          style={{ background: `linear-gradient(90deg, ${glowColors[glow]}, ${glowColors[glow]}55)` }}
        />
      )}
      {children}
    </div>
  )
}
