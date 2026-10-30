'use client'

import Link from 'next/link'
import { Eye, ArrowRight } from 'lucide-react'

/**
 * Bandeau affiché uniquement sur le compte de démonstration publique.
 * Le compte est en lecture seule côté base : ce bandeau prévient le visiteur
 * avant qu'il ne se heurte à un refus d'écriture.
 */
export function DemoBanner() {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(29,78,216,0.06)', border: '1px solid rgba(29,78,216,0.25)' }}
    >
      <div className="flex items-start gap-2.5 flex-1">
        <Eye className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#1D4ED8' }}>Mode démonstration</strong> — portefeuille
          fictif de 6 biens en lecture seule. Explorez librement : les modifications
          ne sont pas enregistrées.
        </p>
      </div>
      <Link
        href="/register"
        className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white whitespace-nowrap transition-all hover:opacity-90"
        style={{ background: '#1D4ED8' }}
      >
        Créer mon compte <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
