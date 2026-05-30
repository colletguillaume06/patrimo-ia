'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { ChevronLeft, Copy, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function RegularisationPage() {
  const { id } = useParams<{ id: string }>()
  const [lease, setLease] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    charges_type: 'provision',
    charges_reelles: '',
    annee: String(new Date().getFullYear() - 1),
  })
  const supabase = createClient()

  useEffect(() => {
    supabase.from('leases')
      .select('*, property:properties(name, address, city)')
      .eq('id', id).single()
      .then(r => {
        setLease(r.data)
        if (r.data) setForm(f => ({ ...f, charges_type: r.data.charges_type ?? 'provision' }))
      })
  }, [id])

  const chargesType = form.charges_type
  const charges_mensuelles = lease?.charges ?? 0
  const provisions = charges_mensuelles * 12
  const charges_reelles = Number(form.charges_reelles) || 0
  const solde = provisions - charges_reelles

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('leases').update({
      charges_type: form.charges_type,
      charges_reelles_annuelles: charges_reelles || null,
    } as any).eq('id', id)
    setSaving(false)
    toast.success('Charges mises à jour')
  }

  const genCourrier = () => {
    const today = format(new Date(), 'd MMMM yyyy', { locale: fr })
    const adresse = lease?.property ? [lease.property.address, lease.property.city].filter(Boolean).join(', ') : '[adresse]'
    return `[Votre nom et adresse]

Le ${today}

${lease?.tenant_name ?? '[Locataire]'}
${adresse}

Objet : Régularisation des charges — ${adresse} — Année ${form.annee}

Madame, Monsieur,

Conformément à l'article 23 de la loi du 6 juillet 1989, je vous adresse le décompte de régularisation annuelle des charges pour le logement sis ${adresse}.

DÉCOMPTE DE RÉGULARISATION ${form.annee}
Provisions versées (${charges_mensuelles.toFixed(2)}€ × 12 mois) : ${formatCurrency(provisions)}
Charges réelles justifiées : ${formatCurrency(charges_reelles)}

${solde >= 0
  ? `SOLDE EN VOTRE FAVEUR : ${formatCurrency(solde)}
Ce montant sera déduit de votre prochaine échéance de loyer.`
  : `COMPLÉMENT À VOTRE CHARGE : ${formatCurrency(Math.abs(solde))}
Ce montant est à régler à la prochaine échéance de loyer.`}

Les justificatifs des charges réelles sont disponibles sur demande, conformément à l'article 23 al. 2 de la loi du 6 juillet 1989.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Signature]`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(genCourrier())
    setCopied(true)
    toast.success('Courrier copié !')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/baux/${id}`} className="text-slate-400 hover:text-[var(--text-primary)] text-sm flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> {lease?.tenant_name}
        </Link>
        <span className="text-slate-600">/</span>
        <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">Régularisation des charges</h1>
      </div>

      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Type de charges</h2>
        <div className="space-y-2 mb-5">
          {[
            { value: 'forfait', label: 'Forfait', desc: 'Montant fixe — pas de régularisation' },
            { value: 'provision', label: 'Provision sur charges', desc: 'Régularisation annuelle selon dépenses réelles' },
            { value: 'reelles', label: 'Charges réelles', desc: 'Remboursement exact sur justificatifs' },
          ].map(({ value, label, desc }) => (
            <button key={value} onClick={() => setForm(f => ({ ...f, charges_type: value }))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${form.charges_type === value ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'}`}>
              <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${form.charges_type === value ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving} className="h-9 px-5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold disabled:opacity-50">
          Enregistrer
        </button>
      </GlassCard>

      {form.charges_type === 'provision' && (
        <GlassCard>
          <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Calcul de régularisation {form.annee}</h2>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Année de régularisation</label>
              <input type="number" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Charges réelles de l'année (€)</label>
              <input type="number" step="0.01" placeholder="0" value={form.charges_reelles}
                onChange={e => setForm(f => ({ ...f, charges_reelles: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none" />
            </div>
          </div>

          {charges_reelles > 0 && (
            <div className={`p-4 rounded-xl border space-y-2 mb-5 ${solde >= 0 ? 'border-[var(--success)/20] bg-green-400/5' : 'border-red-400/20 bg-red-400/5'}`}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Provisions versées ({charges_mensuelles}€ × 12)</span>
                <span className="text-[var(--text-primary)] font-semibold">{formatCurrency(provisions)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Charges réelles {form.annee}</span>
                <span className="text-[var(--text-primary)] font-semibold">{formatCurrency(charges_reelles)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/[0.08] pt-2 font-bold">
                <span className={solde >= 0 ? 'text-[var(--success)]' : 'text-red-400'}>
                  {solde >= 0 ? '✓ À rembourser au locataire' : '⚠ À appeler au locataire'}
                </span>
                <span className={solde >= 0 ? 'text-[var(--success)]' : 'text-red-400'}>
                  {formatCurrency(Math.abs(solde))}
                </span>
              </div>
            </div>
          )}

          <button onClick={handleCopy} disabled={charges_reelles === 0}
            className="flex items-center gap-2 h-9 px-5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-slate-300 hover:text-[var(--text-primary)] text-sm transition-all disabled:opacity-40">
            {copied ? <><CheckCircle className="h-4 w-4 text-[var(--success)]" /> Copié !</> : <><Copy className="h-4 w-4" /> Générer courrier de régularisation</>}
          </button>
        </GlassCard>
      )}
    </div>
  )
}
