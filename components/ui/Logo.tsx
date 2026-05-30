import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  textColor?: string
}

const sizes = { sm: 28, md: 36, lg: 48 }

export function Logo({ size = 'md', showText = true, textColor = '#1E2140' }: LogoProps) {
  const px = sizes[size]
  const textSize = size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-2xl'

  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo-patrimo.png"
        alt="Patrimo"
        width={px}
        height={px}
        className="object-contain"
      />
      {showText && (
        <span
          className={`font-display font-bold ${textSize} tracking-tight`}
          style={{ color: textColor }}
        >
          Patrimo
        </span>
      )}
    </div>
  )
}
