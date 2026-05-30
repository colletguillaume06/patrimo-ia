import Link from 'next/link'
import { Hash, Plus } from 'lucide-react'

interface NumeroFiscalBadgeProps {
  numero_fiscal: string | null
  property_id: string
}

export function NumeroFiscalBadge({ numero_fiscal, property_id }: NumeroFiscalBadgeProps) {
  if (numero_fiscal) {
    return (
      <div className="flex items-center gap-2">
        <div className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary/30 border border-border">
          <Hash className="h-3 w-3 text-text-secondary" />
          <span className="text-xs font-mono text-text-secondary">{numero_fiscal}</span>
          <div className="absolute bottom-7 left-0 w-64 px-3 py-2 bg-bg-primary border border-border rounded-lg text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
            Numéro fiscal — référence administration fiscale (taxe foncière)
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={`/biens/${property_id}`}
      className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-blue-400 transition-colors"
    >
      <Plus className="h-3 w-3" />
      Ajouter le numéro fiscal
    </Link>
  )
}
