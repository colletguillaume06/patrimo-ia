'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Wrench, Plus, X, Paperclip, CheckCircle2, Clock, AlertCircle, BarChart2,
  Info, Upload, Loader2, Euro, FileText, AlertTriangle, ToggleLeft, ToggleRight, Camera,
  Receipt, Laptop, Car, BookOpen, Phone, Eye, ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScanFactureModal } from '@/components/travaux/ScanFactureModal'

// ─── Types ────────────────────────────────────────────────────────────────

type IncidentStatus = 'open' | 'in_progress' | 'resolved'
type CategorieFiscale =
  | 'entretien_reparation'
  | 'amelioration'
  | 'travaux_deductibles'
  | 'travaux_amortissables'
  | 'construction_agrandissement'

type CategorieAnnexe =
  | 'materiel_informatique'
  | 'frais_gestion'
  | 'frais_deplacement'
  | 'abonnements'
  | 'fournitures'
  | 'honoraires'

type RegimeAnnexe = 'bic_lmnp' | 'bic_airbnb' | 'sci_is' | 'sci_ir'

interface CategorieConfig {
  label: string
  color: string
  bg: string
  border: string
  tooltip: string
  deductible: 'oui' | 'partiel' | 'non'
}

const REGIMES_ANNEXE: Record<RegimeAnnexe, { label: string; sub: string; color: string; bg: string; border: string }> = {
  bic_lmnp: {
    label: 'LMNP régime réel',
    sub: 'BIC meublé — 2042-C-PRO cases 5NA/5NY',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
  },
  bic_airbnb: {
    label: 'Location saisonnière / Airbnb',
    sub: 'BIC meublé — déclaration micro-BIC ou réel',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
  },
  sci_is: {
    label: 'SCI à l\'IS',
    sub: 'Liasse fiscale IS — charges déductibles du résultat',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
  },
  sci_ir: {
    label: 'SCI à l\'IR',
    sub: 'Revenus fonciers — 2044 · déductions limitées',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30',
  },
}

// Pour chaque catégorie, déductibilité selon le régime
type DeductStatus = 'oui' | 'partiel' | 'non'
const CATEGORIES_ANNEXE_REGIMES: Record<CategorieAnnexe, Record<RegimeAnnexe, { status: DeductStatus; note?: string }>> = {
  materiel_informatique: {
    bic_lmnp:    { status: 'oui',     note: 'Déductible < 500€ HT ou amortissable sur 3 ans au-delà' },
    bic_airbnb:  { status: 'oui',     note: 'Déductible < 500€ HT ou amortissable sur 3 ans au-delà' },
    sci_is:      { status: 'oui',     note: 'Amortissable en immobilisation ou déductible selon seuil' },
    sci_ir:      { status: 'non',     note: 'Non déductible en revenus fonciers (art. 31 CGI)' },
  },
  frais_gestion: {
    bic_lmnp:    { status: 'oui',     note: 'Frais bancaires, PNO, gestion locative, syndic...' },
    bic_airbnb:  { status: 'oui',     note: 'Commissions plateforme, assurance, frais bancaires...' },
    sci_is:      { status: 'oui',     note: 'Charges de gestion déductibles du résultat IS' },
    sci_ir:      { status: 'oui',     note: 'Frais de gestion déductibles (art. 31 CGI)' },
  },
  frais_deplacement: {
    bic_lmnp:    { status: 'oui',     note: 'Indemnités km (barème fiscal) ou frais réels' },
    bic_airbnb:  { status: 'oui',     note: 'Déplacements pour gérer ou entretenir les biens' },
    sci_is:      { status: 'oui',     note: 'Frais réels justifiés liés à la gestion SCI' },
    sci_ir:      { status: 'partiel', note: 'Déductibles uniquement en frais réels justifiés, pas d\'indemnités km forfaitaires' },
  },
  abonnements: {
    bic_lmnp:    { status: 'oui',     note: 'Logiciel gestion locative, téléphone pro (quote-part), internet pro...' },
    bic_airbnb:  { status: 'oui',     note: 'Abonnements liés à la gestion (Airbnb, logiciel, téléphone pro)' },
    sci_is:      { status: 'oui',     note: 'Logiciels comptables et abonnements professionnels déductibles' },
    sci_ir:      { status: 'non',     note: 'Non déductible en revenus fonciers (hors cas très spécifiques)' },
  },
  fournitures: {
    bic_lmnp:    { status: 'oui',     note: 'Papier, timbres, classeurs, petites fournitures de gestion' },
    bic_airbnb:  { status: 'oui',     note: 'Fournitures de gestion et d\'accueil des locataires' },
    sci_is:      { status: 'oui',     note: 'Fournitures de bureau liées à la gestion de la SCI' },
    sci_ir:      { status: 'non',     note: 'Non déductible en revenus fonciers' },
  },
  honoraires: {
    bic_lmnp:    { status: 'oui',     note: 'Expert-comptable, avocat fiscaliste, conseiller en patrimoine' },
    bic_airbnb:  { status: 'oui',     note: 'Honoraires liés à la gestion et à la fiscalité' },
    sci_is:      { status: 'oui',     note: 'Honoraires comptable, avocat, commissaire aux comptes' },
    sci_ir:      { status: 'oui',     note: 'Honoraires de gestion et frais de procédure déductibles (art. 31 CGI)' },
  },
}

// ─── Config catégories fiscales ───────────────────────────────────────────

const CATEGORIES: Record<CategorieFiscale, CategorieConfig> = {
  entretien_reparation: {
    label: 'Entretien / Réparation',
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]',
    border: 'border-[var(--success)/20]',
    tooltip: 'Déductible immédiatement en charge (régime réel foncier ou BIC). Ex: remplacement robinet, peinture, réparation toiture.',
    deductible: 'oui',
  },
  amelioration: {
    label: 'Amélioration',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    tooltip: 'Déductible en foncier nu si apporte un confort nouveau au locataire (art. 31 CGI). En LMNP : amortissable. Ex: installation climatisation.',
    deductible: 'partiel',
  },
  travaux_deductibles: {
    label: 'Déductibles LMNP/BIC',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    tooltip: 'Charges déductibles du résultat BIC en LMNP régime réel. Réduit le résultat imposable de l\'exercice.',
    deductible: 'oui',
  },
  travaux_amortissables: {
    label: 'Amortissables LMNP',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    tooltip: 'Travaux à intégrer au plan d\'amortissement LMNP (agencements, mobilier...). Déductibles sur plusieurs années.',
    deductible: 'oui',
  },
  construction_agrandissement: {
    label: 'Construction / Agrandissement',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    tooltip: 'Non déductible en charge. Augmente le prix de revient du bien (impact sur la plus-value à la revente). Ex: extension, surélévation.',
    deductible: 'non',
  },
}

