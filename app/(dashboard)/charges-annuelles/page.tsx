'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { CheckCircle2, Calendar, Receipt, Loader2, Info, Pencil, Trash2, Plus } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { categorieDepense } from '@/lib/fiscal/bilan'
import { moisOccupes } from '@/lib/baux/clauses-fiscales'

const NOW = new Date()
const CURRENT_YEAR = NOW.getFullYear()

// Charges annuelles récurrentes du propriétaire, avec le champ fiche qui porte
// le montant connu et la catégorie de dépense créée une fois « payée ».
type ChargeKey = 'taxe' | 'assurance' | 'cfe'
const CHARGE_DEFS: { key: ChargeKey; label: string; field: string; category: string; onlyLmnp?: boolean }[] = [
  { key: 'taxe', label: 'Taxe foncière', field: 'property_tax', category: 'taxe' },
  { key: 'assurance', label: 'Assurance PNO', field: 'insurance_annual', category: 'assurance' },
  { key: 'cfe', label: 'CFE (LMNP)', field: 'cfe_annuelle', category: 'cfe', onlyLmnp: true },
]

// Catégorie des charges annuelles ajoutées manuellement (hors prédéfinies).
const CUSTOM_CATEGORY = 'charge_annuelle'

export default function ChargesAnnuellesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [properties, setProperties] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  // Ligne en cours de saisie : `${propId}:${key}` → { libelle, amount, date, category, expenseId }
  const [editing, setEditing] = useState<Record<string, { libelle: string; amount: string; date: string; category: string; expenseId: string | null }>>({})

  const load = async () => {
    const { data: props } = await supabase
      .from('properties')
      .select('id, name, type, property_tax, insurance_annual, cfe_annuelle, leases(is_active, start_date, end_date, tenant_name, parsed_data)')
      .order('name')
    const ids = (props ?? []).map(p => p.id)
    const { data: exp } = ids.length
      ? await supabase.from('expenses').select('id, property_id, category, amount, date, description').in('property_id', ids)
      : { data: [] as any[] }
    setProperties(props ?? [])
    setExpenses(exp ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const recordedFor = (propId: string, category: string) =>
    expenses.find(e => e.property_id === propId && categorieDepense(e) === category && new Date(e.date).getFullYear() === year)

  const chargesOf = (prop: any) =>
    CHARGE_DEFS
      .filter(d => (!d.onlyLmnp || prop.type === 'lmnp'))
      .map(d => ({ ...d, montant: Number(prop[d.field]) || 0 }))
      .filter(d => d.montant > 0 || !d.onlyLmnp || prop.type === 'lmnp')

  // Charges personnalisées d'un bien pour l'année (hors taxe/assurance/CFE).
  // Répartition propriétaire / locataire de la taxe foncière (clauses du bail) — reprise telle quelle dans la fiscalité
  const hintTaxe = (prop: any, rec: any) => {
    const brut = Number(rec?.amount ?? prop.property_tax) || 0
    const baux = (prop.leases ?? []).filter((l: any) => (!l.start_date || new Date(l.start_date) <= new Date(year, 11, 31)) && (!l.end_date || new Date(l.end_date) >= new Date(year, 0, 1)))
    let teom = 0, tfClause = false
    for (const l of baux) {
      const pd = l.parsed_data ?? {}
      if (pd.teom_refacturee) teom += Number(pd.teom_montant || 0) * moisOccupes(l.start_date, l.end_date, year) / 12
      if (prop.type === 'commerce' && pd.taxe_fonciere_refacturee) tfClause = true
    }
    const refact = tfClause ? brut : Math.min(brut, teom)
    return (
      <p className="text-xs mt-0.5" style={{ color: refact > 0 ? '#B45309' : '#64748B' }}>
        {tfClause ? `Bail commercial : taxe refacturée au locataire (${formatCurrency(brut)}) — non déductible pour vous.`
          : refact > 0 ? `Dont TEOM refacturée au locataire : ${formatCurrency(refact)} (non déductible) → déductible pour vous : ${formatCurrency(Math.max(0, brut - refact))}.`
          : baux.length === 0 ? 'Aucun bail sur l\'année : taxe entièrement à votre charge (déductible).'
          : prop.type === 'commerce' ? 'Aucune clause de refacturation dans le bail : taxe entièrement déductible.'
          : 'Taxe foncière non refacturable en habitation, sauf TEOM (à activer dans les clauses fiscales du bail) : entièrement déductible.'}
      </p>
    )
  }

  const customChargesOf = (propId: string) =>
    expenses.filter(e => e.property_id === propId && e.category === CUSTOM_CATEGORY && !['taxe', 'assurance', 'cfe'].includes(categorieDepense(e)) && new Date(e.date).getFullYear() === year)

  // Ouvre le formulaire pour une charge prédéfinie non encore saisie.
  const openEdit = (propId: string, def: typeof CHARGE_DEFS[number], montant: number) => {
    setEditing(e => ({ ...e, [`${propId}:${def.key}`]: {
      libelle: `${def.label} ${year}`, amount: String(montant || ''), date: `${year}-10-15`, category: def.category, expenseId: null,
    } }))
  }

  // Ouvre le formulaire d'ajout d'une charge personnalisée.
  const openAddCharge = (propId: string) => {
    setEditing(e => ({ ...e, [`${propId}:new`]: {
      libelle: '', amount: '', date: `${year}-10-15`, category: CUSTOM_CATEGORY, expenseId: null,
    } }))
  }

  // Ouvre le formulaire sur une charge déjà enregistrée, pour la modifier.
  const openEditRecorded = (propId: string, key: string, rec: any) => {
    setEditing(e => ({ ...e, [`${propId}:${key}`]: {
      libelle: rec.description ?? '', amount: String(rec.amount ?? ''), date: rec.date ?? `${year}-10-15`, category: rec.category, expenseId: rec.id,
    } }))
  }

  const closeEdit = (id: string) => setEditing(e => { const n = { ...e }; delete n[id]; return n })

  const saveCharge = async (propId: string, id: string) => {
    const form = editing[id]
    if (!form?.date) { toast.error('Indiquez la date de paiement'); return }
    if (!form.libelle?.trim()) { toast.error('Indiquez un libellé'); return }
    setSaving(id)
    const payload = {
      property_id: propId,
      amount: Number(form.amount) || 0,
      category: form.category,
      description: form.libelle.trim(),
      date: form.date,
      fiscal_deductible: true,
    }
    const { error } = form.expenseId
      ? await supabase.from('expenses').update(payload).eq('id', form.expenseId)
      : await supabase.from('expenses').insert(payload)
    setSaving(null)
    if (error) { toast.error(error.message); return }
    toast.success(form.expenseId ? 'Charge mise à jour' : 'Charge enregistrée')
    closeEdit(id)
    load()
  }

  const supprimer = async (id: string, expenseId: string) => {
    setSaving(id)
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    setSaving(null)
    if (error) { toast.error(error.message); return }
    toast.success('Charge supprimée')
    closeEdit(id)
    load()
  }

  // Formulaire réutilisé par les charges prédéfinies, perso et l'ajout.
  const renderForm = (propId: string, id: string) => {
    const form = editing[id]
    if (!form) return null
    return (
      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Libellé</label>
          <input type="text" value={form.libelle} placeholder="Ex. Ordures ménagères"
            onChange={e => setEditing(s => ({ ...s, [id]: { ...s[id], libelle: e.target.value } }))}
            className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[#0F172A] text-sm focus:outline-none" />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Montant payé (€)</label>
            <input type="number" value={form.amount}
              onChange={e => setEditing(s => ({ ...s, [id]: { ...s[id], amount: e.target.value } }))}
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[#0F172A] text-sm focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Date de paiement</label>
            <input type="date" value={form.date}
              onChange={e => setEditing(s => ({ ...s, [id]: { ...s[id], date: e.target.value } }))}
              className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-[#0F172A] text-sm focus:outline-none" />
          </div>
          <button onClick={() => saveCharge(propId, id)} disabled={saving === id}
            className="h-9 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {saving === id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
          </button>
          <button onClick={() => closeEdit(id)}
            className="h-9 px-3 rounded-lg border border-white/[0.08] text-slate-400 text-sm">Annuler</button>
        </div>
        {form.expenseId && (
          <button onClick={() => supprimer(id, form.expenseId!)}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
            <Trash2 className="h-3.5 w-3.5" /> Supprimer cette charge
          </button>
        )}
      </div>
    )
  }

  const totalASaisir = properties.reduce((s, p) =>
    s + chargesOf(p).filter(d => !recordedFor(p.id, d.category)).length, 0)

  if (loading) return (
    <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BackButton />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-400" /> Charges annuelles
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Taxe foncière, assurance PNO, CFE — à enregistrer quand l'avis arrive. Elles alimentent directement votre fiscalité : la TEOM refacturée au locataire est déduite automatiquement, et les appels de fonds du syndic (« syndic », « copro ») sont reconnus comme provisions de copropriété, dont la part récupérable se régularise l'année suivante.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {[CURRENT_YEAR, CURRENT_YEAR - 1].map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-4 h-9 rounded-lg text-sm font-semibold transition-all ${
                y === year ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-400/5 border border-blue-400/20">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          {totalASaisir > 0
            ? <><strong className="text-blue-400">{totalASaisir} charge{totalASaisir > 1 ? 's' : ''} à saisir</strong> pour {year}. Le montant connu est pré-rempli — vérifiez-le sur votre avis et confirmez la date de paiement.</>
            : <>Toutes les charges annuelles connues sont enregistrées pour {year}. ✓</>}
        </p>
      </div>

      {properties.map(prop => {
        const charges = chargesOf(prop)
        const customCharges = customChargesOf(prop.id)
        const newId = `${prop.id}:new`
        return (
          <GlassCard key={prop.id} className="p-5">
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">{prop.name}</h2>
            <div className="space-y-2">
              {/* Charges prédéfinies (taxe foncière, assurance, CFE) */}
              {charges.map(def => {
                const rec = recordedFor(prop.id, def.category)
                const id = `${prop.id}:${def.key}`
                const form = editing[id]
                return (
                  <div key={def.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{def.label}</p>
                        {def.key === 'taxe' && hintTaxe(prop, rec)}
                        {def.key === 'assurance' && <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Assurance propriétaire (PNO) : à votre charge, entièrement déductible (non refacturable au locataire).</p>}
                        {def.key === 'cfe' && <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>CFE : déductible en location meublée (exonération possible la 1re année).</p>}
                        <p className="text-xs text-slate-500">{def.montant > 0 ? `Montant connu : ${formatCurrency(def.montant)}` : 'Montant non renseigné sur la fiche du bien — saisissez celui de votre avis'}</p>
                      </div>
                      {form ? null : rec ? (
                        <button onClick={() => openEditRecorded(prop.id, def.key, rec)}
                          className="flex items-center gap-2 text-sm text-[var(--success)] hover:opacity-80 transition-opacity" title="Modifier">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{rec.description || 'Payée'} · {formatCurrency(rec.amount)} le {new Date(rec.date).toLocaleDateString('fr-FR')}</span>
                          <Pencil className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      ) : (
                        <button onClick={() => openEdit(prop.id, def, def.montant)}
                          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-500 text-sm font-semibold hover:bg-amber-400/20 transition-colors">
                          <Calendar className="h-3.5 w-3.5" /> Modifier et valider
                        </button>
                      )}
                    </div>
                    {renderForm(prop.id, id)}
                  </div>
                )
              })}

              {/* Charges personnalisées ajoutées manuellement */}
              {customCharges.map((rec: any) => {
                const id = `${prop.id}:custom:${rec.id}`
                const form = editing[id]
                return (
                  <div key={rec.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{rec.description || 'Charge personnalisée'}</p>
                      {!form && (
                        <button onClick={() => openEditRecorded(prop.id, `custom:${rec.id}`, rec)}
                          className="flex items-center gap-2 text-sm text-[var(--success)] hover:opacity-80 transition-opacity" title="Modifier">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{rec.description || 'Charge'} · {formatCurrency(rec.amount)} le {new Date(rec.date).toLocaleDateString('fr-FR')}</span>
                          <Pencil className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                    {renderForm(prop.id, id)}
                  </div>
                )
              })}

              {/* Ajout d'une charge personnalisée */}
              {editing[newId] ? (
                <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Nouvelle charge</p>
                  {renderForm(prop.id, newId)}
                </div>
              ) : (
                <button onClick={() => openAddCharge(prop.id)}
                  className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-white/[0.12] text-sm text-slate-400 hover:text-slate-200 hover:border-white/25 transition-colors">
                  <Plus className="h-4 w-4" /> Ajouter une charge
                </button>
              )}
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}
