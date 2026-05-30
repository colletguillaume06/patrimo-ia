'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, TrendingUp, FileText, Copy, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  IRL_CURRENT, ILC_CURRENT, ILAT_CURRENT,
  getQuarterLabel, CURRENT_QUARTER_KEY,
  calculateRevisionLoyer,
} from '@/lib/fiscal/indices'

interface RevisionModalProps {
  lease: any
  onClose: () => void
  onSuccess: () => void
}

function genLettre(params: {
  tenant_name: string
  owner_name: string
  property_address: string
  loyer_actuel: number
  nouveau_loyer: number
  indice_ref_valeur: number
  indice_ref_label: string
  indice_new_valeur: number
  indice_new_label: string
  indice_type: string
  date_effet: string
}): string {
  const { tenant_name, owner_name, property_address, loyer_actuel, nouveau_loyer,
    indice_ref_valeur, indice_ref_label, indice_new_valeur, indice_new_label,
    indice_type, date_effet } = params
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const indiceLabel = indice_type === 'ilc' ? 'ILC (Indice des Loyers Commerciaux)' :
    indice_type === 'ilat' ? 'ILAT (Indice des Loyers des Activités Tertiaires)' :
    'IRL (Indice de Référence des Loyers)'
  const cgiRef = indice_type === 'irl'
    ? 'conformément à l\'article 17-1 de la loi du 6 juillet 1989'
    : 'conformément à l\'article L145-38 du Code de commerce'

  return `${owner_name}
Date : ${today}

${tenant_name}
${property_address}

Objet : Révision annuelle du loyer

Madame, Monsieur,

Je me permets de vous informer de la révision annuelle de votre loyer pour le logement situé au ${property_address}, ${cgiRef}.

CALCUL DE RÉVISION
──────────────────
Indice de référence à la signature :  ${indice_ref_valeur} (${indice_ref_label})
Dernier indice publié :                ${indice_new_valeur} (${indice_new_label})

Calcul :  ${loyer_actuel} € × ${indice_new_valeur} ÷ ${indice_ref_valeur} = ${nouveau_loyer} €

Loyer actuel :   ${loyer_actuel.toFixed(2)} €/mois
Nouveau loyer :  ${nouveau_loyer.toFixed(2)} €/mois
Variation :      +${(nouveau_loyer - loyer_actuel).toFixed(2)} € (+${(((nouveau_loyer - loyer_actuel) / loyer_actuel) * 100).toFixed(2)} %)

Cette révision prend effet à compter du ${date_effet}.

Je vous rappelle que vous disposez d'un délai légal pour contester cette révision si vous l'estimez incorrecte, en vous référant aux indices publiés par l'INSEE sur www.insee.fr.

Dans l'attente de votre règlement au nouveau montant, je reste à votre disposition pour tout renseignement complémentaire.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${owner_name}
`
}

