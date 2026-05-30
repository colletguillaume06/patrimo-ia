import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'blue' | 'green' | 'amber' | 'cyan' | 'red'
}

const glowVars: Record<string, string> = {
  blue:  'var(--accent)',
  green: 'var(--success-text)',
  amber: 'var(--warning-text)',
  cyan:  'var(--info-text)',
  red:   'var(--danger-text)',
}

export function GlassCard({ children, className, hover = false, glow }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass relative rounded-xl p-4 overflow-hidden transition-all duration-200',
        hover && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
        hover && 'hover:border-border-hover',
        className
      )}
    >
      {glow && (
        <div
          className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-70"
          style={{ background: `linear-gradient(90deg, ${glowVars[glow]}, transparent)` }}
        />
      )}
      {children}
    </div>
  )
}
