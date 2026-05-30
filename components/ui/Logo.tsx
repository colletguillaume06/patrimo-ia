import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  textColor?: string
}

// Logo Patrimo : image originale ~1060x1060 avec marges, fond blanc
// On affiche l'image seule sans texte doublé car le texte est dans l'image
export function Logo({ size = 'md', showText = true, textColor = '#1E2140' }: LogoProps) {
  const heights = { sm: 36, md: 44, lg: 56 }
  const widths  = { sm: 130, md: 160, lg: 200 }
  const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }

  return (
    <div className="flex items-center gap-2">
      {/* Icône P uniquement — on crop la partie icône */}
      <Image
        src="/logo-patrimo.png"
        alt="Patrimo"
        width={widths[size]}
        height={heights[size]}
        className="object-contain w-full"
        style={{ maxHeight: heights[size], maxWidth: '100%' }}
        priority
      />
    </div>
  )
}