export function RevisionModal({ lease, onClose, onSuccess }: RevisionModalProps) {
  const indice = (lease.irl_reference_indice ?? lease.property?.indice_revision ?? 'irl') as 'irl' | 'ilc' | 'ilat'
  const nouvelIndice = indice === 'ilc' ? ILC_CURRENT : indice === 'ilat' ? ILAT_CURRENT : IRL_CURRENT
  const newQuarterLabel = getQuarterLabel()

  // Pré-remplissage si le bail a les données de référence
  const hasRef = !!lease.irl_reference_valeur
  const [ancienIndice, setAncienIndice] = useState(
    hasRef ? String(lease.irl_reference_valeur) : ''
  )
  const refLabel = hasRef && lease.irl_reference_trimestre && lease.irl_reference_annee
    ? `T${lease.irl_reference_trimestre} ${lease.irl_reference_annee}`
    : null

  const [notify, setNotify] = useState(!!lease.tenant_email)
  const [loading, setLoading] = useState(false)
  const [showLettre, setShowLettre] = useState(false)
  const [copied, setCopied] = useState(false)

  const ancienVal = Number(ancienIndice)
  const calcul = ancienVal > 0
    ? calculateRevisionLoyer({ loyer_actuel: lease.monthly_rent, indice_reference: ancienVal, indice_nouveau: nouvelIndice })
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ancienVal || !calcul) return
    setLoading(true)

    const res = await fetch('/api/loyers/revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lease_id: lease.id, ancien_indice: ancienVal, notify }),
    })

    setLoading(false)
    const data = await res.json()

    if (res.ok) {
      toast.success(`Loyer révisé : ${formatCurrency(lease.monthly_rent)} → ${formatCurrency(data.nouveau_loyer)} (+${data.hausse_pct}%)`)
      if (notify) toast.success('Notification envoyée au locataire')
      onSuccess()
      onClose()
    } else {
      toast.error(data.error)
    }
  }

  const lettre = calcul ? genLettre({
    tenant_name: lease.tenant_name,
    owner_name: 'Le propriétaire',
    property_address: lease.property?.name ?? 'votre logement',
    loyer_actuel: lease.monthly_rent,
    nouveau_loyer: calcul.nouveau_loyer,
    indice_ref_valeur: ancienVal,
    indice_ref_label: refLabel ?? `indice précédent`,
    indice_new_valeur: nouvelIndice,
    indice_new_label: newQuarterLabel,
    indice_type: indice,
    date_effet: new Date().toLocaleDateString('fr-FR'),
  }) : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(lettre)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Lettre copiée dans le presse-papiers')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--surface)] border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--success)]" />
            <h2 className="font-display font-semibold text-[var(--text-primary)]">Révision de loyer</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-secondary">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Infos bail */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5">
          <p className="text-xs text-slate-500">{lease.tenant_name} · {lease.property?.name}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{formatCurrency(lease.monthly_rent)}/mois</p>
          <p className="text-xs text-blue-400 mt-0.5">
            Indice : {indice.toUpperCase()} — Indice actuel {newQuarterLabel} : <span className="font-mono font-semibold">{nouvelIndice}</span>
          </p>
          {hasRef && refLabel && (
            <p className="text-xs text-[var(--success)] mt-0.5">
              ✓ Indice à la signature : <span className="font-mono">{ancienVal}</span> ({refLabel}) — pré-rempli depuis le bail
            </p>
          )}
        </div>

        {!showLettre ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Indice de référence */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Indice {indice.toUpperCase()} à la signature du bail (ou dernière révision)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={`Ex: ${(nouvelIndice * 0.98).toFixed(2)}`}
                value={ancienIndice}
                onChange={e => setAncienIndice(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm font-mono focus:outline-none focus:border-blue-500/50"
              />
              {!hasRef && (
                <p className="text-xs text-slate-600 mt-1">
                  Trouvez l'indice sur <a href="https://www.insee.fr" target="_blank" className="text-blue-400 hover:underline">insee.fr</a>
                </p>
              )}
            </div>

            {/* Calcul détaillé */}
            {calcul && (
              <div className="p-4 rounded-xl bg-green-400/5 border border-[var(--success)/20] space-y-2.5">
                {/* Formule */}
                <p className="text-xs text-slate-400 font-mono text-center bg-white/[0.04] rounded-lg py-2">
                  {lease.monthly_rent} × {nouvelIndice} ÷ {ancienVal} = <span className="text-[var(--success)] font-bold">{calcul.nouveau_loyer.toFixed(2)} €</span>
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Indice référence {refLabel ? `(${refLabel})` : ''}</span>
                    <span className="text-[var(--text-primary)] font-mono">{ancienVal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Indice actuel ({newQuarterLabel})</span>
                    <span className="text-[var(--text-primary)] font-mono">{nouvelIndice}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-white/[0.06] pt-1.5">
                    <span className="text-slate-400">Loyer actuel</span>
                    <span className="text-[var(--text-primary)]">{formatCurrency(lease.monthly_rent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Nouveau loyer</span>
                    <span className="text-[var(--success)] font-bold">{formatCurrency(calcul.nouveau_loyer)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-white/[0.06] pt-1.5">
                    <span className="text-slate-400">Variation</span>
                    <span className="text-[var(--success)] font-semibold">
                      +{formatCurrency(calcul.variation_euros)} (+{calcul.variation_pct}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle notification */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setNotify(!notify)}
                className={`h-5 w-9 rounded-full transition-colors relative flex-shrink-0 ${notify ? 'bg-blue-500' : 'bg-bg-secondary'}`}
              >
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${notify ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300">
                Notifier {lease.tenant_name} par email
                {!lease.tenant_email && <span className="text-slate-600 ml-1">(email non renseigné)</span>}
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLettre(true)}
                disabled={!calcul}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-bg-secondary hover:bg-bg-secondary border border-border text-slate-300 text-sm font-medium transition-all disabled:opacity-40"
              >
                <FileText className="h-4 w-4" /> Lettre de révision
              </button>
              <button
                type="submit"
                disabled={loading || !ancienVal || !calcul}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-green-500 hover:bg-green-400 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Application...' : <><TrendingUp className="h-4 w-4" /> Appliquer</>}
              </button>
            </div>
          </form>
        ) : (
          /* Lettre de révision */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--text-primary)]">Lettre de révision</p>
              <button onClick={() => setShowLettre(false)} className="text-xs text-slate-400 hover:text-[var(--text-primary)]">← Retour</button>
            </div>
            <div className="relative">
              <pre className="text-xs text-slate-300 font-mono leading-relaxed bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
                {lettre}
              </pre>
            </div>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-semibold transition-all"
            >
              {copied
                ? <><CheckCircle className="h-4 w-4 text-[var(--success)]" /> Copié !</>
                : <><Copy className="h-4 w-4" /> Copier la lettre</>
              }
            </button>
            <p className="text-xs text-slate-600 text-center">
              Personnalisez le nom du propriétaire avant envoi. Envoi recommandé en LRAR.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
