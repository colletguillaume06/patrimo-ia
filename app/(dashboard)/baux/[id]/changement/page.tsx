'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { format, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, CheckCircle2, LogOut, UserPlus,
  Upload, X, FileText, Eye, Loader2, Copy, Home,
  Key, ClipboardList, Shield, FileCheck, AlertTriangle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

type EdlEtat = 'neuf' | 'bon' | 'usage' | 'degrade' | ''

interface EdlPiece {
  nom: string
  etat: EdlEtat
  notes: string
  photos: string[] // URLs après upload
}

interface Step {
  id: string
  label: string
  icon: React.ReactNode
  group: 'depart' | 'arrivee'
}

// ─── Constantes ───────────────────────────────────────────────────────────

const ETAT_OPTIONS: { value: EdlEtat; label: string; color: string }[] = [
  { value: 'neuf', label: 'Neuf', color: '#166534' },
  { value: 'bon', label: 'Bon', color: '#1D4ED8' },
  { value: 'usage', label: 'Usage normal', color: '#92400E' },
  { value: 'degrade', label: 'Dégradé', color: '#991B1B' },
]

const PIECES_DEFAULT = [
  'Entrée', 'Salon / Séjour', 'Cuisine', 'Chambre 1', 'Chambre 2',
  'Salle de bain', 'WC', 'Balcon / Terrasse', 'Cave / Garage',
]

