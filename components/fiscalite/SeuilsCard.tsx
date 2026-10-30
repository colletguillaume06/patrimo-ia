'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { EtatSeuil } from '@/lib/fiscal/seuils'

const STYLES = {
  ok: { bar: 'bg-green-400', text: 'text-[var(--success)]', Icon: CheckCircle2 },
  proche: { bar: 'bg-amber-400', text: 'text-amber-400', Icon: AlertTriangle },
  depasse: { bar: 'bg-red-500', text: 'text-red-400', Icon: AlertTriangle },
} as const

function Jauge({ etat }: { etat: EtatSeuil }) {
  const s = STYLES[etat.niveau]
  return (
    <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{etat.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatCurrency(etat.recettes)} sur {formatCurrency(etat.plafond)}
          </p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${s.text} flex-shrink-0`}>
          <s.Icon className="h-3.5 w-3.5" />
          {Math.round(etat.pct)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all ${s.bar}`}
          style={{ width: `${Math.min(100, etat.pct)}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{etat.message}</p>
    </div>
  )
}

interface GainClassement {
  recettes: number
  impotNonClasse: number
  impotClasse: number
  economie: number
  nonClasseHorsMicro: boolean
  plafondNonClasse: number
  plafondClasse: number
}

export function SeuilsCard({ seuils, gainClassement }: { seuils: EtatSeuil[]; gainClassement?: GainClassement | null }) {
  const actifs = seuils.filter(s => s.recettes > 0)
  if (actifs.length === 0) return null

  return (
    <GlassCard className="p-5">
      <h2 className="font-display font-semibold text-[var(--text-primary)] mb-1">
        Seuils fiscaux — location meublée
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Basés sur les recettes encaissées (commissions incluses), pas sur le bénéfice.
      </p>

      <div className="space-y-2">
        {actifs.map(s => <Jauge key={s.label} etat={s} />)}
      </div>

      {/* Levier du classement, chiffré sur les recettes réelles */}
      {gainClassement && gainClassement.economie > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
          <p className="text-sm font-semibold text-[var(--success)] mb-1">
            Faire classer vos meublés vous ferait économiser {formatCurrency(gainClassement.economie)} par an
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sur {formatCurrency(gainClassement.recettes)} de recettes non classées : impôt de{' '}
            {formatCurrency(gainClassement.impotNonClasse)} aujourd'hui contre{' '}
            {formatCurrency(gainClassement.impotClasse)} une fois classé (abattement 50 % au lieu de 30 %).
            Le classement coûte environ 150-300 € et vaut 5 ans.
          </p>
          {gainClassement.nonClasseHorsMicro && (
            <p className="text-xs text-amber-400 mt-2">
              ⚠ Vous dépassez {formatCurrency(gainClassement.plafondNonClasse)} : sans classement, le régime réel
              devient obligatoire. Classé, le micro-BIC reste ouvert jusqu'à {formatCurrency(gainClassement.plafondClasse)}.
            </p>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-400/5 border border-blue-400/20">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Indicatif. Le seuil LMP se cumule sur tous vos meublés au niveau du foyer fiscal ; les
          plafonds micro-BIC s'apprécient par catégorie. Faites valider par votre expert-comptable.
        </p>
      </div>
    </GlassCard>
  )
}
