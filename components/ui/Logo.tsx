import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'full'  // icon = P seul, full = P + Patrimo
  textColor?: string
}

const iconSizes = { sm: 32, md: 40, lg: 52 }
const fullWidths = { sm: 130, md: 160, lg: 200 }
const fullHeights = { sm: 36, md: 44, lg: 56 }
const textSizeMap = { sm: 'text-[15px]', md: 'text-lg', lg: 'text-2xl' }

export function Logo({ size = 'md', variant = 'full', textColor = '#1E2140' }: LogoProps) {
  if (variant === 'icon') {
    const px = iconSizes[size]
    return (
      <Image
        src="/logo-icon.png"
        alt="Patrimo"
        width={px}
        height={px}
        className="object-contain"
        priority
      />
    )
  }

  // Variante full — icône P + texte "Patrimo" côte à côte
  const iconPx = iconSizes[size]
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo-icon.png"
        alt="Patrimo"
        width={iconPx}
        height={iconPx}
        className="object-contain flex-shrink-0"
        priority
      />
      <span className={`font-display font-bold ${textSizeMap[size]} tracking-tight`}
        style={{ color: textColor }}>
        Patrimo
      </span>
    </div>
  )
}