const STEPS: Step[] = [
  { id: 'depart',     label: 'Départ',            icon: <LogOut className="h-4 w-4" />,         group: 'depart' },
  { id: 'edl_sortie', label: 'État des lieux sortie', icon: <ClipboardList className="h-4 w-4" />, group: 'depart' },
  { id: 'dg',         label: 'Dépôt de garantie', icon: <Key className="h-4 w-4" />,             group: 'depart' },
  { id: 'candidat',   label: 'Nouveau locataire',  icon: <UserPlus className="h-4 w-4" />,        group: 'arrivee' },
  { id: 'dossier',    label: 'Dossier & documents', icon: <Shield className="h-4 w-4" />,         group: 'arrivee' },
  { id: 'edl_entree', label: 'État des lieux entrée', icon: <Home className="h-4 w-4" />,         group: 'arrivee' },
  { id: 'finaliser',  label: 'Finaliser le bail',  icon: <FileCheck className="h-4 w-4" />,       group: 'arrivee' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function etatColor(etat: EdlEtat) {
  return ETAT_OPTIONS.find(o => o.value === etat)?.color ?? '#64748B'
}

function genTexteEdl(pieces: EdlPiece[], type: 'entree' | 'sortie', tenant: string, address: string, date: string) {
  const lignes = pieces
    .filter(p => p.etat)
    .map(p => `• ${p.nom} : ${ETAT_OPTIONS.find(o => o.value === p.etat)?.label ?? p.etat}${p.notes ? ' — ' + p.notes : ''}`)
    .join('\n')
  return `ÉTAT DES LIEUX D'${type === 'entree' ? 'ENTRÉE' : 'SORTIE'}
Locataire : ${tenant}
Bien : ${address}
Date : ${date}

${lignes}

Établi contradictoirement et signé par les parties.`
}

// ─── Composant upload document ─────────────────────────────────────────────

function DocUploader({
  lease_id, category, label, multiple = true, accept = 'image/*,application/pdf',
  onUploaded,
}: {
  lease_id: string; category: string; label: string; multiple?: boolean
  accept?: string; onUploaded?: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [urls, setUrls] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (files: FileList) => {
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('lease_id', lease_id)
      fd.append('category', category)
      const res = await fetch('/api/baux/upload-doc', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok) {
        setUrls(prev => [...prev, json.url])
        onUploaded?.(json.url)
        toast.success('Document enregistré')
      } else {
        toast.error(json.error ?? 'Erreur upload')
      }
    }
    setUploading(false)
  }

  return (
    <div>
      <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#64748B' }}>{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((u, i) => (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:border-blue-400"
            style={{ borderColor: 'var(--border)', color: '#1D4ED8', background: '#EFF6FF' }}>
            <Eye className="h-3 w-3" /> Voir {i + 1}
          </a>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg border text-sm font-medium transition-all hover:border-blue-400"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Envoi en cours…' : 'Importer un fichier'}
        </button>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden"
          onChange={e => { if (e.target.files?.length) { upload(e.target.files); e.target.value = '' } }} />
      </div>
    </div>
  )
}

// ─── Composant EDL ────────────────────────────────────────────────────────

function EdlForm({
  type, lease_id, tenant, address,
  pieces, onChange,
}: {
  type: 'entree' | 'sortie'; lease_id: string; tenant: string; address: string
  pieces: EdlPiece[]; onChange: (pieces: EdlPiece[]) => void
}) {
  const [newPiece, setNewPiece] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const update = (i: number, field: keyof EdlPiece, val: any) => {
    const next = [...pieces]
    ;(next[i] as any)[field] = val
    onChange(next)
  }

  const addPiece = (nom: string) => {
    if (!nom.trim()) return
    onChange([...pieces, { nom: nom.trim(), etat: '', notes: '', photos: [] }])
    setNewPiece('')
  }

  const removePiece = (i: number) => onChange(pieces.filter((_, j) => j !== i))

  const texte = genTexteEdl(pieces, type, tenant, address, format(new Date(), 'dd MMMM yyyy', { locale: fr }))

  const copyTexte = () => {
    navigator.clipboard.writeText(texte)
    setCopied(true)
    toast.success('Texte de l\'état des lieux copié')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Liste des pièces */}
      <div className="space-y-3">
        {pieces.map((p, i) => (
          <div key={i} className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.nom}</p>
              <button onClick={() => removePiece(i)}>
                <X className="h-4 w-4" style={{ color: '#94A3B8' }} />
              </button>
            </div>
            {/* État */}
            <div className="flex gap-2 flex-wrap mb-3">
              {ETAT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => update(i, 'etat', opt.value)}
                  className="h-8 px-3 rounded-lg border text-xs font-semibold transition-all"
                  style={{
                    background: p.etat === opt.value ? opt.color : 'transparent',
                    borderColor: opt.color,
                    color: p.etat === opt.value ? '#fff' : opt.color,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Notes */}
            <input type="text" placeholder="Observations (ex: égratignure sur le mur nord)"
              value={p.notes} onChange={e => update(i, 'notes', e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none mb-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            {/* Photos */}
            <div>
              <p className="text-xs mb-2" style={{ color: '#64748B' }}>Photos de la pièce</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {p.photos.map((url, j) => (
                  <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                    className="h-14 w-14 rounded-lg border overflow-hidden flex items-center justify-center"
                    style={{ borderColor: 'var(--border)' }}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
              <label className="flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs cursor-pointer transition-all hover:border-blue-400"
                style={{ borderColor: 'var(--border)', color: '#64748B', background: 'var(--bg-card)' }}>
                <Upload className="h-3.5 w-3.5" /> Ajouter des photos
                <input type="file" accept="image/*,application/pdf" multiple className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files?.length) return
                    for (const file of Array.from(files)) {
                      const fd = new FormData()
                      fd.append('file', file)
                      fd.append('lease_id', lease_id)
                      fd.append('category', `edl_${type}_photo`)
                      const res = await fetch('/api/baux/upload-doc', { method: 'POST', body: fd })
                      const json = await res.json()
                      if (res.ok) {
                        const next = [...pieces]
                        next[i] = { ...next[i], photos: [...next[i].photos, json.url] }
                        onChange(next)
                        toast.success('Photo ajoutée')
                      } else toast.error(json.error)
                    }
                    e.target.value = ''
                  }} />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Ajouter une pièce */}
      <div className="flex gap-2">
        <input type="text" placeholder="Ajouter une pièce…" value={newPiece}
          onChange={e => setNewPiece(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPiece(newPiece)}
          className="flex-1 h-9 px-3 rounded-lg text-sm focus:outline-none"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        <button onClick={() => addPiece(newPiece)}
          className="h-9 px-4 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#1D4ED8' }}>
          Ajouter
        </button>
      </div>

      {/* Suggestions rapides */}
      <div className="flex flex-wrap gap-1.5">
        {PIECES_DEFAULT.filter(p => !pieces.find(x => x.nom === p)).map(p => (
          <button key={p} onClick={() => addPiece(p)}
            className="h-7 px-2.5 rounded-lg border text-xs transition-all hover:border-blue-400 hover:text-blue-600"
            style={{ borderColor: 'var(--border)', color: '#64748B', background: 'var(--bg-secondary)' }}>
            + {p}
          </button>
        ))}
      </div>

      {/* EDL PDF upload */}
      <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <DocUploader lease_id={lease_id} category={`edl_${type}_pdf`}
          label={`État des lieux ${type === 'sortie' ? 'de sortie' : 'd\'entrée'} signé (PDF ou scan)`}
          accept="image/*,application/pdf"
          onUploaded={(u) => setPdfUrl(u)} />
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:underline">
            <FileText className="h-3.5 w-3.5" /> EDL signé enregistré
          </a>
        )}
      </div>

      {/* Texte récapitulatif */}
      {pieces.some(p => p.etat) && (
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
              Texte de l'état des lieux
            </p>
            <button onClick={copyTexte}
              className="flex items-center gap-1 h-7 px-3 rounded-lg border text-xs transition-all"
              style={{ borderColor: 'var(--border)', color: '#1D4ED8', background: '#EFF6FF' }}>
              {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <pre className="text-xs rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {texte}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function ChangementLocatairePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [lease, setLease] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0)

  // ── Étape 1 : Départ ──────────────────────────────────────────────────
  const [depart, setDepart] = useState({
    end_date: new Date().toISOString().slice(0, 10),
    etat_lieux_sortie_date: new Date().toISOString().slice(0, 10),
    preavis_recu_le: '',
    remise_cles_le: '',
    notes_depart: '',
  })

  // ── Étape 2 : EDL sortie ─────────────────────────────────────────────
  const [edlSortie, setEdlSortie] = useState<EdlPiece[]>([])

  // ── Étape 3 : DG ─────────────────────────────────────────────────────
  const [dg, setDg] = useState({
    montant_retenu: '0',
    motif_retenu: '',
    restitue_le: '',
    avec_reserves: false,
  })

  // ── Étape 4 : Candidat ───────────────────────────────────────────────
  const [candidat, setCandidat] = useState({
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    start_date: '',
    monthly_rent: '',
    charges: '',
    deposit: '',
  })

  // ── Étape 5 : Documents dossier ──────────────────────────────────────
  // (stockés directement via DocUploader → API → parsed_data)
  // On garde un état local pour afficher la progression
  const [docsUploaded, setDocsUploaded] = useState<Record<string, boolean>>({})

  // ── Étape 6 : EDL entrée ─────────────────────────────────────────────
  const [edlEntree, setEdlEntree] = useState<EdlPiece[]>([])

  // ── Étape 7 : Bail signé + assurance ─────────────────────────────────
  const [finalisation, setFinalisation] = useState({
    bail_signe_url: '',
    assurance_compagnie: '',
    assurance_expiration: '',
    notice_months: '',
  })

  // Résultat : ID du nouveau bail créé
  const [newLeaseId, setNewLeaseId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('leases')
      .select('*, property:properties(id, name, address, city, type, surface_m2)')
      .eq('id', id).single()
      .then(({ data }) => {
        setLease(data)
        if (data) {
          setDepart(d => ({
            ...d,
            end_date: new Date().toISOString().slice(0, 10),
          }))
          setCandidat(c => ({
            ...c,
            monthly_rent: String(data.monthly_rent ?? ''),
            charges: String(data.charges ?? ''),
            deposit: String(data.deposit ?? ''),
          }))
        }
        setLoading(false)
      })
  }, [id])

  // Initialiser les pièces EDL selon type de bien
  useEffect(() => {
    if (!lease) return
    const pieces: EdlPiece[] = PIECES_DEFAULT.slice(0, lease.property?.type === 'lmnp' ? 6 : 4)
      .map(nom => ({ nom, etat: '', notes: '', photos: [] }))
    setEdlSortie(pieces)
    setEdlEntree(JSON.parse(JSON.stringify(pieces))) // deep copy
  }, [lease])

  const saveStep1 = async () => {
    setSaving(true)
    // Sauvegarder les infos de départ dans le bail courant (sans le clôturer encore)
    await supabase.from('leases').update({
      end_date: depart.end_date || null,
      etat_lieux_sortie_date: depart.etat_lieux_sortie_date || null,
      parsed_data: {
        ...(lease?.parsed_data ?? {}),
        depart: { ...depart, edl_sortie: edlSortie },
      }
    }).eq('id', id)
    setSaving(false)
    setStep(1)
    toast.success('Informations de départ enregistrées')
  }

  const saveStep2 = async () => {
    setSaving(true)
    await supabase.from('leases').update({
      parsed_data: {
        ...(lease?.parsed_data ?? {}),
        edl_sortie: edlSortie,
      }
    }).eq('id', id)
    setSaving(false)
    setStep(2)
    toast.success('EDL de sortie enregistré')
  }

  const saveStep3 = async () => {
    setSaving(true)
    await supabase.from('leases').update({
      depot_garantie_montant_retenu: Number(dg.montant_retenu) || 0,
      depot_garantie_motif_retenu: dg.motif_retenu || null,
      depot_garantie_restitue_le: dg.restitue_le || null,
    }).eq('id', id)
    setSaving(false)
    setStep(3)
    toast.success('Dépôt de garantie enregistré')
  }

  const saveStep5 = () => setStep(5)

  const saveStep6 = async () => {
    setSaving(true)
    await supabase.from('leases').update({
      parsed_data: {
        ...(lease?.parsed_data ?? {}),
        edl_entree_nouveau: edlEntree,
      }
    }).eq('id', id)
    setSaving(false)
    setStep(6)
    toast.success('EDL d\'entrée enregistré')
  }

  const finaliser = async (avecNouveauLocataire = true) => {
    if (avecNouveauLocataire && !candidat.tenant_name.trim()) { toast.error('Nom du nouveau locataire requis'); return }
    if (avecNouveauLocataire && !candidat.start_date) { toast.error("Date d'entrée requise"); return }
    setSaving(true)

    // 1. Clôturer le bail actuel
    const { error: e1 } = await supabase.from('leases').update({
      is_active: false,
      end_date: depart.end_date || null,
      etat_lieux_sortie_date: depart.etat_lieux_sortie_date || null,
      appel_loyer_actif: false,
      depot_garantie_montant_retenu: Number(dg.montant_retenu) || 0,
      depot_garantie_motif_retenu: dg.motif_retenu || null,
      depot_garantie_restitue_le: dg.restitue_le || null,
    }).eq('id', id)
    if (e1) { setSaving(false); toast.error('Erreur clôture : ' + e1.message); return }

    if (!avecNouveauLocataire) {
      setSaving(false)
      toast.success('Bail clôturé avec succès')
      setNewLeaseId('__cloture_seule__')
      return
    }

    // 2. Créer le nouveau bail
    const { data: created, error: e2 } = await supabase.from('leases').insert({
      property_id: lease.property?.id ?? lease.property_id,
      tenant_name: candidat.tenant_name.trim(),
      tenant_email: candidat.tenant_email || null,
      tenant_phone: candidat.tenant_phone || null,
      monthly_rent: Number(candidat.monthly_rent) || 0,
      charges: Number(candidat.charges) || 0,
      deposit: Number(candidat.deposit) || 0,
      start_date: candidat.start_date,
      is_active: true,
      appel_loyer_actif: true,
      notice_months: Number(finalisation.notice_months) || lease.notice_months || null,
      indexation_index: lease.indexation_index ?? null,
      assurance_locataire_compagnie: finalisation.assurance_compagnie || null,
      assurance_locataire_expiration: finalisation.assurance_expiration || null,
      pdf_url: finalisation.bail_signe_url || null,
      parsed_data: {
        edl_entree: edlEntree,
        source: 'changement_locataire',
        ancien_bail_id: id,
      },
    }).select('id').single()

    setSaving(false)
    if (e2) { toast.error('Erreur création : ' + e2.message); return }
    setNewLeaseId(created.id)
    toast.success('🎉 Changement de locataire finalisé !')
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto">
      <div className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
    </div>
  )
  if (!lease) return <div className="max-w-3xl mx-auto text-center py-16" style={{ color: 'var(--text-tertiary)' }}>Bail introuvable</div>

  const address = [lease.property?.address, lease.property?.city].filter(Boolean).join(', ')
  const dateLimiteRestitution = depart.etat_lieux_sortie_date
    ? format(addMonths(new Date(depart.etat_lieux_sortie_date), dg.avec_reserves ? 2 : 1), 'dd/MM/yyyy')
    : '—'

  const montantRestitue = (lease.deposit ?? 0) - (Number(dg.montant_retenu) || 0)

  const courrierRestitution = `[Votre nom et adresse]
${format(new Date(), 'd MMMM yyyy', { locale: fr })}

${lease.tenant_name}
[Adresse du locataire]

Objet : Restitution du dépôt de garantie — ${address}

Madame, Monsieur,

Suite à la restitution des clés en date du ${depart.remise_cles_le ? format(new Date(depart.remise_cles_le), 'dd MMMM yyyy', { locale: fr }) : '[date]'}, et conformément à l'article 22 de la loi du 6 juillet 1989, nous vous adressons le décompte de restitution du dépôt de garantie.

Dépôt de garantie versé : ${formatCurrency(lease.deposit ?? 0)}
${Number(dg.montant_retenu) > 0 ? `Retenue : -${formatCurrency(Number(dg.montant_retenu))}\nMotif : ${dg.motif_retenu || '[motif]'}` : 'Aucune retenue.'}

MONTANT RESTITUÉ : ${formatCurrency(montantRestitue)}

Date limite légale de restitution : ${dateLimiteRestitution}

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

[Signature]`

  // ── Rendu final après finalisation ───────────────────────────────────────
  if (newLeaseId) {
    const clotureSeulement = newLeaseId === '__cloture_seule__'
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-6">
        <div className="h-20 w-20 rounded-3xl flex items-center justify-center mx-auto"
          style={{ background: '#F0FDF4', border: '2px solid #86EFAC' }}>
          <CheckCircle2 className="h-10 w-10" style={{ color: '#166534' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
            {clotureSeulement ? 'Bail clôturé !' : 'Changement de locataire effectué !'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {clotureSeulement
              ? <>Bail de <strong>{lease.tenant_name}</strong> clôturé · Bien disponible pour relocation</>
              : <>Bail de <strong>{lease.tenant_name}</strong> clôturé · Nouveau bail créé pour <strong>{candidat.tenant_name}</strong></>
            }
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          {!clotureSeulement && (
            <Link href={`/baux/${newLeaseId}`}
              className="flex items-center gap-2 h-11 px-6 rounded-xl text-white font-semibold"
              style={{ background: '#1D4ED8' }}>
              <ChevronRight className="h-4 w-4" /> Voir la fiche du nouveau locataire
            </Link>
          )}
          <Link href="/baux"
            className="flex items-center gap-2 h-11 px-6 rounded-xl border font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}>
            Tous les baux
          </Link>
        </div>
      </div>
    )
  }

  const currentStep = STEPS[step]

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <Link href={`/baux/${id}`}
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'var(--text-tertiary)' }}>
        <ChevronLeft className="h-4 w-4" /> Retour à la fiche bail
      </Link>

      {/* En-tête */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h1 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>
          Changement de locataire
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {lease.tenant_name} → {candidat.tenant_name || '…'} · {lease.property?.name}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex gap-0 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          const isDepart = s.group === 'depart'
          return (
            <div key={s.id} className="flex items-center min-w-0">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[72px]"
                style={{
                  background: active ? (isDepart ? '#FFF7ED' : '#EFF6FF') : done ? 'var(--bg-secondary)' : 'transparent',
                  border: active ? `2px solid ${isDepart ? '#F97316' : '#1D4ED8'}` : '2px solid transparent',
                  opacity: i > step ? 0.4 : 1,
                  cursor: i < step ? 'pointer' : i === step ? 'default' : 'not-allowed',
                }}>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: done ? '#166534' : active ? (isDepart ? '#F97316' : '#1D4ED8') : 'var(--bg-tertiary)' }}>
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-white" />
                    : <span style={{ color: active ? '#fff' : 'var(--text-tertiary)' }}>{s.icon}</span>
                  }
                </div>
                <span className="text-[10px] font-medium text-center leading-tight"
                  style={{ color: active ? (isDepart ? '#C2410C' : '#1D4ED8') : done ? '#166534' : 'var(--text-tertiary)' }}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="h-0.5 w-4 flex-shrink-0"
                  style={{ background: i < step ? '#166534' : 'var(--border)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Contenu de l'étape */}
      <div className="p-6 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* ── Étape 0 : Départ ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <LogOut className="h-5 w-5" style={{ color: '#F97316' }} />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Départ de {lease.tenant_name}</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lease.property?.name} · {address}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Date de fin du bail *</label>
                <input type="date" value={depart.end_date}
                  onChange={e => setDepart(d => ({ ...d, end_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Préavis reçu le</label>
                <input type="date" value={depart.preavis_recu_le}
                  onChange={e => setDepart(d => ({ ...d, preavis_recu_le: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Date état des lieux de sortie</label>
                <input type="date" value={depart.etat_lieux_sortie_date}
                  onChange={e => setDepart(d => ({ ...d, etat_lieux_sortie_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Remise des clés le</label>
                <input type="date" value={depart.remise_cles_le}
                  onChange={e => setDepart(d => ({ ...d, remise_cles_le: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Notes (optionnel)</label>
              <textarea value={depart.notes_depart} rows={2}
                onChange={e => setDepart(d => ({ ...d, notes_depart: e.target.value }))}
                placeholder="Ex: Locataire part pour l'étranger, aucune réserve..."
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>

            {/* Info légale préavis */}
            <div className="p-3 rounded-xl flex gap-2" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
              <p className="text-xs" style={{ color: '#1E40AF' }}>
                <strong>Délais légaux de restitution du DG :</strong> 1 mois si EDL de sortie conforme à l'entrée, 2 mois si des réserves sont notées (art. 22 loi du 6 juillet 1989).
              </p>
            </div>
          </div>
        )}

        {/* ── Étape 1 : EDL sortie ─────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <ClipboardList className="h-5 w-5" style={{ color: '#F97316' }} />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>État des lieux de sortie</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Renseignez l'état de chaque pièce et prenez des photos</p>
              </div>
            </div>
            <EdlForm type="sortie" lease_id={id} tenant={lease.tenant_name} address={address}
              pieces={edlSortie} onChange={setEdlSortie} />
          </div>
        )}

        {/* ── Étape 2 : DG ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <Key className="h-5 w-5" style={{ color: '#F97316' }} />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Dépôt de garantie</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>DG versé : {formatCurrency(lease.deposit ?? 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Montant retenu (€)</label>
                <input type="number" value={dg.montant_retenu} min="0" max={lease.deposit ?? 9999}
                  onChange={e => setDg(d => ({ ...d, montant_retenu: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Date de restitution prévue</label>
                <input type="date" value={dg.restitue_le}
                  onChange={e => setDg(d => ({ ...d, restitue_le: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            {Number(dg.montant_retenu) > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Motif de la retenue</label>
                <input type="text" placeholder="Ex: Remplacement vitre brisée, nettoyage..."
                  value={dg.motif_retenu}
                  onChange={e => setDg(d => ({ ...d, motif_retenu: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={dg.avec_reserves}
                onChange={e => setDg(d => ({ ...d, avec_reserves: e.target.checked }))}
                className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>EDL avec réserves (délai de restitution 2 mois au lieu de 1)</span>
            </label>

            {/* Récap */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: 'var(--text-secondary)' }}>DG versé</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(lease.deposit ?? 0)}</span>
              </div>
              {Number(dg.montant_retenu) > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: '#991B1B' }}>Retenue</span>
                  <span style={{ color: '#991B1B' }}>−{formatCurrency(Number(dg.montant_retenu))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2"
                style={{ borderColor: 'var(--border)', color: montantRestitue >= 0 ? '#166534' : '#991B1B' }}>
                <span>À restituer</span>
                <span>{formatCurrency(Math.max(0, montantRestitue))}</span>
              </div>
              <p className="text-xs mt-2" style={{ color: '#64748B' }}>Date limite légale : {dateLimiteRestitution}</p>
            </div>

            {/* Courrier de restitution */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
                Courrier de restitution du DG
              </p>
              <pre className="text-xs rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed mb-2"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {courrierRestitution}
              </pre>
              <button onClick={() => {
                navigator.clipboard.writeText(courrierRestitution)
                toast.success('Courrier copié !')
              }}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg border text-xs font-medium transition-all"
                style={{ borderColor: 'var(--border)', color: '#1D4ED8', background: '#EFF6FF' }}>
                <Copy className="h-3.5 w-3.5" /> Copier le courrier
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 3 : Candidat ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <UserPlus className="h-5 w-5" style={{ color: '#1D4ED8' }} />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Nouveau locataire</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lease.property?.name} · {address}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Nom complet *</label>
                <input type="text" placeholder="Sophie Martin" value={candidat.tenant_name}
                  onChange={e => setCandidat(c => ({ ...c, tenant_name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Email</label>
                <input type="email" placeholder="sophie@email.fr" value={candidat.tenant_email}
                  onChange={e => setCandidat(c => ({ ...c, tenant_email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Téléphone</label>
                <input type="tel" placeholder="06 12 34 56 78" value={candidat.tenant_phone}
                  onChange={e => setCandidat(c => ({ ...c, tenant_phone: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Date d'entrée *</label>
                <input type="date" value={candidat.start_date}
                  onChange={e => setCandidat(c => ({ ...c, start_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Loyer mensuel HC (€)</label>
                <input type="number" value={candidat.monthly_rent}
                  onChange={e => setCandidat(c => ({ ...c, monthly_rent: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Charges (€)</label>
                <input type="number" value={candidat.charges}
                  onChange={e => setCandidat(c => ({ ...c, charges: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Dépôt de garantie (€)</label>
                <input type="number" value={candidat.deposit}
                  onChange={e => setCandidat(c => ({ ...c, deposit: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Étape 4 : Dossier locataire ──────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Shield className="h-5 w-5" style={{ color: '#1D4ED8' }} />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Dossier du locataire</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Scannez ou importez les pièces du dossier — elles sont rattachées à la fiche bail</p>
              </div>
            </div>

            {[
              { cat: 'identite', label: "Pièce d'identité (CNI / Passeport)", hint: 'Recto-verso si CNI' },
              { cat: 'revenus', label: 'Justificatifs de revenus (3 derniers bulletins de paie ou avis d\'imposition)', hint: 'Ou 2 bilans si indépendant' },
              { cat: 'bail_precedent', label: 'Quittances ou justificatif de domicile actuel', hint: 'Optionnel' },
              { cat: 'caution', label: 'Acte de caution (garant)', hint: 'Optionnel — à joindre si garant' },
            ].map(({ cat, label, hint }) => (
              <div key={cat} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{label}</p>
                {hint && <p className="text-xs mb-3" style={{ color: '#64748B' }}>{hint}</p>}
                <DocUploader
                  lease_id={id}
                  category={cat}
                  label=""
                  accept="image/*,application/pdf"
                  onUploaded={() => setDocsUploaded(d => ({ ...d, [cat]: true }))} />
                {docsUploaded[cat] && (
                  <p className="flex items-center gap-1 text-xs mt-2" style={{ color: '#166534' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Document enregistré
                  </p>
                )}
              </div>
            ))}

            <div className="p-3 rounded-xl flex gap-2" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#166534' }} />
              <p className="text-xs" style={{ color: '#166534' }}>
                Tous les documents sont stockés dans votre espace sécurisé et rattachés à la fiche du bail. Vous pouvez y accéder à tout moment.
              </p>
            </div>
          </div>
        )}

        {/* ── Étape 5 : EDL entrée ─────────────────────────────────────── */}
        {step === 5 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Home className="h-5 w-5" style={{ color: '#1D4ED8' }} />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>État des lieux d'entrée</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pour {candidat.tenant_name || 'le nouveau locataire'}</p>
              </div>
            </div>

            {/* Bouton copier EDL sortie → entrée */}
            {edlSortie.some(p => p.etat) && (
              <div className="mb-4 p-3 rounded-xl flex items-center justify-between"
                style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <p className="text-xs" style={{ color: '#92400E' }}>
                  Reprendre l'état de l'EDL de sortie comme base pour l'EDL d'entrée ?
                </p>
                <button onClick={() => setEdlEntree(JSON.parse(JSON.stringify(edlSortie)))}
                  className="h-7 px-3 rounded-lg text-xs font-semibold"
                  style={{ background: '#F97316', color: '#fff' }}>
                  Reprendre
                </button>
              </div>
            )}

            <EdlForm type="entree" lease_id={id} tenant={candidat.tenant_name || 'nouveau locataire'} address={address}
              pieces={edlEntree} onChange={setEdlEntree} />
          </div>
        )}

        {/* ── Étape 6 : Finaliser ──────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <FileCheck className="h-5 w-5" style={{ color: '#1D4ED8' }} />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Finaliser le bail</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Bail signé, assurance, et création définitive</p>
              </div>
            </div>

            {/* Bail signé */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Bail signé</p>
              <DocUploader lease_id={id} category="bail_signe"
                label="Bail signé par les deux parties (PDF ou scan)"
                accept="image/*,application/pdf" multiple={false}
                onUploaded={(url) => setFinalisation(f => ({ ...f, bail_signe_url: url }))} />
            </div>

            {/* Assurance */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Assurance habitation du locataire</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Compagnie</label>
                  <input type="text" placeholder="MAIF, Groupama..." value={finalisation.assurance_compagnie}
                    onChange={e => setFinalisation(f => ({ ...f, assurance_compagnie: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date d'expiration</label>
                  <input type="date" value={finalisation.assurance_expiration}
                    onChange={e => setFinalisation(f => ({ ...f, assurance_expiration: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <DocUploader lease_id={id} category="assurance"
                label="Attestation d'assurance (scan ou photo)"
                accept="image/*,application/pdf" multiple={false}
                onUploaded={() => {}} />
            </div>

            {/* Durée de préavis */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Durée de préavis (mois)
              </label>
              <input type="number" placeholder="Ex: 1 pour meublé, 3 pour nu"
                value={finalisation.notice_months}
                onChange={e => setFinalisation(f => ({ ...f, notice_months: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>

            {/* Récap final */}
            <div className="p-4 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: '#166534' }}>Récapitulatif du changement</p>
              <div className="space-y-1.5 text-xs" style={{ color: '#166534' }}>
                <p>✓ <strong>{lease.tenant_name}</strong> — sortie le {depart.end_date || '—'}</p>
                <p>✓ DG à restituer : <strong>{formatCurrency(Math.max(0, montantRestitue))}</strong>{Number(dg.montant_retenu) > 0 ? ` (retenue : ${formatCurrency(Number(dg.montant_retenu))})` : ''}</p>
                <p>✓ <strong>{candidat.tenant_name || '—'}</strong> — entrée le {candidat.start_date || '—'}</p>
                <p>✓ Loyer : <strong>{formatCurrency(Number(candidat.monthly_rent) || 0)}</strong>/mois HC + {formatCurrency(Number(candidat.charges) || 0)} charges</p>
                <p>✓ DG nouveau bail : <strong>{formatCurrency(Number(candidat.deposit) || 0)}</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* ── Boutons de navigation ─────────────────────────────────────── */}
        <div className="flex gap-3 mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 h-10 px-5 rounded-xl border text-sm font-semibold transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
          )}

          {/* Bouton selon l'étape */}
          {step === 0 && (
            <button onClick={saveStep1} disabled={!depart.end_date || saving}
              className="ml-auto flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: '#F97316' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer & continuer <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 1 && (
            <button onClick={saveStep2} disabled={saving}
              className="ml-auto flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: '#F97316' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer l'EDL <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 2 && (
            <button onClick={saveStep3} disabled={saving}
              className="ml-auto flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: '#F97316' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continuer vers le nouveau locataire <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 3 && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => finaliser(false)} disabled={saving}
                className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border disabled:opacity-50"
                style={{ borderColor: '#EF4444', color: '#EF4444', background: '#FEF2F2' }}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Clôturer sans nouveau locataire
              </button>
              <button onClick={() => { if (!candidat.tenant_name.trim()) { toast.error('Nom requis'); return } setStep(4) }}
                className="flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#1D4ED8' }}>
                Continuer avec un nouveau locataire <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {step === 4 && (
            <button onClick={saveStep5}
              className="ml-auto flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#1D4ED8' }}>
              Continuer vers l'EDL d'entrée <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 5 && (
            <button onClick={saveStep6} disabled={saving}
              className="ml-auto flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: '#1D4ED8' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer l'EDL <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 6 && (
            <button onClick={() => finaliser(true)} disabled={saving || !candidat.tenant_name.trim() || !candidat.start_date}
              className="ml-auto flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: '#166534' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Finaliser le changement
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
