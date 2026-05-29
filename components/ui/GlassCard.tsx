import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'blue' | 'green' | 'amber' | 'cyan' | 'red'
}

const glowMap = {
  blue: 'radial-gradient(circle at top right, rgba(26,86,219,0.15) 0%, transparent 60%)',
  green: 'radial-gradient(circle at top right, rgba(16,185,129,0.15) 0%, transparent 60%)',
  amber: 'radial-gradient(circle at top right, rgba(245,158,11,0.15) 0%, transparent 60%)',
  cyan: 'radial-gradient(circle at top right, rgba(6,182,212,0.15) 0%, transparent 60%)',
  red: 'radial-gradient(circle at top right, rgba(239,68,68,0.15) 0%, transparent 60%)',
}

export function GlassCard({ children, className, hover = false, glow }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 overflow-hidden',
        hover && 'transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]',
        className
      )}
      style={glow ? { backgroundImage: glowMap[glow] } : undefined}
    >
      {children}
    </div>
  )
}
