'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AlertTriangle, Scale } from 'lucide-react'
import { estBailCommercial, clauseTaxeFonciereInapplicable } from '@/lib/baux/clauses-fiscales'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${on ? 'bg-amber-500' : 'bg-slate-600'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

/** Clauses fiscales d'un bail : les options proposées dépendent du type de bail (habitation / commercial). */
export function ClausesFiscalesCard({ lease, onChange }: { lease: any; onChange: (parsed: any) => void }) {
  const supabase = createClient()
  const commercial = estBailCommercial(lease.property?.type)
  const parsed = lease.parsed_data ?? {}

  const save = async (patch: Record<string, any>, message: string) => {
    const next = { ...parsed, ...patch }
    const { error } = await supabase.from('leases').update({ parsed_data: next }).eq('id', lease.id)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    onChange(next)
    toast.success(message)
  }

  const row = 'flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]'

  return (
    <div className="space-y-3">
      {clauseTaxeFonciereInapplicable(lease.property?.type, parsed) && (
        <div className="flex gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>Ce bail d&apos;habitation portait une clause « taxe foncière refacturée ». Elle n&apos;est pas permise (décret n° 87-713 : seule la TEOM est récupérable) et n&apos;est plus prise en compte dans vos charges déductibles.
            <button className="underline ml-1" onClick={() => save({ taxe_fonciere_refacturee: false }, 'Clause retirée')}>Retirer la clause</button></p>
        </div>
      )}

      {commercial && (
        <div className={row}>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Taxe foncière refacturée au locataire</p>
            <p className="text-xs text-slate-500 mt-0.5">Possible en bail commercial si le bail le prévoit (art. R145-35 C. com.). Si activé, la taxe foncière est exclue de vos charges déductibles.</p>
          </div>
          <Toggle on={!!parsed.taxe_fonciere_refacturee}
            onClick={() => save({ taxe_fonciere_refacturee: !parsed.taxe_fonciere_refacturee },
              !parsed.taxe_fonciere_refacturee ? 'Taxe foncière marquée comme refacturée' : 'Taxe foncière repassée en charge déductible')} />
        </div>
      )}

      {!(commercial && parsed.taxe_fonciere_refacturee) && (
        <>
          <div className={row}>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Taxe d&apos;ordures ménagères (TEOM) récupérée sur le locataire</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {commercial
                  ? 'Bail commercial : la TEOM ne peut être refacturée que si le bail le stipule expressément (Cass. 3e civ., 13/09/2018).'
                  : 'Bail d\'habitation : seule la TEOM (et la taxe de balayage) est récupérable ; la taxe foncière reste à votre charge.'}
                {' '}Ce montant est exclu de vos charges déductibles.
              </p>
            </div>
            <Toggle on={!!parsed.teom_refacturee}
              onClick={() => save({ teom_refacturee: !parsed.teom_refacturee },
                !parsed.teom_refacturee ? 'TEOM marquée comme récupérée sur le locataire' : 'TEOM repassée en charge du bailleur')} />
          </div>
          {parsed.teom_refacturee && (
            <div className={row}>
              <label className="text-xs text-slate-500 flex-1">
                Montant annuel de TEOM récupérable, <strong>hors frais de gestion</strong> (voir votre avis de taxe foncière)
              </label>
              <input type="number" min="0" step="1" placeholder="ex. 180"
                defaultValue={parsed.teom_montant ?? ''}
                onBlur={e => save({ teom_montant: Number(e.target.value) || 0 }, 'Montant de TEOM enregistré')}
                className="w-28 h-9 px-3 rounded-lg bg-bg-secondary border border-border text-sm text-[var(--text-primary)]" />
              <span className="text-xs text-slate-500">€ / an</span>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 text-xs text-slate-500">
        <Scale className="h-4 w-4 flex-shrink-0 mt-0.5" />
        {commercial ? (
          <p>Rappels (art. L145-40-2 C. com.) : le bail doit comporter un inventaire limitatif des charges, impôts et taxes. Non refacturables : grosses réparations (art. 606 C. civ.), impôts dont vous êtes redevable (ex. CET), honoraires de gestion. État récapitulatif annuel à remettre au plus tard le 30 septembre de l&apos;année suivante.</p>
        ) : (
          <p>Rappels (loi du 6 juillet 1989, art. 23) : les charges récupérables sont exigibles par provisions puis régularisées annuellement avec justificatifs tenus à disposition du locataire ; le locataire peut contester dans les 3 ans (prescription).</p>
        )}
      </div>
    </div>
  )
}
