import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { NumeroFiscalBadge } from '@/components/biens/NumeroFiscalBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import type { Property, AirbnbBooking } from '@/types'

interface ProfileAirbnbProps {
  property: Property & {
    bookings_ytd: AirbnbBooking[]
    gross_yield: number | null
  }
}

export function ProfileAirbnb({ property: p }: ProfileAirbnbProps) {
  const bookings = p.bookings_ytd
  const totalNights = bookings.reduce((s, b) => s + (b.nights ?? 0), 0)
  const totalRevenue = bookings.reduce((s, b) => s + (b.total_revenue ?? 0), 0)
  const revPar = totalNights > 0 ? totalRevenue / totalNights : 0
  const daysInYear = 365
  const occupancyRate = (totalNights / daysInYear) * 100
  const nightsRemaining = Math.max(0, p.airbnb_max_nights - totalNights)
  const pctUsed = (totalNights / p.airbnb_max_nights) * 100
  const isNearLimit = totalNights > 100

  return (
    <div className="space-y-6">
      <GlassCard glow="amber" className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <ProfileBadge type="airbnb" />
            <h2 className="font-display font-bold text-2xl text-[var(--text-primary)] mt-2">{p.name}</h2>
            <p className="text-slate-400 text-sm">{p.address}, {p.city}</p>
            <div className="mt-2"><NumeroFiscalBadge numero_fiscal={p.numero_fiscal ?? null} property_id={p.id} /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'RevPAR', value: formatCurrency(revPar), color: 'text-[var(--text-primary)]' },
            { label: "Taux d'occupation", value: formatPct(occupancyRate), color: 'text-amber-400' },
            { label: 'Recettes BIC', value: formatCurrency(totalRevenue), color: 'text-[var(--success)]' },
            { label: 'Nuits réservées', value: `${totalNights}`, color: totalNights > 100 ? 'text-red-400' : 'text-[var(--text-primary)]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Compteur 120 nuits */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-[var(--text-primary)]">Compteur annuel (loi ELAN)</h3>
          {isNearLimit && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" /> Attention
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-slate-400">{totalNights} nuits utilisées</span>
          <span className="font-semibold text-[var(--text-primary)]">{nightsRemaining} restantes</span>
        </div>
        <div className="h-3 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pctUsed > 83 ? 'bg-red-500' : pctUsed > 66 ? 'bg-amber-400' : 'bg-green-400'
            }`}
            style={{ width: `${Math.min(100, pctUsed)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0 nuits</span>
          <span className={pctUsed > 83 ? 'text-red-400' : 'text-slate-400'}>{Math.round(pctUsed)}%</span>
          <span>120 nuits</span>
        </div>
        {isNearLimit && (
          <div className="mt-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-lg">
            <p className="text-xs text-amber-300">
              ⚠️ Au-delà de 120 nuits dans une résidence principale, vous enfreignez la loi ELAN et êtes passible d'une amende de 50 000€. Consultez votre mairie pour une éventuelle dérogation.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Calendrier réservations */}
      <GlassCard>
        <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">Réservations récentes</h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune réservation enregistrée cette année</p>
        ) : (
          <div className="space-y-2">
            {bookings.slice(0, 8).map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <div>
                  <p className="text-sm text-slate-300">{b.guest_name ?? 'Voyageur anonyme'}</p>
                  <p className="text-xs text-slate-500">{b.check_in} → {b.check_out} ({b.nights} nuits)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(b.total_revenue ?? b.nightly_rate * (b.nights ?? 1))}</p>
                  <p className="text-xs text-slate-600">{formatCurrency(b.nightly_rate)}/nuit</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
