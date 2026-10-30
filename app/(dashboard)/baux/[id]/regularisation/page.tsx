'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ChevronLeft, Copy, CheckCircle, Upload, Plus, X, Loader2,
  Eye, TrendingDown, TrendingUp, History, Settings
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface LigneCharge { libelle: string; montant: string }
interface RegEntry { lignes: LigneCharge[]; doc_url?: string; total: number; provisions: number; solde: number; saved_at: string }

const CURRENT_YEAR = new Date().getFullYear()

export default function RegularisationPage() {
  const { id } = useParams<{ id: string }>()
  const [lease, setLease] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'historique' | 'saisie' | 'perso'>('historique')

  const [chargesType, setChargesType] = useState('provision')
  const [annee, setAnnee] = useState(String(CURRENT_YEAR - 1))

  // Historique par année
  const [history, setHistory] = useState<Record<string, RegEntry>>({})

  // Saisie en cours
  const [lignes, setLignes] = useState<LigneCharge[]>([{ libelle: '', montant: '' }])
  const [docUrl, setDocUrl] = useState<string | null>(null)

  // Charges personnalisées
  const [chargesPerso, setChargesPerso] = useState<LigneCharge[]>([])

  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase.from('leases')
      .select('*, property:properties(name, address, city)')
      .eq('id', id).single()
    if (!data) return
    setLease(data)
    setChargesType(data.charges_type ?? 'provision')
    const pd = data.parsed_data ?? {}
    if (pd.regularisation_history) setHistory(pd.regularisation_history)
    if (pd.charges_perso) setChargesPerso(pd.charges_perso)
    // Pré-charger l'année sélectionnée si elle existe
    const entry = pd.regularisation_history?.[annee]
    if (entry) {
      setLignes(entry.lignes?.length ? entry.lignes : [{ libelle: '', montant: '' }])
      setDocUrl(entry.doc_url ?? null)
    }
  }

  useEffect(() => { load() }, [id])

  // Quand on change d'année → charger les données de cette année si elles existent
  useEffect(() => {
    const entry = history[annee]
    if (entry) {
      setLignes(entry.lignes?.length ? entry.lignes : [{ libelle: '', montant: '' }])
      setDocUrl(entry.doc_url ?? null)
    } else {
      setLignes([{ libelle: '', montant: '' }])
      setDocUrl(null)
    }
  }, [annee])

  const charges_mensuelles = lease?.charges ?? 0
  const provisions = charges_mensuelles * 12
  const charges_reelles = lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0)
  const solde = provisions - charges_reelles
  const totalChargesPerso = chargesPerso.reduce((s, l) => s + (Number(l.montant) || 0), 0)

  const uploadDoc = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('lease_id', id)
    fd.append('category', `copro_regularisation_${annee}`)
    const res = await fetch('/api/baux/upload-doc', { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)
    if (res.ok) { setDocUrl(json.url); toast.success('Document enregistré') }
    else toast.error(json.error ?? 'Erreur upload')
  }

  const handleSave = async () => {
    if (charges_reelles === 0 && tab === 'saisie') { toast.error('Saisissez au moins une charge'); return }
    setSaving(true)
    const pd = lease?.parsed_data ?? {}

    const newEntry: RegEntry = {
      lignes,
      doc_url: docUrl ?? undefined,
      total: charges_reelles,
      provisions,
      solde,
      saved_at: new Date().toISOString(),
    }

    const newHistory = { ...history, [annee]: newEntry }
    await supabase.from('leases').update({
      charges_type: chargesType,
      parsed_data: {
        ...pd,
        regularisation_history: newHistory,
        charges_perso: chargesPerso,
      },
    } as any).eq('id', id)

    setHistory(newHistory)
    setSaving(false)
    toast.success(`Régularisation ${annee} enregistrée`)
    setTab('historique')
  }

  const handleSavePerso = async () => {
    setSaving(true)
    const pd = lease?.parsed_data ?? {}
    await supabase.from('leases').update({
      charges_type: chargesType,
      parsed_data: { ...pd, charges_perso: chargesPerso, regularisation_history: history },
    } as any).eq('id', id)
    setSaving(false)
    toast.success('Charges personnalisées enregistrées')
  }

  const genCourrier = () => {
    const today = format(new Date(), 'd MMMM yyyy', { locale: fr })
    const adresse = lease?.property ? [lease.property.address, lease.property.city].filter(Boolean).join(', ') : '[adresse]'
    const detail = lignes.filter(l => l.libelle && l.montant).map(l =>
      `  ${l.libelle.padEnd(40)} ${formatCurrency(Number(l.montant))}`
    ).join('\n')
    return `[Votre nom et adresse]

Le ${today}

${lease?.tenant_name ?? '[Locataire]'}
${adresse}

Objet : Régularisation des charges — ${adresse} — Année ${annee}

Madame, Monsieur,

Conformément à l'article 23 de la loi du 6 juillet 1989, je vous adresse le décompte de régularisation annuelle des charges.

DÉCOMPTE DE RÉGULARISATION ${annee}
────────────────────────────────────────
${detail ? `DÉTAIL DES CHARGES RÉELLES :\n${detail}\n\n` : ''}Charges réelles totales :             ${formatCurrency(charges_reelles)}
Provisions versées (${charges_mensuelles}€ × 12 mois) :  ${formatCurrency(provisions)}
────────────────────────────────────────
${solde >= 0
  ? `SOLDE EN VOTRE FAVEUR : ${formatCurrency(solde)}\nCe montant sera déduit de votre prochaine échéance.`
  : `COMPLÉMENT À VOTRE CHARGE : ${formatCurrency(Math.abs(solde))}\nCe montant est exigible à la prochaine échéance de loyer.`}

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.
[Signature]`
  }

  const updateLigne = (i: number, f: 'libelle' | 'montant', v: string) => {
    const n = [...lignes]; n[i] = { ...n[i], [f]: v }; setLignes(n)
  }
  const updatePerso = (i: number, f: 'libelle' | 'montant', v: string) => {
    const n = [...chargesPerso]; n[i] = { ...n[i], [f]: v }; setChargesPerso(n)
  }

  if (!lease) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  )

  const historyEntries = Object.entries(history).sort((a, b) => Number(b[0]) - Number(a[0]))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/baux/${id}`} className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <ChevronLeft className="h-4 w-4" /> {lease?.tenant_name}
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Régularisation des charges</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {[
          { key: 'historique', label: 'Historique', icon: <History className="h-3.5 w-3.5" /> },
          { key: 'saisie', label: 'Nouvelle régularisation', icon: <Plus className="h-3.5 w-3.5" /> },
          { key: 'perso', label: 'Charges personnalisées', icon: <Settings className="h-3.5 w-3.5" /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
              : { color: 'var(--text-tertiary)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── ONGLET HISTORIQUE ── */}
      {tab === 'historique' && (
        <div className="space-y-4">
          {/* Résumé charges mensuelles */}
          <GlassCard>
            <h2 className="font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Charges du bail</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Type</p>
                <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{chargesType}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Provisions mensuelles</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(charges_mensuelles)}/mois</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Provisions annuelles</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(charges_mensuelles * 12)}/an</p>
              </div>
            </div>
            {chargesPerso.length > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Charges personnalisées</p>
                <div className="space-y-1">
                  {chargesPerso.filter(l => l.libelle).map((l, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>{l.libelle}</span>
                      <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(l.montant) || 0)}/mois</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1" style={{ borderColor: 'var(--border)', color: '#1D4ED8' }}>
                    <span>Total mensuel CC</span>
                    <span>{formatCurrency((lease.monthly_rent ?? 0) + totalChargesPerso)}</span>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Historique régularisations */}
          {historyEntries.length === 0 ? (
            <GlassCard>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <History className="h-10 w-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Aucune régularisation</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Saisissez le décompte annuel de la copropriété pour calculer le surplus à appeler
                </p>
                <button onClick={() => setTab('saisie')}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#1D4ED8' }}>
                  <Plus className="h-4 w-4" /> Nouvelle régularisation
                </button>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {historyEntries.map(([yr, entry]) => {
                const surplus = entry.solde < 0
                return (
                  <GlassCard key={yr}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm"
                          style={{ background: surplus ? 'rgba(220,38,38,0.1)' : 'rgba(5,150,105,0.1)', color: surplus ? '#DC2626' : '#059669' }}>
                          {yr}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Régularisation {yr}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Enregistré le {format(new Date(entry.saved_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.doc_url && (
                          <a href={entry.doc_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium border"
                            style={{ borderColor: 'var(--border)', color: '#1D4ED8', background: '#EFF6FF' }}>
                            <Eye className="h-3.5 w-3.5" /> Document
                          </a>
                        )}
                        <button onClick={() => { setAnnee(yr); setTab('saisie') }}
                          className="h-8 px-3 rounded-lg text-xs font-medium border transition-all"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                          Modifier
                        </button>
                      </div>
                    </div>

                    {/* Chiffres clés */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Provisions versées</p>
                        <p className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(entry.provisions)}</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Charges réelles</p>
                        <p className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(entry.total)}</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{
                        background: surplus ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.06)',
                        border: `1px solid ${surplus ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}`,
                      }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          {surplus ? 'À appeler' : 'À rembourser'}
                        </p>
                        <div className="flex items-center gap-1">
                          {surplus
                            ? <TrendingUp className="h-4 w-4" style={{ color: '#DC2626' }} />
                            : <TrendingDown className="h-4 w-4" style={{ color: '#059669' }} />}
                          <p className="text-base font-bold font-mono" style={{ color: surplus ? '#DC2626' : '#059669' }}>
                            {formatCurrency(Math.abs(entry.solde))}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Détail lignes */}
                    {entry.lignes?.filter(l => l.libelle).length > 0 && (
                      <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>Détail charges réelles</p>
                        <div className="space-y-1">
                          {entry.lignes.filter(l => l.libelle).map((l, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span style={{ color: 'var(--text-secondary)' }}>{l.libelle}</span>
                              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(Number(l.montant) || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                )
              })}
              <button onClick={() => setTab('saisie')}
                className="w-full h-10 rounded-xl border text-sm font-medium transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                <Plus className="h-4 w-4 inline mr-2" />Ajouter une régularisation
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET SAISIE ── */}
      {tab === 'saisie' && (
        <GlassCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                {history[annee] ? `Modifier la régularisation ${annee}` : 'Nouvelle régularisation'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Provisions mensuelles : {formatCurrency(charges_mensuelles)}/mois → {formatCurrency(charges_mensuelles * 12)}/an
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Année</label>
              <select value={annee} onChange={e => setAnnee(e.target.value)}
                className="h-9 px-3 rounded-lg text-sm focus:outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i).map(y => (
                  <option key={y} value={y}>{y}{history[y] ? ' ✓' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload document */}
          <div className="p-4 rounded-xl mb-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Document syndic {annee}</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Importez le décompte annuel de copropriété envoyé par le syndic
            </p>
            {docUrl ? (
              <div className="flex items-center gap-3">
                <a href={docUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium border"
                  style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
                  <Eye className="h-3.5 w-3.5" /> Voir le document
                </a>
                <button onClick={() => inputRef.current?.click()} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Remplacer
                </button>
              </div>
            ) : (
              <button onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-medium transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Envoi…' : 'Importer le document'}
              </button>
            )}
            <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => { if (e.target.files?.[0]) { uploadDoc(e.target.files[0]); e.target.value = '' } }} />
          </div>

          {/* Saisie lignes */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Détail des charges réelles {annee}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Recopiez les lignes du document syndic</p>
            </div>
            <div className="space-y-2">
              {lignes.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" placeholder="Ex: Entretien parties communes, Eau, Gardien…"
                    value={l.libelle} onChange={e => updateLigne(i, 'libelle', e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  <input type="number" placeholder="0 €" step="0.01"
                    value={l.montant} onChange={e => updateLigne(i, 'montant', e.target.value)}
                    className="w-28 h-9 px-3 rounded-lg text-sm text-right font-mono focus:outline-none"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  <button onClick={() => setLignes(ls => ls.filter((_, j) => j !== i))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all">
                    <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setLignes(ls => [...ls, { libelle: '', montant: '' }])}
              className="mt-2 flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
            </button>
          </div>

          {/* Récap calcul */}
          {charges_reelles > 0 && (
            <div className="p-4 rounded-xl border mb-5"
              style={{
                background: solde >= 0 ? 'rgba(5,150,105,0.05)' : 'rgba(220,38,38,0.05)',
                borderColor: solde >= 0 ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)',
              }}>
              <div className="flex justify-between text-sm mb-1.5">
                <span style={{ color: 'var(--text-secondary)' }}>Provisions versées ({charges_mensuelles}€ × 12)</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(provisions)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1.5">
                <span style={{ color: 'var(--text-secondary)' }}>Charges réelles {annee}</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(charges_reelles)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2"
                style={{ borderColor: solde >= 0 ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', color: solde >= 0 ? '#059669' : '#DC2626' }}>
                <span>{solde >= 0 ? '✓ À rembourser au locataire' : '⚠ Surplus à appeler au locataire'}</span>
                <span>{formatCurrency(Math.abs(solde))}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || charges_reelles === 0}
              className="flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#1D4ED8' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Enregistrer la régularisation {annee}
            </button>
            <button onClick={() => {
              if (charges_reelles === 0) return
              navigator.clipboard.writeText(genCourrier())
              setCopied(true)
              toast.success('Courrier copié !')
              setTimeout(() => setCopied(false), 2500)
            }} disabled={charges_reelles === 0}
              className="flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-medium disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié !' : 'Générer courrier'}
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── ONGLET CHARGES PERSO ── */}
      {tab === 'perso' && (
        <GlassCard>
          <div className="mb-4">
            <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Charges personnalisées</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Lignes de charges spécifiques à ce bail — parking, gardien, eau individuelle, etc.
            </p>
          </div>

          <div className="space-y-2 mb-3">
            {chargesPerso.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" placeholder="Ex: Parking, Taxe ordures, Eau froide…"
                  value={l.libelle} onChange={e => updatePerso(i, 'libelle', e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <input type="number" placeholder="€/mois" step="0.01"
                  value={l.montant} onChange={e => updatePerso(i, 'montant', e.target.value)}
                  className="w-28 h-9 px-3 rounded-lg text-sm text-right font-mono focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <button onClick={() => setChargesPerso(ls => ls.filter((_, j) => j !== i))}
                  className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-50">
                  <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ))}
            {chargesPerso.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Aucune charge personnalisée</p>
            )}
          </div>

          <button onClick={() => setChargesPerso(ls => [...ls, { libelle: '', montant: '' }])}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium mb-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une charge
          </button>

          {totalChargesPerso > 0 && (
            <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(29,78,216,0.05)', border: '1px solid rgba(29,78,216,0.15)' }}>
              <div className="flex justify-between text-sm mb-1"><span style={{ color: 'var(--text-secondary)' }}>Loyer HC</span><span style={{ color: 'var(--text-primary)' }}>{formatCurrency(lease.monthly_rent)}</span></div>
              <div className="flex justify-between text-sm mb-1"><span style={{ color: 'var(--text-secondary)' }}>Charges copropriété</span><span style={{ color: 'var(--text-primary)' }}>{formatCurrency(charges_mensuelles)}</span></div>
              <div className="flex justify-between text-sm mb-1"><span style={{ color: 'var(--text-secondary)' }}>Charges personnalisées</span><span style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalChargesPerso)}</span></div>
              <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1" style={{ borderColor: 'rgba(29,78,216,0.2)', color: '#1D4ED8' }}>
                <span>Total mensuel</span>
                <span>{formatCurrency((lease.monthly_rent ?? 0) + charges_mensuelles + totalChargesPerso)}</span>
              </div>
            </div>
          )}

          <button onClick={handleSavePerso} disabled={saving}
            className="flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#1D4ED8' }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Enregistrer
          </button>
        </GlassCard>
      )}
    </div>
  )

}
