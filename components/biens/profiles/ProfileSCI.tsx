import { GlassCard } from '@/components/ui/GlassCard'
import { ProfileBadge } from '@/components/ui/ProfileBadge'
import { NumeroFiscalBadge } from '@/components/biens/NumeroFiscalBadge'
import { formatCurrency, formatPct } from '@/lib/utils'
import { calculateSciSimulation } from '@/lib/fiscal/sci'
import { AlertTriangle, Users } from 'lucide-react'
import type { Property, Lease, SciAssociate, Expense } from '@/types'

interface ProfileSCIProps {
  property: Property & {
    active_lease: Lease | null
    associates: SciAssociate[]
    expenses_ytd: Expense[]
    gross_yield: number | null
    monthly_cashflow: number | null
  }
}

export function ProfileSCI({ property: p }: ProfileSCIProps) {
  const revenus = (p.active_lease?.monthly_rent ?? 0) * 12
  const charges = p.expenses_ytd.reduce((s, e) => s + e.amount, 0) + p.monthly_charges * 12 + p.loan_monthly * 12 + p.property_tax + p.insurance_annual
  const resultat = revenus - charges

  const simulation = calculateSciSimulation({
    resultat_comptable: resultat,
    regime: p.sci_regime ?? 'ir',
    taux_marginal: 0.30,
  })

  const totalShares = p.associates.reduce((s, a) => s + a.share_pct, 0)

  return (
    <div className="space-y-6">
      <GlassCard glow="cyan" className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <ProfileBadge type="sci" />
            <h2 className="font-display font-bold text-2xl text-text-primary mt-2">{p.name}</h2>
            {p.sci_name && <p className="text-cyan-400 text-sm font-medium">{p.sci_name}</p>}
            {p.sci_siren && <p className="text-text-secondary text-xs">SIREN : {p.sci_siren}</p>}
            <div className="mt-2"><NumeroFiscalBadge numero_fiscal={p.numero_fiscal ?? null} property_id={p.id} /></div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary mb-0.5">Régime fiscal</p>
            <span className="text-sm font-semibold text-cyan-400 uppercase">{p.sci_regime ?? 'IR'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Résultat comptable', value: formatCurrency(resultat), color: resultat >= 0 ? 'text-text-primary' : 'text-red-400' },
            { label: p.sci_regime === 'is' ? 'IS dû' : 'Impôt estimé', value: formatCurrency(simulation.is_du), color: 'text-amber-400' },
            { label: 'Dividendes disponibles', value: formatCurrency(simulation.dividendes_disponibles), color: 'text-success-text' },
            { label: 'Nb associés', value: `${p.associates.length}`, color: 'text-cyan-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-secondary/50 rounded-xl p-3">
              <p className="text-xs text-text-secondary mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Associés */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-text-tertiary" />
          <h3 className="font-display font-semibold text-text-primary">Répartition des parts</h3>
        </div>

        {p.associates.length === 0 ? (
          <p className="text-sm text-text-secondary">Aucun associé enregistré</p>
        ) : (
          <div className="space-y-3">
            {p.associates.map(assoc => {
              const montant = simulation.dividendes_disponibles * (assoc.share_pct / 100)
              return (
                <div key={assoc.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-secondary">{assoc.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-text-primary">{formatCurrency(montant)}</span>
                      <span className="text-xs text-cyan-400 font-medium w-12 text-right">{assoc.share_pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                      style={{ width: `${assoc.share_pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Alertes SCI */}
      <GlassCard>
        <h3 className="font-display font-semibold text-text-primary mb-4">Obligations SCI</h3>
        <div className="space-y-2">
          {[
            { label: 'Déclaration 2072 (avant 2ème jour ouvré de mai)', urgent: new Date().getMonth() === 3 },
            { label: p.sci_regime === 'is' ? 'Acompte IS 15 mars & 15 juin' : 'Déclaration IR quote-part', urgent: false },
            { label: 'Tenue de comptabilité obligatoire (régime IS)', urgent: p.sci_regime === 'is' },
          ].map(({ label, urgent }) => (
            <div key={label} className={`flex items-start gap-2 p-3 rounded-lg border ${urgent ? 'border-amber-400/20 bg-amber-400/5' : 'border-border bg-white/[0.02]'}`}>
              {urgent && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />}
              <span className={`text-sm ${urgent ? 'text-amber-300' : 'text-text-tertiary'}`}>{label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
