import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { ChevronRight, Plus } from 'lucide-react'
import type { PropertyWithMetrics } from '@/types'

interface BiensListProps {
  biens: PropertyWithMetrics[]
}

export function BiensList({ biens }: BiensListProps) {
  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-white">Mes biens</h2>
        <Link
          href="/biens"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Voir tout <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {biens.length === 0 ? (
        <Link
          href="/biens"
          className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-blue-500/30 transition-colors group"
        >
          <Plus className="h-8 w-8 text-slate-600 group-hover:text-blue-400 mb-2 transition-colors" />
          <p className="text-sm text-slate-500 group-hover:text-slate-300">Ajouter votre premier bien</p>
        </Link>
      ) : (
        <div className="space-y-2">
          {biens.slice(0, 5).map((bien) => (
            <Link
              key={bien.id}
              href={`/biens/${bien.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
            >
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, #1A56DB22, #1A56DB44)` }}
              >
                {bien.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{bien.name}</p>
                <p className="text-xs text-slate-500 truncate">{bien.city ?? 'Ville non renseignée'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-white">
                  {bien.active_lease ? formatCurrency(bien.active_lease.monthly_rent) : '—'}
                </p>
                {bien.gross_yield !== null && (
                  <p className="text-xs text-green-400">{formatPct(bien.gross_yield)}</p>
                )}
              </div>
              <ProfileBadge type={bien.type} size="sm" />
            </Link>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
