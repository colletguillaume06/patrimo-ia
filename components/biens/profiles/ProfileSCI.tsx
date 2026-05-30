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
            <h2 className="font-display font-bold text-2xl text-[var(--text-primary)] mt-2">{p.name}</h2>
            {p.sci_name && <p className="text-cyan-400 text-sm font-medium">{p.sci_name}</p>}
            {p.sci_siren && <p className="text-slate-500 text-xs">SIREN : {p.sci_siren}</p>}
            <div className="mt-2"><NumeroFiscalBadge numero_fiscal={p.numero_fiscal ?? null} property_id={p.id} /></div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">Régime fiscal</p>
            <span className="text-sm font-semibold text-cyan-400 uppercase">{p.sci_regime ?? 'IR'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Résultat comptable', value: formatCurrency(resultat), color: resultat >= 0 ? 'text-[var(--text-primary)]' : 'text-red-400' },
            { label: p.sci_regime === 'is' ? 'IS dû' : 'Impôt estimé', value: formatCurrency(simulation.is_du), color: 'text-amber-400' },
            { label: 'Dividendes disponibles', value: formatCurrency(simulation.dividendes_disponibles), color: 'text-[var(--success)]' },
            { label: 'Nb associés', value: `${p.associates.length}`, color: 'text-cyan-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Associés */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h3 className="font-display font-semibold text-[var(--text-primary)]">Répartition des parts</h3>
          </div>
          {/* Capital total */}
          {(p as any).sci_capital_parts && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid var(--info-border)' }}>
              Capital : {(p as any).sci_capital_parts.toLocaleString('fr-FR')} parts
            </span>
          )}
        </div>

        {p.associates.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun associé enregistré</p>
        ) : (
          <div className="space-y-4">
            {/* En-tête */}
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold uppercase tracking-wide pb-2 border-b"
              style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>
              <span>Associé</span>
              <span className="text-center">Parts</span>
              <span className="text-center">%</span>
              <span className="text-right">Quote-part</span>
            </div>

            {p.associates.map(assoc => {
              const montant = simulation.dividendes_disponibles * (assoc.share_pct / 100)
              const capitalParts = (p as any).sci_capital_parts ?? 1000
              const nombreParts = (assoc as any).nombre_parts
                ?? Math.round(capitalParts * assoc.share_pct / 100)

              return (
                <div key={assoc.id} className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {assoc.name}
                    </span>
                    <span className="text-sm font-mono text-center" style={{ color: 'var(--text-primary)' }}>
                      {nombreParts.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-sm font-bold text-center text-cyan-500">
                      {assoc.share_pct}%
                    </span>
                    <span className="text-sm font-semibold text-right" style={{ color: 'var(--success-text)' }}>
                      {formatCurrency(montant)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all"
                      style={{ width: `${assoc.share_pct}%` }} />
                  </div>
                </div>
              )
            })}

            {/* Total */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t font-bold text-sm"
              style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-primary)' }}>TOTAL</span>
              <span className="text-center font-mono" style={{ color: 'var(--text-primary)' }}>
                {((p as any).sci_capital_parts ?? 1000).toLocaleString('fr-FR')}
              </span>
              <span className="text-center text-cyan-500">100%</span>
              <span className="text-right" style={{ color: 'var(--success-text)' }}>
                {formatCurrency(simulation.dividendes_disponibles)}
              </span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Alertes SCI */}
      <GlassCard>
        <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">Obligations SCI</h3>
        <div className="space-y-2">
          {[
            { label: 'Déclaration 2072 (avant 2ème jour ouvré de mai)', urgent: new Date().getMonth() === 3 },
            { label: p.sci_regime === 'is' ? 'Acompte IS 15 mars & 15 juin' : 'Déclaration IR quote-part', urgent: false },
            { label: 'Tenue de comptabilité obligatoire (régime IS)', urgent: p.sci_regime === 'is' },
          ].map(({ label, urgent }) => (
            <div key={label} className={`flex items-start gap-2 p-3 rounded-lg border ${urgent ? 'border-amber-400/20 bg-amber-400/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              {urgent && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />}
              <span className={`text-sm ${urgent ? 'text-amber-300' : 'text-slate-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
