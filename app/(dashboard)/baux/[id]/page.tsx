'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Shield, AlertTriangle, CheckCircle2, X, Copy, ChevronLeft,
  Upload, FileText, Phone, Mail, User, Calendar, Euro,
  ReceiptText, RefreshCw, BarChart2, UserPlus, LogOut, TrendingUp
} from 'lucide-react'
import {
  getStatutDepotGarantie, getStatutAssurance, getStatutReconduction
} from '@/lib/bail'
import Link from 'next/link'
import { TabNav } from '@/components/ui/TabNav'
import { RevisionModal } from '@/components/loyers/RevisionModal'
import { IRL_CURRENT, ILC_CURRENT, ILAT_CURRENT, getQuarterLabel, calculateRevisionLoyer } from '@/lib/fiscal/indices'

const ASSURANCE_CONFIG = {
  valide: { label: 'Valide', color: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]', border: 'border-[var(--success)/20]' },
  expire_bientot: { label: 'Expire bientôt', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  expiree: { label: 'Expirée', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  manquante: { label: 'Manquante', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
}

export default function BailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [lease, setLease] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDGForm, setShowDGForm] = useState(false)
  const [showGarantForm, setShowGarantForm] = useState(false)
  const [showAssuranceForm, setShowAssuranceForm] = useState(false)
  const [showCourrier, setShowCourrier] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [saving, setSaving] = useState(false)

  const [dgForm, setDgForm] = useState({
    etat_lieux_sortie_date: '',
    avec_reserves: false,
    depot_garantie_montant_retenu: '0',
    depot_garantie_motif_retenu: '',
    depot_garantie_restitue_le: '',
  })

  const [garantForm, setGarantForm] = useState({
    garant_nom: '', garant_prenom: '', garant_adresse: '',
    garant_telephone: '', garant_email: '', garant_lien: '',
    caution_type: 'solidaire',
  })

  const [assuranceForm, setAssuranceForm] = useState({
    assurance_locataire_compagnie: '',
    assurance_locataire_expiration: '',
  })

  const [showRelocation, setShowRelocation] = useState(false)
  const [reloc, setReloc] = useState({
    end_date: new Date().toISOString().slice(0, 10),
    etat_lieux_sortie_date: '',
    tenant_name: '', tenant_email: '', tenant_phone: '',
    start_date: '', monthly_rent: '', charges: '', deposit: '',
  })

  const load = async () => {
    const { data } = await supabase
      .from('leases')
      .select('*, property:properties(name, address, city, type, indice_revision)')
      .eq('id', id)
      .single()
    setLease(data)
    if (data) {
      setGarantForm({
        garant_nom: data.garant_nom ?? '',
        garant_prenom: data.garant_prenom ?? '',
        garant_adresse: data.garant_adresse ?? '',
        garant_telephone: data.garant_telephone ?? '',
        garant_email: data.garant_email ?? '',
        garant_lien: data.garant_lien ?? '',
        caution_type: data.caution_type ?? 'solidaire',
      })
      setAssuranceForm({
        assurance_locataire_compagnie: data.assurance_locataire_compagnie ?? '',
        assurance_locataire_expiration: data.assurance_locataire_expiration ?? '',
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const saveDG = async () => {
    setSaving(true)
    const dateLimite = dgForm.etat_lieux_sortie_date
      ? addMonths(new Date(dgForm.etat_lieux_sortie_date), dgForm.avec_reserves ? 2 : 1)
      : null
    await supabase.from('leases').update({
      etat_lieux_sortie_date: dgForm.etat_lieux_sortie_date || null,
      depot_garantie_montant_retenu: Number(dgForm.depot_garantie_montant_retenu) || 0,
      depot_garantie_motif_retenu: dgForm.depot_garantie_motif_retenu || null,
      depot_garantie_restitue_le: dgForm.depot_garantie_restitue_le || null,
    }).eq('id', id)
    setSaving(false)
    toast.success('Dépôt de garantie mis à jour')
    setShowDGForm(false)
    load()
  }

  const saveGarant = async () => {
    setSaving(true)
    await supabase.from('leases').update(garantForm).eq('id', id)
    setSaving(false)
    toast.success('Garant enregistré')
    setShowGarantForm(false)
    load()
  }

  const saveAssurance = async () => {
    setSaving(true)
    await supabase.from('leases').update(assuranceForm).eq('id', id)
    setSaving(false)
    toast.success('Assurance mise à jour')
    setShowAssuranceForm(false)
    load()
  }

  const openRelocation = () => {
    setReloc(r => ({
      ...r,
      monthly_rent: String(lease.monthly_rent ?? ''),
      charges: String(lease.charges ?? ''),
      deposit: String(lease.deposit ?? ''),
      start_date: r.end_date,
    }))
    setShowRelocation(true)
  }

  const relouer = async () => {
    if (!reloc.tenant_name.trim()) { toast.error('Indiquez le nom du nouveau locataire'); return }
    if (!reloc.start_date) { toast.error("Indiquez la date d'entrée du nouveau locataire"); return }
    setSaving(true)
    // 1. Clôturer le bail actuel
    const { error: e1 } = await supabase.from('leases').update({
      is_active: false,
      end_date: reloc.end_date || null,
      etat_lieux_sortie_date: reloc.etat_lieux_sortie_date || null,
      appel_loyer_actif: false,
    }).eq('id', id)
    if (e1) { setSaving(false); toast.error('Erreur clôture : ' + e1.message); return }
    // 2. Créer le nouveau bail sur le même bien
    const { data: created, error: e2 } = await supabase.from('leases').insert({
      property_id: lease.property_id,
      tenant_name: reloc.tenant_name.trim(),
      tenant_email: reloc.tenant_email || null,
      tenant_phone: reloc.tenant_phone || null,
      monthly_rent: Number(reloc.monthly_rent) || 0,
      charges: Number(reloc.charges) || 0,
      deposit: Number(reloc.deposit) || 0,
      start_date: reloc.start_date,
      is_active: true,
      appel_loyer_actif: true,
      notice_months: lease.notice_months ?? null,
      indexation_index: lease.indexation_index ?? null,
    }).select('id').single()
    setSaving(false)
    if (e2) { toast.error('Erreur création : ' + e2.message); return }
    toast.success('Bail clôturé · nouveau locataire créé')
    router.push(`/baux/${created.id}`)
  }

  const genCourrierDG = () => {
    if (!lease) return ''
    const montantRestitue = (lease.deposit || 0) - (lease.depot_garantie_montant_retenu || 0)
    return `[Votre nom et adresse]

Le ${format(new Date(), 'd MMMM yyyy', { locale: fr })}

${lease.tenant_name}
[Adresse du locataire]

Objet : Restitution du dépôt de garantie — ${lease.property?.name ?? lease.property?.address}

Madame, Monsieur,

Suite à la restitution des clés en date du ${lease.etat_lieux_sortie_date ? format(new Date(lease.etat_lieux_sortie_date), 'dd MMMM yyyy', { locale: fr }) : '[date]'}, et conformément à l'article 22 de la loi du 6 juillet 1989, nous vous adressons le décompte de restitution du dépôt de garantie.

Dépôt de garantie versé : ${formatCurrency(lease.deposit || 0)}
${lease.depot_garantie_montant_retenu > 0
  ? `Retenue : -${formatCurrency(lease.depot_garantie_montant_retenu)}\nMotif : ${lease.depot_garantie_motif_retenu || '[motif]'}`
  : 'Aucune retenue'
}

MONTANT RESTITUÉ : ${formatCurrency(montantRestitue)}

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

[Signature]`
  }

  if (loading) return <div className="max-w-4xl mx-auto"><div className="h-48 rounded-xl bg-white/[0.03] animate-pulse" /></div>
  if (!lease) return <div className="max-w-4xl mx-auto text-center py-16 text-slate-400">Bail introuvable</div>

  const dgStatut = getStatutDepotGarantie(lease)
  const assuranceStatut = getStatutAssurance(lease.assurance_locataire_expiration)
  const assuranceCfg = ASSURANCE_CONFIG[assuranceStatut]
  const reconduction = getStatutReconduction(lease)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/baux" className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'var(--text-tertiary)' }}>
        <ChevronLeft className="h-4 w-4" /> Retour aux baux
      </Link>

      <TabNav tabs={[
        { href: `/baux/${id}`, label: 'Bail & garanties', icon: 'Shield' },
        { href: `/baux/${id}/compte-locataire`, label: 'Relevé de compte', icon: 'BarChart2' },
        { href: `/baux/${id}/regularisation`, label: 'Régularisation charges', icon: 'RefreshCw' },
        { href: `/baux/${id}/changement`, label: 'Changement locataire', icon: 'UserPlus' },
      ]} />

      {/* Header */}
      <GlassCard className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">{lease.tenant_name}</h1>
            <p className="text-slate-400 text-sm">{lease.property?.name} · {lease.property?.city}</p>
            <p className="text-[var(--text-primary)] font-semibold mt-1">
              {formatCurrency(lease.monthly_rent)}/mois HC
              {lease.charges > 0 && (
                <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                  + {formatCurrency(lease.charges)} charges → {formatCurrency((lease.monthly_rent ?? 0) + (lease.charges ?? 0))} CC
                </span>
              )}
            </p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>Début : {format(new Date(lease.start_date), 'dd/MM/yyyy')}</p>
            {lease.end_date && <p>Fin : {format(new Date(lease.end_date), 'dd/MM/yyyy')}</p>}
          </div>
        </div>
        {reconduction.statut === 'alerte' && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-sm text-amber-300">{reconduction.message}</p>
          </div>
        )}
        {reconduction.statut === 'urgent' && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-red-400/5 border border-red-400/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-sm text-red-300">{reconduction.message}</p>
          </div>
        )}
      </GlassCard>

      {/* Bloc révision IRL */}
      {lease.is_active && lease.irl_reference_valeur && (() => {
        const indice = (lease.irl_reference_indice ?? lease.indexation_index ?? 'irl') as 'irl' | 'ilc' | 'ilat'
        const nouvelIndice = indice === 'ilc' ? ILC_CURRENT : indice === 'ilat' ? ILAT_CURRENT : IRL_CURRENT
        const calcul = calculateRevisionLoyer({
          loyer_actuel: lease.monthly_rent,
          indice_reference: lease.irl_reference_valeur,
          indice_nouveau: nouvelIndice,
        })
        const variation = calcul.nouveau_loyer - lease.monthly_rent
        const dejaPrisEnCompte = Math.abs(lease.monthly_rent - calcul.nouveau_loyer) < 0.5
        return (
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <TrendingUp className="h-4 w-4 text-green-400" /> Révision {indice.toUpperCase()}
              </h2>
              {!dejaPrisEnCompte && (
                <button onClick={() => setShowRevision(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white"
                  style={{ background: '#059669' }}>
                  <TrendingUp className="h-3.5 w-3.5" /> Appliquer la révision
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Indice référence</p>
                <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{lease.irl_reference_valeur}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>T{lease.irl_reference_trimestre} {lease.irl_reference_annee}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Indice actuel</p>
                <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{nouvelIndice}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{getQuarterLabel()}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Loyer révisé</p>
                <p className="text-sm font-mono font-semibold" style={{ color: '#059669' }}>{formatCurrency(calcul.nouveau_loyer)}</p>
                <p className="text-xs" style={{ color: '#059669' }}>+{formatCurrency(variation)} (+{calcul.variation_pct}%)</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: dejaPrisEnCompte ? 'rgba(5,150,105,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${dejaPrisEnCompte ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Statut</p>
                <p className="text-sm font-semibold" style={{ color: dejaPrisEnCompte ? '#059669' : '#F59E0B' }}>
                  {dejaPrisEnCompte ? '✓ À jour' : '⚠ Révision possible'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {dejaPrisEnCompte ? 'Loyer déjà révisé' : `+${formatCurrency(variation)}/mois`}
                </p>
              </div>
            </div>
          </GlassCard>
        )
      })()}

      {/* Dépôt de garantie */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Euro className="h-4 w-4 text-blue-400" /> Dépôt de garantie
          </h2>
          <button onClick={() => setShowDGForm(v => !v)} className="text-xs text-blue-400 hover:text-blue-300">
            {showDGForm ? 'Fermer' : 'Gérer'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Montant DG', value: formatCurrency(lease.deposit || 0), color: 'text-[var(--text-primary)]' },
            { label: 'Montant retenu', value: lease.depot_garantie_montant_retenu > 0 ? formatCurrency(lease.depot_garantie_montant_retenu) : '—', color: 'text-red-400' },
            { label: 'Restitué', value: lease.depot_garantie_montant_retenu > 0 ? formatCurrency((lease.deposit || 0) - (lease.depot_garantie_montant_retenu || 0)) : '—', color: 'text-[var(--success)]' },
            { label: 'Statut', value: dgStatut.message, color: dgStatut.statut === 'restitue' ? 'text-[var(--success)]' : dgStatut.statut === 'urgent' || dgStatut.statut === 'depasse' ? 'text-red-400' : 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-sm font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {lease.etat_lieux_sortie_date && !lease.depot_garantie_restitue_le && (
          <div className="mb-4 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
            <p className="text-xs text-amber-300">⚠️ {dgStatut.message}</p>
          </div>
        )}

        {showDGForm && (
          <div className="space-y-3 pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date état des lieux de sortie</label>
                <input type="date" value={dgForm.etat_lieux_sortie_date}
                  onChange={e => setDgForm(f => ({ ...f, etat_lieux_sortie_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date restitution effective</label>
                <input type="date" value={dgForm.depot_garantie_restitue_le}
                  onChange={e => setDgForm(f => ({ ...f, depot_garantie_restitue_le: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={dgForm.avec_reserves}
                onChange={e => setDgForm(f => ({ ...f, avec_reserves: e.target.checked }))}
                className="rounded border-white/[0.20]" />
              <span className="text-sm text-slate-300">État des lieux avec réserves (délai 2 mois)</span>
            </label>
            {dgForm.etat_lieux_sortie_date && (
              <p className="text-xs text-blue-400">
                Date limite légale : {format(addMonths(new Date(dgForm.etat_lieux_sortie_date), dgForm.avec_reserves ? 2 : 1), 'dd MMMM yyyy', { locale: fr })}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Montant retenu (€)</label>
                <input type="number" value={dgForm.depot_garantie_montant_retenu}
                  onChange={e => setDgForm(f => ({ ...f, depot_garantie_montant_retenu: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Motif de la retenue</label>
                <input type="text" placeholder="Ex: Dégradation peinture" value={dgForm.depot_garantie_motif_retenu}
                  onChange={e => setDgForm(f => ({ ...f, depot_garantie_motif_retenu: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveDG} disabled={saving}
                className="flex-1 h-9 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all disabled:opacity-50">
                Enregistrer
              </button>
              <button onClick={() => {
                const texte = genCourrierDG()
                navigator.clipboard.writeText(texte)
                toast.success('Courrier de restitution copié !')
                setShowCourrier(true)
              }}
                className="flex-1 h-9 rounded-lg bg-bg-secondary border border-border text-slate-300 text-sm hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-2">
                <Copy className="h-3.5 w-3.5" /> Générer courrier restitution
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Garant */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" /> Garant / Caution
          </h2>
          <button onClick={() => setShowGarantForm(v => !v)} className="text-xs text-blue-400 hover:text-blue-300">
            {showGarantForm ? 'Fermer' : lease.garant_nom ? 'Modifier' : 'Ajouter'}
          </button>
        </div>

        {lease.garant_nom ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Garant</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{lease.garant_prenom} {lease.garant_nom}</p>
              <p className="text-xs text-slate-500 mt-0.5">{lease.garant_lien}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Contact</p>
              {lease.garant_telephone && <p className="text-xs text-slate-300 flex items-center gap-1"><Phone className="h-3 w-3" /> {lease.garant_telephone}</p>}
              {lease.garant_email && <p className="text-xs text-slate-300 flex items-center gap-1"><Mail className="h-3 w-3" /> {lease.garant_email}</p>}
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Type de caution</p>
              <p className="text-sm font-medium text-cyan-400 capitalize">{lease.caution_type}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Adresse</p>
              <p className="text-xs text-slate-300">{lease.garant_adresse || '—'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun garant renseigné</p>
        )}

        {showGarantForm && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'garant_nom', label: 'Nom', placeholder: 'Dupont' },
                { key: 'garant_prenom', label: 'Prénom', placeholder: 'Jean' },
                { key: 'garant_telephone', label: 'Téléphone', placeholder: '06 12 34 56 78' },
                { key: 'garant_email', label: 'Email', placeholder: 'jean@email.fr', type: 'email' },
                { key: 'garant_lien', label: 'Lien avec le locataire', placeholder: 'Parent, employeur...' },
              ].map(({ key, label, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">{label}</label>
                  <input type={type} placeholder={placeholder} value={(garantForm as any)[key]}
                    onChange={e => setGarantForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Type de caution</label>
                <select value={garantForm.caution_type} onChange={e => setGarantForm(f => ({ ...f, caution_type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                  <option value="solidaire" className="bg-[var(--surface)]">Solidaire</option>
                  <option value="simple" className="bg-[var(--surface)]">Simple</option>
                  <option value="bancaire" className="bg-[var(--surface)]">Bancaire</option>
                  <option value="visale" className="bg-[var(--surface)]">Visale</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Adresse complète</label>
              <input type="text" placeholder="12 rue de la Paix, 75001 Paris" value={garantForm.garant_adresse}
                onChange={e => setGarantForm(f => ({ ...f, garant_adresse: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
            </div>
            <button onClick={saveGarant} disabled={saving}
              className="w-full h-9 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all disabled:opacity-50">
              Enregistrer le garant
            </button>
          </div>
        )}
      </GlassCard>

      {/* Assurance locataire */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--text-primary)]">Assurance locataire</h2>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${assuranceCfg.color} ${assuranceCfg.bg} ${assuranceCfg.border}`}>
              {assuranceCfg.label}
            </span>
            <button onClick={() => setShowAssuranceForm(v => !v)} className="text-xs text-blue-400 hover:text-blue-300">
              {showAssuranceForm ? 'Fermer' : 'Modifier'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Compagnie</p>
            <p className="text-sm text-[var(--text-primary)]">{lease.assurance_locataire_compagnie || '—'}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Expiration</p>
            <p className="text-sm text-[var(--text-primary)]">
              {lease.assurance_locataire_expiration ? format(new Date(lease.assurance_locataire_expiration), 'dd/MM/yyyy') : '—'}
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Attestation</p>
            {lease.assurance_locataire_url
              ? <a href={lease.assurance_locataire_url} target="_blank" className="text-blue-400 text-xs hover:underline">Voir</a>
              : <span className="text-slate-600 text-xs">Non fournie</span>}
          </div>
        </div>

        {showAssuranceForm && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Compagnie</label>
                <input type="text" placeholder="MAIF, Groupama..." value={assuranceForm.assurance_locataire_compagnie}
                  onChange={e => setAssuranceForm(f => ({ ...f, assurance_locataire_compagnie: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date d'expiration</label>
                <input type="date" value={assuranceForm.assurance_locataire_expiration}
                  onChange={e => setAssuranceForm(f => ({ ...f, assurance_locataire_expiration: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
              </div>
            </div>
            <button onClick={saveAssurance} disabled={saving}
              className="w-full h-9 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all disabled:opacity-50">
              Enregistrer
            </button>
          </div>
        )}
      </GlassCard>

      {/* Clauses fiscales */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-amber-400" /> Clauses fiscales
          </h2>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Taxe foncière refacturée au locataire</p>
            <p className="text-xs text-slate-500 mt-0.5">Si activé, la taxe foncière est exclue de vos charges déductibles</p>
          </div>
          <button
            onClick={async () => {
              const current = lease.parsed_data?.taxe_fonciere_refacturee ?? false
              const { error } = await supabase
                .from('leases')
                .update({ parsed_data: { ...(lease.parsed_data || {}), taxe_fonciere_refacturee: !current } })
                .eq('id', lease.id)
              if (error) { toast.error('Erreur lors de la mise à jour'); return }
              setLease((l: any) => ({ ...l, parsed_data: { ...(l.parsed_data || {}), taxe_fonciere_refacturee: !current } }))
              toast.success(!current ? 'Taxe foncière marquée comme refacturée' : 'Taxe foncière repassée en charge déductible')
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              lease.parsed_data?.taxe_fonciere_refacturee ? 'bg-amber-500' : 'bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              lease.parsed_data?.taxe_fonciere_refacturee ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </GlassCard>

      {/* Départ du locataire & relocation */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <LogOut className="h-4 w-4 text-orange-400" /> Départ du locataire & relocation
          </h2>
          {lease.is_active ? (
            <button onClick={() => (showRelocation ? setShowRelocation(false) : openRelocation())}
              className="text-xs text-blue-400 hover:text-blue-300">
              {showRelocation ? 'Fermer' : 'Reloger'}
            </button>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
              Bail clôturé
            </span>
          )}
        </div>

        {lease.is_active && !showRelocation && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Le locataire part ? L'assistant guide toutes les étapes : EDL de sortie, dépôt de garantie, et optionnellement la mise en place d'un nouveau locataire.
            </p>
            <Link href={`/baux/${id}/changement`}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#F97316' }}>
              <LogOut className="h-4 w-4" /> Lancer la procédure de départ
            </Link>
          </div>
        )}

        {showRelocation && (
          <div className="space-y-4">
            {/* Clôture du bail actuel */}
            <div className="p-4 rounded-xl bg-orange-400/5 border border-orange-400/20">
              <p className="text-sm font-semibold text-orange-300 mb-3 flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Clôture du bail de {lease.tenant_name}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date de fin du bail</label>
                  <input type="date" value={reloc.end_date}
                    onChange={e => setReloc(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">État des lieux de sortie</label>
                  <input type="date" value={reloc.etat_lieux_sortie_date}
                    onChange={e => setReloc(f => ({ ...f, etat_lieux_sortie_date: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Nouveau locataire */}
            <div className="p-4 rounded-xl bg-blue-400/5 border border-blue-400/20">
              <p className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Nouveau locataire — {lease.property?.name}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Nom du locataire *</label>
                  <input type="text" placeholder="Sophie Martin" value={reloc.tenant_name}
                    onChange={e => setReloc(f => ({ ...f, tenant_name: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email</label>
                  <input type="email" placeholder="sophie@email.fr" value={reloc.tenant_email}
                    onChange={e => setReloc(f => ({ ...f, tenant_email: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Téléphone</label>
                  <input type="tel" placeholder="06 12 34 56 78" value={reloc.tenant_phone}
                    onChange={e => setReloc(f => ({ ...f, tenant_phone: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date d'entrée *</label>
                  <input type="date" value={reloc.start_date}
                    onChange={e => setReloc(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Loyer mensuel HC (€)</label>
                  <input type="number" value={reloc.monthly_rent}
                    onChange={e => setReloc(f => ({ ...f, monthly_rent: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Charges (€)</label>
                  <input type="number" value={reloc.charges}
                    onChange={e => setReloc(f => ({ ...f, charges: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Dépôt de garantie (€)</label>
                  <input type="number" value={reloc.deposit}
                    onChange={e => setReloc(f => ({ ...f, deposit: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRelocation(false)}
                className="flex-1 h-10 rounded-lg bg-bg-secondary border border-border text-slate-300 text-sm hover:text-[var(--text-primary)] transition-all">
                Annuler
              </button>
              <button onClick={relouer} disabled={saving}
                className="flex-1 h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" />
                {saving ? 'Création…' : 'Clôturer & créer le nouveau bail'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Le bail actuel sera clôturé (rendu inactif) et un nouveau bail créé sur le même bien.
              Vous serez redirigé vers la fiche du nouveau locataire.
            </p>
          </div>
        )}
      </GlassCard>

      {showRevision && lease && (
        <RevisionModal
          lease={{ ...lease, property: { name: lease.property?.name, city: lease.property?.city, indice_revision: lease.property?.indice_revision } }}
          onClose={() => setShowRevision(false)}
          onSuccess={() => { setShowRevision(false); load() }}
        />
      )}
    </div>
  )
}
