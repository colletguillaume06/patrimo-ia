'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

/** Flèche « Retour » : page précédente, ou le dashboard s'il n'y a pas d'historique. */
export function BackButton({ fallback = '/dashboard' }: { fallback?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
      style={{ color: 'var(--text-tertiary)' }}
      aria-label="Retour"
    >
      <ArrowLeft className="h-4 w-4" /> Retour
    </button>
  )
}
