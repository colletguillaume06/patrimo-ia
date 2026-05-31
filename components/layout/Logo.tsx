'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
  className?: string
}

const sizes = {
  sm: { width: 120, height: 40 },
  md: { width: 160, height: 53 },
  lg: { width: 220, height: 73 },
}

export function Logo({ size = 'md', linkTo = '/dashboard', className = '' }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Évite le flash SSR
  useEffect(() => setMounted(true), [])

  const { width, height } = sizes[size]

  const logoSrc = !mounted
    ? '/logos/logo-dark.png'
    : resolvedTheme === 'light'
    ? '/logos/logo-light.png'
    : '/logos/logo-dark.png'

  const logo = (
    <Image
      src={logoSrc}
      alt="Patrimo IA"
      width={width}
      height={height}
      priority
      className={`object-contain transition-opacity duration-200 ${className}`}
    />
  )

  if (!linkTo) return logo

  return (
    <Link href={linkTo} className="flex items-center hover:opacity-90 transition-opacity">
      {logo}
    </Link>
  )
}

export function LogoStatic({
  variant = 'dark',
  size = 'md',
}: {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
}) {
  const { width, height } = sizes[size]
  return (
    <Image
      src={`/logos/logo-${variant}.png`}
      alt="Patrimo IA"
      width={width}
      height={height}
      priority
      className="object-contain"
    />
  )
}
