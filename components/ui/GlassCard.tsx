import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'blue' | 'green' | 'amber' | 'cyan' | 'red'
}

// Barre colorée en haut de card pour les KPIs
const glowMap: Record<string, string> = {
  blue: '#1B4FD8',
  green: '#0E7A4F',
  amber: '#C27820',
  cyan: '#0891B2',
  red: '#B91C1C',
}

export function GlassCard({ children, className, hover = false, glow }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl bg-white border border-[#E5E2DB] p-4 overflow-hidden',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-gray-100',
        className
      )}
    >
      {/* Barre colorée en haut si glow défini */}
      {glow && (
        <div
          className="absolute top-0 left-4 right-4 h-[3px] rounded-full"
          style={{ background: `linear-gradient(90deg, ${glowMap[glow]}, ${glowMap[glow]}88)` }}
        />
      )}
      {children}
    </div>
  )
}
