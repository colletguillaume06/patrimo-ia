'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // SSR-safe : on n'affiche l'icône qu'après hydratation
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg border border-border bg-bg-secondary" />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-9 w-9 rounded-lg border border-border bg-bg-secondary
                 flex items-center justify-center text-text-secondary
                 hover:bg-bg-tertiary hover:text-text-primary
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-accent focus-visible:ring-offset-2
                 focus-visible:ring-offset-bg-primary
                 transition-all duration-150"
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
    </button>
  )
}