const CATEGORIES_ANNEXE: Record<CategorieAnnexe, { label: string; color: string; bg: string; border: string; icon: any }> = {
  materiel_informatique: {
    label: 'Matériel informatique',
    color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
    icon: Laptop,
  },
  frais_gestion: {
    label: 'Frais bancaires & gestion',
    color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    icon: Receipt,
  },
  frais_deplacement: {
    label: 'Frais de déplacement',
    color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20',
    icon: Car,
  },
  abonnements: {
    label: 'Abonnements & logiciels',
    color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20',
    icon: Phone,
  },
  fournitures: {
    label: 'Fournitures de bureau',
    color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20',
    icon: BookOpen,
  },
  honoraires: {
    label: 'Honoraires & conseils',
    color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20',
    icon: FileText,
  },
}

const FORM_ANNEXE_INITIAL = {
  title: '', description: '',
  date_travaux: '', nom_entreprise: '', numero_facture: '',
  cout_paye: '', est_paye: true,
  categorie_annexe: 'materiel_informatique' as CategorieAnnexe,
  regime: 'bic_lmnp' as RegimeAnnexe,
}

const STATUS_CONFIG: Record<IncidentStatus, { label: string; icon: any; color: string; bg: string }> = {
  open: { label: 'Planifié', icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-400/10' },
  in_progress: { label: 'En cours', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  resolved: { label: 'Terminé', icon: CheckCircle2, color: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]' },
}

const FORM_INITIAL = {
  property_id: '', title: '', description: '',
  date_travaux: '', nom_entreprise: '', numero_facture: '',
  cout_estime: '', cout_paye: '', est_paye: false,
  categorie_fiscale: 'entretien_reparation' as CategorieFiscale,
  status: 'open' as IncidentStatus,
}

// ─── Composant tooltip catégorie ─────────────────────────────────────────

function CategorieTooltip({ cat }: { cat: CategorieFiscale }) {
  const cfg = CATEGORIES[cat]
  return (
    <div className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 text-slate-600 cursor-help" />
      <div className="absolute bottom-5 left-0 w-72 px-3 py-2.5 bg-[var(--bg)] border border-border rounded-xl text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl">
        <p className="font-medium mb-1" style={{ color: cfg.color.replace('text-', '') }}>{cfg.label}</p>
        <p className="leading-relaxed">{cfg.tooltip}</p>
        <p className={`mt-1.5 font-medium ${cfg.deductible === 'oui' ? 'text-[var(--success)]' : cfg.deductible === 'partiel' ? 'text-amber-400' : 'text-red-400'}`}>
          {cfg.deductible === 'oui' ? '✓ Déductible' : cfg.deductible === 'partiel' ? '⚠ Déductible selon conditions' : '✗ Non déductible'}
        </p>
      </div>
    </div>
  )
}

// ─── Badge statut ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IncidentStatus }) {
  const { label, icon: Icon, color, bg } = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', bg, color, `border-current/20`)}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  )
}

// ─── Badge catégorie ─────────────────────────────────────────────────────

function CategorieBadge({ cat }: { cat: CategorieFiscale }) {
  const { label, color, bg, border } = CATEGORIES[cat]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', bg, color, border)}>
      {label}
    </span>
  )
}

// ─── Justificatifs multiples ───────────────────────────────────────────────
type FactureEntry = { path: string; name?: string; size?: number | null }

// Lit les justificatifs d'un incident en tolérant l'ancien champ facture_url.
function facturesOf(i: any): FactureEntry[] {
  if (Array.isArray(i?.factures) && i.factures.length) return i.factures
  if (i?.facture_url) return [{ path: i.facture_url, name: String(i.facture_url).split('/').pop() }]
  return []
}

