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
  Upload, FileText, Phone, Mail, User, Calendar, Euro
} from 'lucide-react'
import {
  getStatutDepotGarantie, getStatutAssurance, getStatutReconduction
} from '@/lib/bail'
import Link from 'next/link'

const ASSURANCE_CONFIG = {
  valide: { label: 'Valide', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
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
      <Link href="/baux" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
        <ChevronLeft className="h-4 w-4" /> Retour aux baux
      </Link>

      {/* Header */}
      <GlassCard className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-white">{lease.tenant_name}</h1>
            <p className="text-slate-400 text-sm">{lease.property?.name} · {lease.property?.city}</p>
            <p className="text-white font-semibold mt-1">{formatCurrency(lease.monthly_rent)}/mois</p>
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

      {/* Dépôt de garantie */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white flex items-center gap-2">
            <Euro className="h-4 w-4 text-blue-400" /> Dépôt de garantie
          </h2>
          <button onClick={() => setShowDGForm(v => !v)} className="text-xs text-blue-400 hover:text-blue-300">
            {showDGForm ? 'Fermer' : 'Gérer'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Montant DG', value: formatCurrency(lease.deposit || 0), color: 'text-white' },
            { label: 'Montant retenu', value: lease.depot_garantie_montant_retenu > 0 ? formatCurrency(lease.depot_garantie_montant_retenu) : '—', color: 'text-red-400' },
            { label: 'Restitué', value: lease.depot_garantie_montant_retenu > 0 ? formatCurrency((lease.deposit || 0) - (lease.depot_garantie_montant_retenu || 0)) : '—', color: 'text-green-400' },
            { label: 'Statut', value: dgStatut.message, color: dgStatut.statut === 'restitue' ? 'text-green-400' : dgStatut.statut === 'urgent' || dgStatut.statut === 'depasse' ? 'text-red-400' : 'text-amber-400' },
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
                <label className="block text-xs text-slate-400 mb-1">Date état des lieux de sortie</label>
                <input type="date" value={dgForm.etat_lieux_sortie_date}
                  onChange={e => setDgForm(f => ({ ...f, etat_lieux_sortie_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date restitution effective</label>
                <input type="date" value={dgForm.depot_garantie_restitue_le}
                  onChange={e => setDgForm(f => ({ ...f, depot_garantie_restitue_le: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none" />
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
                <label className="block text-xs text-slate-400 mb-1">Montant retenu (€)</label>
                <input type="number" value={dgForm.depot_garantie_montant_retenu}
                  onChange={e => setDgForm(f => ({ ...f, depot_garantie_montant_retenu: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Motif de la retenue</label>
                <input type="text" placeholder="Ex: Dégradation peinture" value={dgForm.depot_garantie_motif_retenu}
                  onChange={e => setDgForm(f => ({ ...f, depot_garantie_motif_retenu: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveDG} disabled={saving}
                className="flex-1 h-9 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50">
                Enregistrer
              </button>
              <button onClick={() => {
                const texte = genCourrierDG()
                navigator.clipboard.writeText(texte)
                toast.success('Courrier de restitution copié !')
                setShowCourrier(true)
              }}
                className="flex-1 h-9 rounded-lg bg-white/[0.06] border border-white/[0.10] text-slate-300 text-sm hover:text-white transition-all flex items-center justify-center gap-2">
                <Copy className="h-3.5 w-3.5" /> Générer courrier restitution
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Garant */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white flex items-center gap-2">
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
              <p className="text-sm font-medium text-white">{lease.garant_prenom} {lease.garant_nom}</p>
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
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input type={type} placeholder={placeholder} value={(garantForm as any)[key]}
                    onChange={e => setGarantForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type de caution</label>
                <select value={garantForm.caution_type} onChange={e => setGarantForm(f => ({ ...f, caution_type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none">
                  <option value="solidaire" className="bg-[#111E35]">Solidaire</option>
                  <option value="simple" className="bg-[#111E35]">Simple</option>
                  <option value="bancaire" className="bg-[#111E35]">Bancaire</option>
                  <option value="visale" className="bg-[#111E35]">Visale</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Adresse complète</label>
              <input type="text" placeholder="12 rue de la Paix, 75001 Paris" value={garantForm.garant_adresse}
                onChange={e => setGarantForm(f => ({ ...f, garant_adresse: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none" />
            </div>
            <button onClick={saveGarant} disabled={saving}
              className="w-full h-9 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50">
              Enregistrer le garant
            </button>
          </div>
        )}
      </GlassCard>

      {/* Assurance locataire */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white">Assurance locataire</h2>
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
            <p className="text-sm text-white">{lease.assurance_locataire_compagnie || '—'}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Expiration</p>
            <p className="text-sm text-white">
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
                <label className="block text-xs text-slate-400 mb-1">Compagnie</label>
                <input type="text" placeholder="MAIF, Groupama..." value={assuranceForm.assurance_locataire_compagnie}
                  onChange={e => setAssuranceForm(f => ({ ...f, assurance_locataire_compagnie: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date d'expiration</label>
                <input type="date" value={assuranceForm.assurance_locataire_expiration}
                  onChange={e => setAssuranceForm(f => ({ ...f, assurance_locataire_expiration: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm focus:outline-none" />
              </div>
            </div>
            <button onClick={saveAssurance} disabled={saving}
              className="w-full h-9 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50">
              Enregistrer
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
