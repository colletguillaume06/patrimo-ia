import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'blue' | 'green' | 'amber' | 'cyan' | 'red'
}

const glowColors: Record<string, string> = {
  blue:  '#1B4FD8',
  green: '#2A6B3E',
  amber: '#B45309',
  cyan:  '#0C7A9E',
  red:   '#B91C1C',
}

export function GlassCard({ children, className, hover = false, glow }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl p-4 overflow-hidden transition-all',
        hover && 'hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: hover ? undefined : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {glow && (
        <div
          className="absolute top-0 left-4 right-4 h-[3px] rounded-full"
          style={{ background: `linear-gradient(90deg, ${glowColors[glow]}, ${glowColors[glow]}66)` }}
        />
      )}
      {children}
    </div>
  )
}