// Bouton « Voir » : ouvre directement le justificatif depuis la liste, sans
// passer par la fenêtre d'édition. Un seul fichier → lien direct ; plusieurs →
// petit menu de sélection.
function VoirJustificatifs({ factures }: { factures: FactureEntry[] }) {
  const [open, setOpen] = useState(false)
  const href = (p: string) => `/api/storage/file?bucket=factures&src=${encodeURIComponent(p)}`
  const label = (f: FactureEntry) => f.name || f.path.split('/').pop() || 'justificatif'

  if (factures.length === 1) {
    return (
      <a href={href(factures[0].path)} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        title={label(factures[0])}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 text-blue-400 text-xs font-medium transition-colors">
        <Eye className="h-3.5 w-3.5" /> Voir
      </a>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        title={`${factures.length} justificatifs`}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 text-blue-400 text-xs font-medium transition-colors"
      >
        <Eye className="h-3.5 w-3.5" /> Voir <span className="opacity-70">({factures.length})</span>
      </button>
      {open && (
        <>
          {/* Ferme le menu au clic extérieur */}
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-border bg-[var(--bg-card)] shadow-xl overflow-hidden">
            {factures.map(f => (
              <a key={f.path} href={href(f.path)} target="_blank" rel="noopener noreferrer"
                onClick={e => { e.stopPropagation(); setOpen(false) }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-blue-400/10 transition-colors">
                <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{label(f)}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Gestionnaire de pièces jointes : liste les fichiers déjà attachés (voir /
// supprimer) et les fichiers en attente d'envoi. Réutilisé dans les 4 modales.
function FactureManager({
  incidentId, existing, onExistingChange, pending, onPendingChange, accent = 'blue',
}: {
  incidentId: string | null
  existing: FactureEntry[]
  onExistingChange: (next: FactureEntry[]) => void
  pending: File[]
  onPendingChange: (files: File[]) => void
  accent?: 'blue' | 'purple'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const removeExisting = async (path: string) => {
    if (!incidentId) return
    setRemoving(path)
    const res = await fetch('/api/travaux/facture/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: incidentId, path }),
    })
    setRemoving(null)
    if (!res.ok) { toast.error('Suppression impossible'); return }
    onExistingChange(existing.filter(f => f.path !== path))
  }

  const label = (f: FactureEntry) => f.name || f.path.split('/').pop() || 'justificatif'

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#0F172A]">Justificatifs</label>

      {existing.map(f => (
        <div key={f.path} className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary border border-border">
          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-[var(--text-primary)] truncate flex-1">{label(f)}</span>
          <a href={`/api/storage/file?bucket=factures&src=${encodeURIComponent(f.path)}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline flex-shrink-0">Voir</a>
          {incidentId && (
            <button type="button" onClick={() => removeExisting(f.path)} disabled={removing === f.path}
              className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/[0.06] flex-shrink-0">
              {removing === f.path
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                : <X className="h-3.5 w-3.5 text-slate-400" />}
            </button>
          )}
        </div>
      ))}

      {pending.map((file, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-green-400/5 border border-green-400/20">
          <Upload className="h-4 w-4 text-[var(--success)] flex-shrink-0" />
          <span className="text-sm text-[var(--success)] truncate flex-1">{file.name}</span>
          <span className="text-[10px] text-slate-500 flex-shrink-0">à envoyer</span>
          <button type="button" onClick={() => onPendingChange(pending.filter((_, i) => i !== idx))}
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/[0.06] flex-shrink-0">
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      ))}

      <button type="button" onClick={() => inputRef.current?.click()}
        className={cn('w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed text-sm transition-all',
          accent === 'purple' ? 'border-border text-slate-400 hover:border-purple-400/40 hover:bg-purple-400/5'
                              : 'border-border text-slate-400 hover:border-blue-400/40 hover:bg-blue-400/5')}>
        <Plus className="h-4 w-4" /> Ajouter des fichiers
      </button>
      <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.heic,.heif" className="hidden"
        onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) onPendingChange([...pending, ...fs]); e.currentTarget.value = '' }} />
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────

export default function TravauxPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'travaux' | 'annexes'>('travaux')
  const [incidents, setIncidents] = useState<any[]>([])
  const [depenses, setDepenses] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddAnnexe, setShowAddAnnexe] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [form, setForm] = useState(FORM_INITIAL)
  const [formAnnexe, setFormAnnexe] = useState(FORM_ANNEXE_INITIAL)
  const [savingAnnexe, setSavingAnnexe] = useState(false)
  const [editingAnnexe, setEditingAnnexe] = useState<any>(null)
  const [editAnnexeForm, setEditAnnexeForm] = useState<typeof FORM_ANNEXE_INITIAL>(FORM_ANNEXE_INITIAL)
  const [annexeFiles, setAnnexeFiles] = useState<File[]>([])
  const [editAnnexeFactures, setEditAnnexeFactures] = useState<FactureEntry[]>([])
  const [editAnnexeNewFiles, setEditAnnexeNewFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [editingIncident, setEditingIncident] = useState<any>(null)
  const [editForm, setEditForm] = useState<typeof FORM_INITIAL & { id?: string }>(FORM_INITIAL)
  const [editSaving, setEditSaving] = useState(false)
  const [editFactures, setEditFactures] = useState<FactureEntry[]>([])
  const [editNewFiles, setEditNewFiles] = useState<File[]>([])
  const supabase = createClient()

  const load = async () => {
    const [incRes, propRes, depRes] = await Promise.all([
      supabase.from('incidents')
        .select('*, property:properties(name, city, type)')
        .not('property_id', 'is', null)
        .order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name, type').order('name'),
      supabase.from('incidents')
        .select('*')
        .is('property_id', null)
        .order('created_at', { ascending: false }),
    ])
    setIncidents(incRes.data ?? [])
    setProperties(propRes.data ?? [])
    setDepenses(depRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  // Envoie une série de fichiers vers un incident (append au tableau factures).
  // Renvoie true si tout a été envoyé, false s'il y a eu au moins une erreur —
  // pour que l'appelant sache s'il peut fermer la fenêtre sans perte silencieuse.
  const uploadFiles = async (files: File[], incidentId: string): Promise<boolean> => {
    let allOk = true
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('incident_id', incidentId)
      try {
        const res = await fetch('/api/travaux/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          allOk = false
          const body = await res.json().catch(() => ({}))
          toast.error(`« ${file.name} » n'a pas pu être enregistré : ${body.error || 'erreur serveur'}`, { duration: 8000 })
        }
      } catch {
        allOk = false
        toast.error(`« ${file.name} » n'a pas pu être envoyé — vérifiez votre connexion.`, { duration: 8000 })
      }
    }
    return allOk
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // 1. Créer l'incident
    const { data: incident, error } = await supabase.from('incidents').insert({
      property_id: form.property_id,
      title: form.title,
      description: form.description || null,
      status: form.status,
      cost: Number(form.cout_paye) || Number(form.cout_estime) || 0,
      cout_estime: Number(form.cout_estime) || 0,
      cout_paye: Number(form.cout_paye) || 0,
      est_paye: form.est_paye,
      date_travaux: form.date_travaux || null,
      nom_entreprise: form.nom_entreprise || null,
      numero_facture: form.numero_facture || null,
      categorie_fiscale: form.categorie_fiscale,
      reported_by: 'owner',
    }).select().single()

    if (error) { toast.error(error.message); setSaving(false); return }

    // 2. Upload des justificatifs sélectionnés
    if (incident && pendingFiles.length) await uploadFiles(pendingFiles, incident.id)

    setSaving(false)
    toast.success('Ticket créé avec succès')
    setShowAdd(false)
    setForm(FORM_INITIAL)
    setPendingFiles([])
    load()
  }

  const handleStatusChange = async (id: string, status: IncidentStatus) => {
    await supabase.from('incidents').update({
      status,
      ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    load()
  }

  const handleTogglePaye = async (id: string, est_paye: boolean, cout_paye: number) => {
    await supabase.from('incidents').update({ est_paye: !est_paye }).eq('id', id)
    load()
  }

  const openEdit = (inc: any) => {
    setEditingIncident(inc)
    setEditForm({
      property_id: inc.property_id ?? '',
      title: inc.title ?? '',
      description: inc.description ?? '',
      date_travaux: inc.date_travaux ?? '',
      nom_entreprise: inc.nom_entreprise ?? '',
      numero_facture: inc.numero_facture ?? '',
      cout_estime: inc.cout_estime ?? '',
      cout_paye: inc.cout_paye ?? '',
      est_paye: inc.est_paye ?? false,
      categorie_fiscale: inc.categorie_fiscale ?? 'entretien_reparation',
      status: inc.status ?? 'open',
    })
    setEditFactures(facturesOf(inc))
    setEditNewFiles([])
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSaving(true)
    const { error } = await supabase.from('incidents').update({
      title: editForm.title,
      description: editForm.description || null,
      status: editForm.status,
      cout_estime: Number(editForm.cout_estime) || 0,
      cout_paye: Number(editForm.cout_paye) || 0,
      est_paye: editForm.est_paye,
      date_travaux: editForm.date_travaux || null,
      nom_entreprise: editForm.nom_entreprise || null,
      numero_facture: editForm.numero_facture || null,
      categorie_fiscale: editForm.categorie_fiscale,
      cost: Number(editForm.cout_paye) || Number(editForm.cout_estime) || 0,
    }).eq('id', editingIncident.id)
    if (error) { toast.error(error.message); setEditSaving(false); return }
    const nFiles = editNewFiles.length
    const filesOk = nFiles ? await uploadFiles(editNewFiles, editingIncident.id) : true
    setEditSaving(false)
    // Confirmation explicite du nombre de fichiers réellement enregistrés —
    // un "Ticket mis à jour" générique ne suffit pas à prouver qu'un
    // justificatif joint a bien été sauvegardé.
    if (nFiles && filesOk) toast.success(`Ticket mis à jour · ${nFiles} justificatif${nFiles > 1 ? 's' : ''} enregistré${nFiles > 1 ? 's' : ''}`)
    else toast.success('Ticket mis à jour')
    if (filesOk) { setEditingIncident(null); setEditNewFiles([]) }
    load()
  }

  const handleSubmitAnnexe = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAnnexe(true)
    // Une dépense annexe n'est rattachée à aucun bien : son propriétaire est
    // porté par user_id (voir migration 004 + policy RLS des annexes).
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Session expirée'); setSavingAnnexe(false); return }
    const { data: dep, error } = await supabase.from('incidents').insert({
      property_id: null,
      user_id: user.id,
      title: formAnnexe.title,
      description: formAnnexe.description || null,
      status: 'resolved',
      cost: Number(formAnnexe.cout_paye) || 0,
      cout_paye: Number(formAnnexe.cout_paye) || 0,
      cout_estime: Number(formAnnexe.cout_paye) || 0,
      est_paye: formAnnexe.est_paye,
      date_travaux: formAnnexe.date_travaux || null,
      nom_entreprise: formAnnexe.nom_entreprise || null,
      numero_facture: formAnnexe.numero_facture || null,
      categorie_fiscale: formAnnexe.categorie_annexe,
      reported_by: formAnnexe.regime,
    }).select().single()
    if (error) { toast.error(error.message); setSavingAnnexe(false); return }
    if (dep && annexeFiles.length) await uploadFiles(annexeFiles, dep.id)
    setSavingAnnexe(false)
    toast.success('Dépense enregistrée')
    setShowAddAnnexe(false)
    setFormAnnexe(FORM_ANNEXE_INITIAL)
    setAnnexeFiles([])
    load()
  }

  const handleSaveAnnexe = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAnnexe(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Session expirée'); setSavingAnnexe(false); return }
    const { error } = await supabase.from('incidents').update({
      user_id: user.id,
      title: editAnnexeForm.title,
      description: editAnnexeForm.description || null,
      cost: Number(editAnnexeForm.cout_paye) || 0,
      cout_paye: Number(editAnnexeForm.cout_paye) || 0,
      cout_estime: Number(editAnnexeForm.cout_paye) || 0,
      est_paye: editAnnexeForm.est_paye,
      date_travaux: editAnnexeForm.date_travaux || null,
      nom_entreprise: editAnnexeForm.nom_entreprise || null,
      numero_facture: editAnnexeForm.numero_facture || null,
      categorie_fiscale: editAnnexeForm.categorie_annexe,
      reported_by: editAnnexeForm.regime,
    }).eq('id', editingAnnexe.id)
    if (error) { toast.error(error.message); setSavingAnnexe(false); return }
    const nFiles2 = editAnnexeNewFiles.length
    const filesOk = nFiles2 ? await uploadFiles(editAnnexeNewFiles, editingAnnexe.id) : true
    setSavingAnnexe(false)
    if (nFiles2 && filesOk) toast.success(`Dépense mise à jour · ${nFiles2} justificatif${nFiles2 > 1 ? 's' : ''} enregistré${nFiles2 > 1 ? 's' : ''}`)
    else toast.success('Dépense mise à jour')
    if (filesOk) { setEditingAnnexe(null); setEditAnnexeNewFiles([]) }
    load()
  }

  const handleDeleteIncident = async (id: string) => {
    if (!confirm('Supprimer ce ticket ?')) return
    await supabase.from('incidents').delete().eq('id', id)
    setEditingIncident(null)
    load()
  }

  const now = new Date()

  // Année d'un travail : date des travaux si renseignée, sinon date de création
  const incYear = (i: any) => new Date(i.date_travaux ?? i.created_at).getFullYear()

  // Années disponibles (toujours inclure l'année en cours), triées du plus récent au plus ancien
  const availableYears = Array.from(
    new Set<number>([now.getFullYear(), ...incidents.map(incYear), ...depenses.map(incYear)])
  ).sort((a, b) => b - a)

  // Dépenses annexes de l'année sélectionnée
  const yearDepenses = depenses.filter(d => incYear(d) === selectedYear)
  const totalDepensesAnnexe = yearDepenses.filter(d => d.est_paye).reduce((s, d) => s + (d.cout_paye || 0), 0)

  // Travaux de l'année sélectionnée
  const yearIncidents = incidents.filter(i => incYear(i) === selectedYear)

  const stats = {
    deductibles: yearIncidents
      .filter(i => ['entretien_reparation', 'travaux_deductibles'].includes(i.categorie_fiscale) && i.est_paye)
      .reduce((s, i) => s + (i.cout_paye || 0), 0),
    amortissables: yearIncidents
      .filter(i => ['travaux_amortissables', 'amelioration'].includes(i.categorie_fiscale) && i.est_paye)
      .reduce((s, i) => s + (i.cout_paye || 0), 0),
    nonPaye: yearIncidents
      .filter(i => !i.est_paye)
      .reduce((s, i) => s + Math.max(0, (i.cout_estime || 0) - (i.cout_paye || 0)), 0),
    facturesManquantes: yearIncidents.filter(i => i.est_paye && facturesOf(i).length === 0).length,
  }

  // Grouper par bien (année sélectionnée)
  const byProperty: Record<string, { name: string; items: any[] }> = {}
  for (const inc of yearIncidents) {
    const pid = inc.property_id
    if (!byProperty[pid]) byProperty[pid] = { name: inc.property?.name ?? 'Bien inconnu', items: [] }
    byProperty[pid].items.push(inc)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <button
        onClick={() => (window.history.length > 1 ? router.back() : router.push('/dashboard'))}
        className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--text-tertiary)' }}
        aria-label="Retour"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Travaux & Dépenses</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {selectedYear} · {yearIncidents.filter(i => i.status !== 'resolved').length} travaux en cours · {yearDepenses.length} dépenses annexes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/travaux/devis"
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all border"
            style={{
              background: '#fff',
              borderColor: '#1D4ED8',
              color: '#1D4ED8',
            }}>
            <BarChart2 className="h-4 w-4" /> Comparer devis
          </Link>
          <button onClick={() => setShowScan(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border transition-all"
            style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
            <Camera className="h-4 w-4" /> Scanner facture
          </button>
          {activeTab === 'travaux' ? (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold transition-all shadow-sm"
              style={{ background: '#1D4ED8' }}>
              <Plus className="h-4 w-4" /> Nouveau ticket
            </button>
          ) : (
            <button onClick={() => setShowAddAnnexe(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold transition-all shadow-sm"
              style={{ background: '#7C3AED' }}>
              <Plus className="h-4 w-4" /> Nouvelle dépense
            </button>
          )}
        </div>
      </div>

      {/* ── Onglets Travaux / Dépenses annexes ── */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl w-fit">
        <button onClick={() => setActiveTab('travaux')}
          className={cn('px-4 h-9 rounded-lg text-sm font-semibold transition-all', activeTab === 'travaux' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-[var(--text-primary)]')}>
          <Wrench className="h-3.5 w-3.5 inline mr-1.5" />Travaux & Incidents
        </button>
        <button onClick={() => setActiveTab('annexes')}
          className={cn('px-4 h-9 rounded-lg text-sm font-semibold transition-all', activeTab === 'annexes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-[var(--text-primary)]')}>
          <Receipt className="h-3.5 w-3.5 inline mr-1.5" />Dépenses annexes
          {yearDepenses.length > 0 && <span className="ml-1.5 text-xs bg-purple-400/20 text-purple-400 px-1.5 py-0.5 rounded-full">{yearDepenses.length}</span>}
        </button>
      </div>

      {/* ── Sélecteur d'année ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {availableYears.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={cn(
              'px-4 h-9 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border',
              y === selectedYear
                ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-[#1D4ED8]/40 hover:text-[#1D4ED8]'
            )}
          >
            {y}
            {y === now.getFullYear() && (
              <span className="ml-1.5 text-[10px] font-normal opacity-70">en cours</span>
            )}
          </button>
        ))}
      </div>

      {/* ── SECTION 3 — Résumé fiscal ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard glow="green" className="p-4">
          <p className="text-sm font-medium text-[#0F172A] mb-1.5 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
            Déductibles {selectedYear}
          </p>
          <p className="text-xl font-bold font-mono text-[var(--success)]">{formatCurrency(stats.deductibles)}</p>
          <p className="text-xs text-slate-600 mt-0.5">entretien + charges BIC payés</p>
        </GlassCard>
        <GlassCard glow="cyan" className="p-4">
          <p className="text-sm font-medium text-[#0F172A] mb-1.5 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
            Amortissables {selectedYear}
          </p>
          <p className="text-xl font-bold font-mono text-cyan-400">{formatCurrency(stats.amortissables)}</p>
          <p className="text-xs text-slate-600 mt-0.5">à intégrer plan amortissement</p>
        </GlassCard>
        <GlassCard glow="amber" className="p-4">
          <p className="text-sm font-medium text-[#0F172A] mb-1.5 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
            Non encore payés
          </p>
          <p className="text-xl font-bold font-mono text-amber-400">{formatCurrency(stats.nonPaye)}</p>
          <p className="text-xs text-slate-600 mt-0.5">estimé - payé</p>
        </GlassCard>
        <GlassCard glow="red" className="p-4">
          <p className="text-sm font-medium text-[#0F172A] mb-1.5 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
            Factures manquantes
          </p>
          <p className="text-xl font-bold font-mono text-red-400">{stats.facturesManquantes}</p>
          <p className="text-xs text-slate-600 mt-0.5">payé sans justificatif</p>
        </GlassCard>
      </div>

      {/* ── SECTION DÉPENSES ANNEXES ── */}
      {activeTab === 'annexes' && (
        <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-400" /> Dépenses annexes {selectedYear}
              </h2>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total déductible</p>
                <p className="text-lg font-bold font-mono text-purple-400">{formatCurrency(totalDepensesAnnexe)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4 bg-purple-400/5 border border-purple-400/10 rounded-lg p-2.5">
              Ces frais de gestion sont déductibles selon votre régime : en <strong className="text-purple-400">LMNP réel</strong> (BIC — cases 5NA/5NY), en <strong className="text-cyan-400">SCI à l'IS</strong> (charges déductibles du résultat), en <strong className="text-amber-400">location saisonnière</strong> (BIC meublé). Matériel informatique, logiciels, frais kilométriques, fournitures, honoraires comptable...
            </p>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
            ) : yearDepenses.length === 0 ? (
              <div className="text-center py-10">
                <Receipt className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Aucune dépense annexe pour {selectedYear}</p>
                <button onClick={() => setShowAddAnnexe(true)} className="mt-3 text-sm text-purple-400 hover:text-purple-300">
                  + Ajouter une dépense
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {yearDepenses.map(dep => {
                  const cat = dep.categorie_fiscale as CategorieAnnexe
                  const cfg = CATEGORIES_ANNEXE[cat] ?? CATEGORIES_ANNEXE.fournitures
                  const Icon = cfg.icon
                  return (
                    <div key={dep.id} onClick={() => { setEditingAnnexe(dep); setEditAnnexeFactures(facturesOf(dep)); setEditAnnexeNewFiles([]); setEditAnnexeForm({ title: dep.title ?? '', description: dep.description ?? '', date_travaux: dep.date_travaux ?? '', nom_entreprise: dep.nom_entreprise ?? '', numero_facture: dep.numero_facture ?? '', cout_paye: dep.cout_paye ?? '', est_paye: dep.est_paye ?? true, categorie_annexe: cat, regime: (['bic_lmnp','bic_airbnb','sci_is','sci_ir'].includes(dep.reported_by) ? dep.reported_by : 'bic_lmnp') as RegimeAnnexe }) }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:bg-white/[0.04] cursor-pointer transition-colors">
                      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                        <Icon className={cn('h-4 w-4', cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{dep.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {(() => {
                            const regime = ['bic_lmnp','bic_airbnb','sci_is','sci_ir'].includes(dep.reported_by) ? dep.reported_by as RegimeAnnexe : null
                            const rcfg = regime ? REGIMES_ANNEXE[regime] : null
                            return rcfg ? <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', rcfg.bg, rcfg.color, rcfg.border)}>{rcfg.label}</span> : null
                          })()}
                          <span className="text-xs text-slate-500">{cfg.label}{dep.nom_entreprise ? ` · ${dep.nom_entreprise}` : ''}{dep.date_travaux ? ` · ${format(new Date(dep.date_travaux), 'dd/MM/yy')}` : ''}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn('text-sm font-semibold font-mono', dep.est_paye ? 'text-[var(--success)]' : 'text-amber-400')}>
                          {formatCurrency(dep.cout_paye || 0)}
                        </p>
                        {!dep.est_paye && <p className="text-xs text-amber-400">À payer</p>}
                      </div>
                      {(() => {
                        const fj = facturesOf(dep)
                        return fj.length > 0 ? (
                          <div className="flex-shrink-0"><VoirJustificatifs factures={fj} /></div>
                        ) : (
                          <span
                            title={dep.est_paye ? 'Facture manquante — joindre un justificatif' : 'Joindre un justificatif'}
                            className={cn(
                              'inline-flex items-center gap-1 h-7 px-2 rounded-lg border text-xs font-medium flex-shrink-0',
                              dep.est_paye
                                ? 'bg-amber-400/10 border-amber-400/30 text-amber-500'
                                : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
                            )}
                          >
                            {dep.est_paye && <AlertTriangle className="h-3 w-3" />}
                            <Paperclip className="h-3 w-3" />
                            Joindre
                          </span>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── SECTION 2 — Liste par bien ── */}
      {activeTab === 'travaux' && (loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : yearIncidents.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <Wrench className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">Aucun travaux pour {selectedYear}</p>
          {incidents.length > 0 && availableYears.some(y => y !== selectedYear) && (
            <p className="mt-2 text-xs text-slate-500">
              Sélectionnez une autre année ci-dessus pour consulter l'historique.
            </p>
          )}
          <button onClick={() => setShowAdd(true)} className="mt-4 text-sm text-blue-400 hover:text-blue-300">
            + Créer un ticket pour {selectedYear}
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {Object.entries(byProperty).map(([pid, { name, items }]) => (
            <GlassCard key={pid}>
              <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                {name}
                <span className="text-xs text-slate-500 font-normal">{items.length} ticket{items.length > 1 ? 's' : ''}</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                      {['Date', 'Entreprise', 'Travaux', 'Estimé', 'Payé', 'Statut', 'Catégorie fiscale', '__doc__'].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-medium">
                          {h === '__doc__'
                            ? <Paperclip className="h-3.5 w-3.5 text-slate-400" aria-label="Justificatif" />
                            : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(inc => {
                      const cat = (inc.categorie_fiscale ?? 'entretien_reparation') as CategorieFiscale
                      const catCfg = CATEGORIES[cat]
                      return (
                        <tr key={inc.id} onClick={() => openEdit(inc)} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer">
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {inc.date_travaux ? format(new Date(inc.date_travaux), 'dd/MM/yy') : '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-300 max-w-[120px] truncate">
                            {inc.nom_entreprise || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-3 px-3">
                            <p className="text-[var(--text-primary)] font-medium">{inc.title}</p>
                            {inc.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{inc.description}</p>
                            )}
                            {inc.numero_facture && (
                              <p className="text-xs text-slate-600 mt-0.5">Facture #{inc.numero_facture}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {inc.cout_estime ? formatCurrency(inc.cout_estime) : '—'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {inc.est_paye ? (
                              <button
                                onClick={() => handleTogglePaye(inc.id, inc.est_paye, inc.cout_paye)}
                                className="flex items-center gap-1.5 text-[var(--success)] hover:text-green-300 transition-colors"
                              >
                                <ToggleRight className="h-4 w-4" />
                                <span className="font-semibold font-mono">{formatCurrency(inc.cout_paye || 0)}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePaye(inc.id, inc.est_paye, inc.cout_paye)}
                                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors"
                              >
                                <ToggleLeft className="h-4 w-4" />
                                <span className="text-xs font-mono">{inc.cout_estime ? formatCurrency(inc.cout_estime) : '—'}</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                            <select
                              value={inc.status}
                              onChange={e => handleStatusChange(inc.id, e.target.value as IncidentStatus)}
                              className="bg-transparent text-xs border-0 focus:outline-none cursor-pointer"
                              style={{ color: STATUS_CONFIG[inc.status as IncidentStatus].color.replace('text-', '') }}
                            >
                              <option value="open" className="bg-[var(--surface)]">Planifié</option>
                              <option value="in_progress" className="bg-[var(--surface)]">En cours</option>
                              <option value="resolved" className="bg-[var(--surface)]">Terminé</option>
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <CategorieBadge cat={cat} />
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const fj = facturesOf(inc)
                              return fj.length > 0 ? (
                                <VoirJustificatifs factures={fj} />
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); openEdit(inc) }}
                                  title={inc.est_paye ? 'Facture manquante — joindre un justificatif' : 'Joindre un justificatif'}
                                  className={cn(
                                    'inline-flex items-center gap-1 h-7 px-2 rounded-lg border text-xs font-medium transition-colors',
                                    inc.est_paye
                                      ? 'bg-amber-400/10 border-amber-400/30 text-amber-500 hover:bg-amber-400/20'
                                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
                                  )}
                                >
                                  {inc.est_paye && <AlertTriangle className="h-3 w-3" />}
                                  <Paperclip className="h-3 w-3" />
                                  Joindre
                                </button>
                              )
                            })()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/[0.08] bg-white/[0.02]">
                      <td colSpan={3} className="py-2.5 px-3 text-xs font-semibold text-slate-400">
                        Total {name}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-slate-400">
                        {formatCurrency(items.reduce((s, i) => s + (i.cout_estime || 0), 0))}
                      </td>
                      <td className="py-2.5 px-3 text-sm font-bold font-mono text-[var(--success)]">
                        {formatCurrency(items.filter(i => i.est_paye).reduce((s, i) => s + (i.cout_paye || 0), 0))}
                        {items.some(i => !i.est_paye) && (
                          <span className="ml-2 text-xs font-normal text-amber-400">
                            + {formatCurrency(items.filter(i => !i.est_paye).reduce((s, i) => s + (i.cout_estime || 0), 0))} estimé
                          </span>
                        )}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </GlassCard>
          ))}
        </div>
      ))}

      {/* ── MODAL AJOUT DÉPENSE ANNEXE ── */}
      {showAddAnnexe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddAnnexe(false); setFormAnnexe(FORM_ANNEXE_INITIAL); setAnnexeFiles([]) }} />
          <div className="relative w-full max-w-lg bg-[var(--surface)] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-[var(--surface)] border-b border-white/[0.06] z-10">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-400" />
                <h2 className="font-display font-semibold text-[var(--text-primary)]">Nouvelle dépense annexe</h2>
              </div>
              <button onClick={() => { setShowAddAnnexe(false); setFormAnnexe(FORM_ANNEXE_INITIAL); setAnnexeFiles([]) }}
                className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmitAnnexe} className="p-6 space-y-4">
              {/* Étape 1 — Régime fiscal */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Régime fiscal *</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(Object.entries(REGIMES_ANNEXE) as [RegimeAnnexe, typeof REGIMES_ANNEXE[RegimeAnnexe]][]).map(([val, cfg]) => (
                    <button type="button" key={val} onClick={() => setFormAnnexe(f => ({ ...f, regime: val }))}
                      className={cn('flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all',
                        formAnnexe.regime === val ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]')}>
                      <div className="flex-1">
                        <p className="font-medium">{cfg.label}</p>
                        <p className="text-xs opacity-60 mt-0.5">{cfg.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Étape 2 — Catégorie selon le régime */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Catégorie *</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(Object.entries(CATEGORIES_ANNEXE) as [CategorieAnnexe, typeof CATEGORIES_ANNEXE[CategorieAnnexe]][]).map(([val, cfg]) => {
                    const Icon = cfg.icon
                    const regleRegime = CATEGORIES_ANNEXE_REGIMES[val][formAnnexe.regime]
                    const isNon = regleRegime.status === 'non'
                    const isPartiel = regleRegime.status === 'partiel'
                    return (
                      <button type="button" key={val}
                        disabled={isNon}
                        onClick={() => !isNon && setFormAnnexe(f => ({ ...f, categorie_annexe: val }))}
                        className={cn('flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all',
                          isNon ? 'opacity-40 cursor-not-allowed border-white/[0.04] bg-white/[0.01]' :
                          formAnnexe.categorie_annexe === val ? `${cfg.bg} ${cfg.border} ${cfg.color}` :
                          'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]')}>
                        <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{cfg.label}</p>
                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              isNon ? 'bg-red-400/10 text-red-400' :
                              isPartiel ? 'bg-amber-400/10 text-amber-400' :
                              'bg-green-400/10 text-green-400')}>
                              {isNon ? '✗ Non déductible' : isPartiel ? '⚠ Conditions' : '✓ Déductible'}
                            </span>
                          </div>
                          <p className="text-xs opacity-60 mt-0.5 leading-relaxed">{regleRegime.note}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Description *</label>
                <input type="text" required value={formAnnexe.title} onChange={e => setFormAnnexe(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Achat MacBook Pro pour gestion locative"
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date</label>
                  <input type="date" value={formAnnexe.date_travaux} onChange={e => setFormAnnexe(f => ({ ...f, date_travaux: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Fournisseur</label>
                  <input type="text" value={formAnnexe.nom_entreprise} onChange={e => setFormAnnexe(f => ({ ...f, nom_entreprise: e.target.value }))}
                    placeholder="Apple, Amazon..."
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Montant (€) *</label>
                  <input type="number" step="0.01" required value={formAnnexe.cout_paye} onChange={e => setFormAnnexe(f => ({ ...f, cout_paye: e.target.value }))}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">N° facture</label>
                  <input type="text" value={formAnnexe.numero_facture} onChange={e => setFormAnnexe(f => ({ ...f, numero_facture: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setFormAnnexe(f => ({ ...f, est_paye: !f.est_paye }))}
                  className={cn('h-6 w-11 rounded-full transition-colors relative flex-shrink-0', formAnnexe.est_paye ? 'bg-green-500' : 'bg-bg-secondary')}>
                  <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', formAnnexe.est_paye ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
                <span className="text-sm text-slate-300">Dépense payée</span>
              </div>
              <FactureManager incidentId={null} existing={[]} onExistingChange={() => {}}
                pending={annexeFiles} onPendingChange={setAnnexeFiles} accent="purple" />
              <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={() => { setShowAddAnnexe(false); setFormAnnexe(FORM_ANNEXE_INITIAL) }}
                  className="flex-1 h-10 rounded-lg border border-border text-slate-400 text-sm">Annuler</button>
                <button type="submit" disabled={savingAnnexe}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: '#7C3AED' }}>
                  {savingAnnexe ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><Plus className="h-4 w-4" /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL ÉDITION DÉPENSE ANNEXE ── */}
      {editingAnnexe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingAnnexe(null)} />
          <div className="relative w-full max-w-lg bg-[var(--surface)] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-[var(--surface)] border-b border-white/[0.06] z-10">
              <h2 className="font-display font-semibold text-[var(--text-primary)]">Modifier la dépense</h2>
              <div className="flex items-center gap-2">
                <button onClick={async () => { if (!confirm('Supprimer cette dépense ?')) return; await supabase.from('incidents').delete().eq('id', editingAnnexe.id); setEditingAnnexe(null); load() }}
                  className="h-8 px-3 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium">Supprimer</button>
                <button onClick={() => setEditingAnnexe(null)} className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>
              </div>
            </div>
            <form onSubmit={handleSaveAnnexe} className="p-6 space-y-4">
              {/* Régime */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Régime fiscal</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(REGIMES_ANNEXE) as [RegimeAnnexe, typeof REGIMES_ANNEXE[RegimeAnnexe]][]).map(([val, cfg]) => (
                    <button type="button" key={val} onClick={() => setEditAnnexeForm(f => ({ ...f, regime: val }))}
                      className={cn('flex flex-col px-3 py-2 rounded-xl border text-left text-xs transition-all',
                        editAnnexeForm.regime === val ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]')}>
                      <span className="font-semibold">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Catégorie filtrée par régime */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Catégorie</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(Object.entries(CATEGORIES_ANNEXE) as [CategorieAnnexe, typeof CATEGORIES_ANNEXE[CategorieAnnexe]][]).map(([val, cfg]) => {
                    const Icon = cfg.icon
                    const regleRegime = CATEGORIES_ANNEXE_REGIMES[val][editAnnexeForm.regime]
                    const isNon = regleRegime.status === 'non'
                    const isPartiel = regleRegime.status === 'partiel'
                    return (
                      <button type="button" key={val}
                        disabled={isNon}
                        onClick={() => !isNon && setEditAnnexeForm(f => ({ ...f, categorie_annexe: val }))}
                        className={cn('flex items-start gap-3 px-3 py-2 rounded-xl border text-left text-sm transition-all',
                          isNon ? 'opacity-40 cursor-not-allowed border-white/[0.04] bg-white/[0.01]' :
                          editAnnexeForm.categorie_annexe === val ? `${cfg.bg} ${cfg.border} ${cfg.color}` :
                          'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]')}>
                        <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cfg.label}</span>
                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              isNon ? 'bg-red-400/10 text-red-400' :
                              isPartiel ? 'bg-amber-400/10 text-amber-400' :
                              'bg-green-400/10 text-green-400')}>
                              {isNon ? '✗' : isPartiel ? '⚠' : '✓'}
                            </span>
                          </div>
                          {(isPartiel || isNon) && <p className="text-xs opacity-60 mt-0.5">{regleRegime.note}</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Description</label>
                <input type="text" required value={editAnnexeForm.title} onChange={e => setEditAnnexeForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date</label>
                  <input type="date" value={editAnnexeForm.date_travaux} onChange={e => setEditAnnexeForm(f => ({ ...f, date_travaux: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Fournisseur</label>
                  <input type="text" value={editAnnexeForm.nom_entreprise} onChange={e => setEditAnnexeForm(f => ({ ...f, nom_entreprise: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Montant (€)</label>
                  <input type="number" step="0.01" value={editAnnexeForm.cout_paye} onChange={e => setEditAnnexeForm(f => ({ ...f, cout_paye: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">N° facture</label>
                  <input type="text" value={editAnnexeForm.numero_facture} onChange={e => setEditAnnexeForm(f => ({ ...f, numero_facture: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditAnnexeForm(f => ({ ...f, est_paye: !f.est_paye }))}
                  className={cn('h-6 w-11 rounded-full transition-colors relative flex-shrink-0', editAnnexeForm.est_paye ? 'bg-green-500' : 'bg-bg-secondary')}>
                  <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', editAnnexeForm.est_paye ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
                <span className="text-sm text-slate-300">Dépense payée</span>
              </div>
              <FactureManager incidentId={editingAnnexe.id} existing={editAnnexeFactures} onExistingChange={setEditAnnexeFactures}
                pending={editAnnexeNewFiles} onPendingChange={setEditAnnexeNewFiles} accent="purple" />
              <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={() => setEditingAnnexe(null)} className="flex-1 h-10 rounded-lg border border-border text-slate-400 text-sm">Annuler</button>
                <button type="submit" disabled={savingAnnexe}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: '#7C3AED' }}>
                  {savingAnnexe ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AJOUT ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAdd(false); setForm(FORM_INITIAL); setPendingFiles([]) }} />
          <div className="relative w-full max-w-2xl bg-[var(--surface)] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-[var(--surface)] border-b border-white/[0.06] z-10">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-400" />
                <h2 className="font-display font-semibold text-[var(--text-primary)]">Nouveau ticket travaux</h2>
              </div>
              <button onClick={() => { setShowAdd(false); setForm(FORM_INITIAL); setPendingFiles([]) }}
                className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-secondary">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Bien + Statut */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Bien concerné *</label>
                  <select value={form.property_id} onChange={e => set('property_id', e.target.value)} required
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50">
                    <option value="" className="bg-[var(--surface)]">Sélectionner un bien</option>
                    {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Statut</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                    <option value="open" className="bg-[var(--surface)]">Planifié</option>
                    <option value="in_progress" className="bg-[var(--surface)]">En cours</option>
                    <option value="resolved" className="bg-[var(--surface)]">Terminé</option>
                  </select>
                </div>
              </div>

              {/* Titre + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Titre des travaux *</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required
                    placeholder="Ex : Remplacement chaudière" className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date des travaux</label>
                  <input type="date" value={form.date_travaux} onChange={e => set('date_travaux', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Entreprise / Artisan</label>
                  <input type="text" value={form.nom_entreprise} onChange={e => set('nom_entreprise', e.target.value)}
                    placeholder="Ex : Plomberie Dupont" className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                  placeholder="Détails des travaux, problème constaté..." className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none resize-none focus:border-blue-500/50" />
              </div>

              {/* Montants */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Coût estimé (€)</label>
                  <input type="number" step="0.01" value={form.cout_estime} onChange={e => set('cout_estime', e.target.value)}
                    placeholder="0" className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Coût payé (€)</label>
                  <input type="number" step="0.01" value={form.cout_paye} onChange={e => set('cout_paye', e.target.value)}
                    placeholder="0" className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">N° facture</label>
                  <input type="text" value={form.numero_facture} onChange={e => set('numero_facture', e.target.value)}
                    placeholder="FAC-2026-001" className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>

              {/* Toggle payé */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('est_paye', !form.est_paye)}
                  className={cn('h-6 w-11 rounded-full transition-colors relative flex-shrink-0', form.est_paye ? 'bg-green-500' : 'bg-bg-secondary')}>
                  <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', form.est_paye ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
                <span className="text-sm text-slate-300">Facture payée</span>
                {form.est_paye && (
                  <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Payé
                  </span>
                )}
              </div>

              {/* Catégorie fiscale */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-slate-400">Catégorie fiscale</label>
                  <CategorieTooltip cat={form.categorie_fiscale} />
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {(Object.entries(CATEGORIES) as [CategorieFiscale, CategorieConfig][]).map(([val, cfg]) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => set('categorie_fiscale', val)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-sm transition-all',
                        form.categorie_fiscale === val
                          ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                          : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                      )}
                    >
                      <span className="font-medium">{cfg.label}</span>
                      <span className={cn('text-xs', cfg.deductible === 'oui' ? 'text-[var(--success)]' : cfg.deductible === 'partiel' ? 'text-amber-400' : 'text-red-400')}>
                        {cfg.deductible === 'oui' ? '✓ Déductible' : cfg.deductible === 'partiel' ? '⚠ Conditionnel' : '✗ Non déductible'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Justificatifs (plusieurs possibles, max 15 MB chacun) */}
              <FactureManager incidentId={null} existing={[]} onExistingChange={() => {}}
                pending={pendingFiles} onPendingChange={setPendingFiles} />

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={() => { setShowAdd(false); setForm(FORM_INITIAL); setPendingFiles([]) }}
                  className="flex-1 h-10 rounded-lg border border-border text-slate-400 hover:text-[var(--text-primary)] text-sm transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all disabled:opacity-50">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><Plus className="h-4 w-4" /> Créer le ticket</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL ÉDITION ── */}
      {editingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingIncident(null)} />
          <div className="relative w-full max-w-2xl bg-[var(--surface)] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-[var(--surface)] border-b border-white/[0.06] z-10">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-400" />
                <h2 className="font-display font-semibold text-[var(--text-primary)]">Modifier le ticket</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDeleteIncident(editingIncident.id)}
                  className="h-8 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all">
                  Supprimer
                </button>
                <button onClick={() => setEditingIncident(null)}
                  className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-secondary">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Statut</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as IncidentStatus }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                    <option value="open" className="bg-[var(--surface)]">Planifié</option>
                    <option value="in_progress" className="bg-[var(--surface)]">En cours</option>
                    <option value="resolved" className="bg-[var(--surface)]">Terminé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Date des travaux</label>
                  <input type="date" value={editForm.date_travaux} onChange={e => setEditForm(f => ({ ...f, date_travaux: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Titre *</label>
                <input type="text" required value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Entreprise / Artisan</label>
                  <input type="text" value={editForm.nom_entreprise} onChange={e => setEditForm(f => ({ ...f, nom_entreprise: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">N° facture</label>
                  <input type="text" value={editForm.numero_facture} onChange={e => setEditForm(f => ({ ...f, numero_facture: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Description</label>
                <textarea rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Coût estimé (€)</label>
                  <input type="number" step="0.01" value={editForm.cout_estime} onChange={e => setEditForm(f => ({ ...f, cout_estime: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Coût payé (€)</label>
                  <input type="number" step="0.01" value={editForm.cout_paye}
                    onChange={e => setEditForm(f => ({ ...f, cout_paye: e.target.value, est_paye: Number(e.target.value) > 0 ? true : f.est_paye }))}
                    className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditForm(f => ({ ...f, est_paye: !f.est_paye }))}
                  className={cn('h-6 w-11 rounded-full transition-colors relative flex-shrink-0', editForm.est_paye ? 'bg-green-500' : 'bg-bg-secondary')}>
                  <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', editForm.est_paye ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
                <span className="text-sm text-slate-300">Facture payée</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-slate-400">Catégorie fiscale</label>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {(Object.entries(CATEGORIES) as [CategorieFiscale, CategorieConfig][]).map(([val, cfg]) => (
                    <button type="button" key={val} onClick={() => setEditForm(f => ({ ...f, categorie_fiscale: val }))}
                      className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-sm transition-all',
                        editForm.categorie_fiscale === val
                          ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                          : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                      )}>
                      <span className="font-medium">{cfg.label}</span>
                      <span className={cn('text-xs', cfg.deductible === 'oui' ? 'text-[var(--success)]' : cfg.deductible === 'partiel' ? 'text-amber-400' : 'text-red-400')}>
                        {cfg.deductible === 'oui' ? '✓ Déductible' : cfg.deductible === 'partiel' ? '⚠ Conditionnel' : '✗ Non déductible'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <FactureManager incidentId={editingIncident.id} existing={editFactures} onExistingChange={setEditFactures}
                pending={editNewFiles} onPendingChange={setEditNewFiles} />
              <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={() => setEditingIncident(null)}
                  className="flex-1 h-10 rounded-lg border border-border text-slate-400 text-sm transition-all">Annuler</button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all disabled:opacity-50">
                  {editSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScan && (
        <ScanFactureModal
          onClose={() => setShowScan(false)}
          onSaved={() => { setShowScan(false); window.location.reload() }}
        />
      )}
    </div>
  )
}
