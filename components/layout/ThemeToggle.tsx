'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  // Le thème est piloté par next-themes (défaut : clair, préférence OS ignorée).
  // On passe par son API plutôt que de manipuler la classe `dark` à la main,
  // sinon les deux systèmes se contredisent au premier rendu.
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const dark = mounted && resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="h-9 w-9 rounded-lg border flex items-center justify-center transition-all"
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
      title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      suppressHydrationWarning
    >
      {dark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
    </button>
  )
}
