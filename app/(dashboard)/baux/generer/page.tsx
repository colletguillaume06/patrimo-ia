'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ChevronLeft, FileText, Copy, CheckCircle, Download, Home, Building2,
  Briefcase, Calendar, Moon, Upload, Loader2, Plus, Trash2, Info
} from 'lucide-react'
import Link from 'next/link'
import { generateBail } from '@/lib/baux/templates'

// ─── Types ────────────────────────────────────────────────────────────────

interface BailType {
  id: string; label: string; sous_label: string; icon: any
  color: string; bg: string; duree: string; preavis_loc: string
  description: string; loi: string; profils: string[]
}

const TYPES_BAIL: BailType[] = [
  { id: 'meuble', label: 'Bail meublé', sous_label: 'Location meublée (LMNP)', icon: Home, color: '#166534', bg: '#F0FDF4', duree: '1 an', preavis_loc: '1 mois', description: 'Pour logements meublés LMNP. Régime BIC.', loi: 'Loi du 6 juillet 1989 - art. 25-3', profils: ['lmnp'] },
  { id: 'nu', label: 'Bail nu (vide)', sous_label: 'Location nue classique', icon: Building2, color: '#1E40AF', bg: '#EFF6FF', duree: '3 ans', preavis_loc: '3 mois', description: 'Pour logements vides. Revenus fonciers.', loi: 'Loi du 6 juillet 1989 - art. 10', profils: ['nu'] },
  { id: 'mobilite', label: 'Bail mobilité', sous_label: 'Courte durée 1 à 10 mois', icon: Calendar, color: '#5B21B6', bg: '#F5F3FF', duree: '1-10 mois', preavis_loc: '1 mois', description: 'Étudiants, stages, missions. Sans DG.', loi: 'Loi ELAN 2018 - art. 107 à 123', profils: ['lmnp'] },
  { id: 'airbnb', label: 'Location saisonnière', sous_label: 'Airbnb, Booking...', icon: Moon, color: '#C2410C', bg: '#FFF7ED', duree: 'Variable', preavis_loc: 'Selon contrat', description: 'Max 120 nuits/an résidence principale.', loi: 'Art. L631-7 CCH (loi ELAN)', profils: ['airbnb'] },
  { id: 'commercial', label: 'Bail commercial 3-6-9', sous_label: 'Local commercial', icon: Briefcase, color: '#5B21B6', bg: '#F5F3FF', duree: '9 ans min.', preavis_loc: '6 mois', description: 'Révision ILC/ILAT. Droit au renouvellement.', loi: 'Art. L145-1 Code de commerce', profils: ['commerce'] },
  { id: 'professionnel', label: 'Bail professionnel', sous_label: 'Profession libérale', icon: Briefcase, color: '#0C4A6E', bg: '#E0F2FE', duree: '6 ans min.', preavis_loc: '6 mois', description: 'Activité non commerciale exclusivement.', loi: 'Loi du 6 juillet 1989 - art. 57 A', profils: ['commerce', 'nu'] },
]

const FORM_FIELDS: Record<string, { key: string; label: string; placeholder: string; type?: string }[]> = {
  meuble: [
    { key: 'bailleur_nom', label: 'Votre nom complet', placeholder: 'Nicole Collet' },
    { key: 'bailleur_adresse', label: 'Votre adresse', placeholder: '18 rue Lepic, 75018 Paris' },
    { key: 'locataire_nom', label: 'Nom du locataire', placeholder: 'Sophie Martin' },
    { key: 'locataire_adresse', label: 'Adresse actuelle locataire', placeholder: '5 avenue Hugo, Paris' },
    { key: 'adresse_bien', label: 'Adresse du bien', placeholder: '10 Promenade des Anglais, Nice' },
    { key: 'date_debut', label: "Date d'entrée", placeholder: '1er juillet 2026' },
    { key: 'loyer_hc', label: 'Loyer mensuel HC (€)', placeholder: '950', type: 'number' },
    { key: 'charges', label: 'Charges (€)', placeholder: '80', type: 'number' },
    { key: 'depot', label: 'Dépôt de garantie (€)', placeholder: '1900', type: 'number' },
    { key: 'indice_irl', label: 'Indice IRL signature', placeholder: '147.88 (T2 2026)' },
    { key: 'duree', label: 'Durée', placeholder: '1 an' },
    { key: 'ville_signature', label: 'Ville de signature', placeholder: 'Nice' },
    { key: 'date_signature', label: 'Date de signature', placeholder: '15 juin 2026' },
  ],
  nu: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Nicole Collet' },
    { key: 'bailleur_adresse', label: 'Votre adresse', placeholder: 'Adresse' },
    { key: 'locataire_nom', label: 'Nom locataire', placeholder: 'Sophie Martin' },
    { key: 'locataire_adresse', label: 'Adresse locataire', placeholder: 'Adresse' },
    { key: 'adresse_bien', label: 'Adresse du bien', placeholder: 'Adresse du logement' },
    { key: 'date_debut', label: 'Date d\'entrée', placeholder: '1er juillet 2026' },
    { key: 'loyer_hc', label: 'Loyer HC (€)', placeholder: '1200', type: 'number' },
    { key: 'charges', label: 'Charges (€)', placeholder: '150', type: 'number' },
    { key: 'depot', label: 'Dépôt (€)', placeholder: '1200', type: 'number' },
    { key: 'indice_irl', label: 'Indice IRL', placeholder: '147.88 (T2 2026)' },
    { key: 'ville_signature', label: 'Ville signature', placeholder: 'Lyon' },
    { key: 'date_signature', label: 'Date signature', placeholder: '15 juin 2026' },
  ],
  mobilite: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Nicole Collet' },
    { key: 'locataire_nom', label: 'Nom locataire', placeholder: 'Sophie Martin' },
    { key: 'locataire_adresse', label: 'Adresse locataire', placeholder: 'Adresse' },
    { key: 'adresse_bien', label: 'Adresse du bien', placeholder: 'Adresse' },
    { key: 'date_debut', label: 'Date début', placeholder: '1er septembre 2026' },
    { key: 'date_fin', label: 'Date fin', placeholder: '31 janvier 2027' },
    { key: 'duree', label: 'Durée (mois)', placeholder: '5', type: 'number' },
    { key: 'loyer_hc', label: 'Loyer (€)', placeholder: '850', type: 'number' },
    { key: 'charges', label: 'Charges (€)', placeholder: '60', type: 'number' },
  ],
  airbnb: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Nicole Collet' },
    { key: 'locataire_nom', label: 'Nom voyageur', placeholder: 'Emma L.' },
    { key: 'adresse_bien', label: 'Adresse du bien', placeholder: 'Adresse' },
    { key: 'date_debut', label: "Date d'arrivée", placeholder: '10 juillet 2026' },
    { key: 'date_fin', label: 'Date de départ', placeholder: '17 juillet 2026' },
    { key: 'loyer_hc', label: 'Prix/nuit (€)', placeholder: '95', type: 'number' },
    { key: 'depot', label: 'Caution (€)', placeholder: '500', type: 'number' },
  ],
  commercial: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Nicole Collet' },
    { key: 'bailleur_adresse', label: 'Votre adresse', placeholder: 'Adresse' },
    { key: 'locataire_nom', label: 'Raison sociale', placeholder: 'SARL Martin' },
    { key: 'locataire_adresse', label: 'Siège social', placeholder: 'Adresse siège' },
    { key: 'adresse_bien', label: 'Adresse du local', placeholder: 'Adresse' },
    { key: 'date_debut', label: 'Date d\'effet', placeholder: '1er juillet 2026' },
    { key: 'loyer_hc', label: 'Loyer HT/mois (€)', placeholder: '2500', type: 'number' },
    { key: 'depot', label: 'Dépôt (€)', placeholder: '7500', type: 'number' },
  ],
  professionnel: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Nicole Collet' },
    { key: 'locataire_nom', label: 'Nom professionnel', placeholder: 'Dr. Martin' },
    { key: 'adresse_bien', label: 'Adresse du local', placeholder: 'Adresse' },
    { key: 'date_debut', label: 'Date début', placeholder: '1er septembre 2026' },
    { key: 'loyer_hc', label: 'Loyer HT/mois (€)', placeholder: '1800', type: 'number' },
    { key: 'depot', label: 'Dépôt (€)', placeholder: '3600', type: 'number' },
  ],
}

// Remplacement des variables dans un template personnalisé
function fillCustomTemplate(template: string, form: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, key) => form[key] ?? match)
}

// ─── Page principale ───────────────────────────────────────────────────────

export default function GenererBailPage() {
  const [mode, setMode] = useState<'choose' | 'standard' | 'custom'>('choose')
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProp, setSelectedProp] = useState('')
  const [selectedType, setSelectedType] = useState<BailType | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [generated, setGenerated] = useState('')
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'type' | 'form' | 'result'>('type')

  // Modèles personnalisés
  const [mesModeles, setMesModeles] = useState<any[]>([])
  const [selectedModele, setSelectedModele] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [importNom, setImportNom] = useState('')
  const [importType, setImportType] = useState('meuble')
  const [showImportForm, setShowImportForm] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('properties').select('id, name, type, address, city, postal_code, surface_m2, monthly_charges, indice_revision').order('name').then(r => setProperties(r.data ?? []))
    supabase.from('profiles').select('full_name').single().then(r => {
      if (r.data?.full_name) setForm(f => ({ ...f, bailleur_nom: r.data.full_name }))
    })
    loadMesModeles()
  }, [])

  const loadMesModeles = async () => {
    const { data } = await supabase.from('modeles_baux').select('*').order('created_at', { ascending: false })
    setMesModeles(data ?? [])
  }

  useEffect(() => {
    if (!selectedProp) return
    const prop = properties.find(p => p.id === selectedProp)
    if (!prop) return
    setForm(f => ({
      ...f,
      adresse_bien: [prop.address, prop.city].filter(Boolean).join(', '),
      surface: String(prop.surface_m2 ?? ''),
      charges: String(prop.monthly_charges ?? '0'),
    }))
  }, [selectedProp])

  const handleFileSelect = (file: File) => {
    setPendingFile(file)
    setImportNom(file.name.replace(/\.(txt|html|htm|pdf)$/, ''))
    setShowImportForm(true)
  }

  const handleUpload = async () => {
    if (!pendingFile) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', pendingFile)
    fd.append('nom', importNom || pendingFile.name)
    fd.append('type_bail', importType)
    const res = await fetch('/api/modeles-baux/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (res.ok) {
      toast.success(`Modèle "${importNom}" importé !`)
      setShowImportForm(false)
      setPendingFile(null)
      loadMesModeles()
    } else {
      toast.error(data.error)
    }
  }

  const deleteModele = async (id: string) => {
    await supabase.from('modeles_baux').delete().eq('id', id)
    setMesModeles(prev => prev.filter(m => m.id !== id))
    if (selectedModele?.id === id) setSelectedModele(null)
    toast.success('Modèle supprimé')
  }

  const handleGenerate = () => {
    if (mode === 'custom' && selectedModele) {
      const filled = fillCustomTemplate(selectedModele.contenu, form)
      setGenerated(filled)
      setStep('result')
    } else if (selectedType) {
      setGenerated(generateBail(selectedType.id, form, properties.find(p => p.id === selectedProp)))
      setStep('result')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generated)
    setCopied(true)
    toast.success('Bail copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generated], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `bail-${(selectedModele?.nom ?? selectedType?.id ?? 'document').replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Téléchargé')
  }

  const currentFields = mode === 'custom' && selectedModele
    ? (FORM_FIELDS[selectedModele.type_bail] ?? FORM_FIELDS.meuble)
    : selectedType ? (FORM_FIELDS[selectedType.id] ?? FORM_FIELDS.meuble) : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="flex items-center gap-3">
        <Link href="/baux" className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <ChevronLeft className="h-4 w-4" /> Baux
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Générer un bail</h1>
      </div>

      {/* Sélecteur bien */}
      <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Bien concerné (pré-remplit l'adresse et les charges)</label>
        <select value={selectedProp} onChange={e => setSelectedProp(e.target.value)}
          className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <option value="">— Sélectionner un bien</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
        </select>
      </div>

      {/* Choix du mode */}
      {step === 'type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── Mes modèles personnalisés ── */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <div>
                <h2 className="font-display font-semibold text-base" style={{ color: 'var(--text-primary)' }}>📁 Mes modèles</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Importez votre propre bail une fois, réutilisez à volonté</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white"
                style={{ background: '#1D4ED8' }}>
                <Plus className="h-3.5 w-3.5" /> Importer
              </button>
              <input ref={fileRef} type="file" accept=".txt,.html,.htm,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }} />
            </div>

            <div className="p-3">
              {mesModeles.length === 0 ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                  style={{ borderColor: '#1D4ED8', background: '#EFF6FF' }}>
                  <Upload className="h-8 w-8 mb-2" style={{ color: '#1D4ED8' }} />
                  <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>Importer mon bail type</p>
                  <p className="text-xs mt-1" style={{ color: '#3B82F6' }}>.txt · .html · .pdf</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mesModeles.map(m => (
                    <div key={m.id}
                      onClick={() => { setSelectedModele(m); setMode('custom'); setStep('form') }}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm"
                      style={{ borderColor: selectedModele?.id === m.id ? '#1D4ED8' : 'var(--border)', background: selectedModele?.id === m.id ? '#EFF6FF' : 'var(--bg-secondary)' }}>
                      <FileText className="h-5 w-5 flex-shrink-0" style={{ color: '#1D4ED8' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.nom}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {TYPES_BAIL.find(t => t.id === m.type_bail)?.label ?? m.type_bail}
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteModele(m.id) }}
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors flex-shrink-0"
                        style={{ color: '#B91C1C' }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-dashed text-sm font-medium transition-all hover:opacity-80"
                    style={{ borderColor: '#1D4ED8', color: '#1D4ED8' }}>
                    <Plus className="h-4 w-4" /> Ajouter un modèle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Modèles standard ── */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <h2 className="font-display font-semibold text-base" style={{ color: 'var(--text-primary)' }}>📋 Modèles standard</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>6 types de baux conformes à la loi française</p>
            </div>
            <div className="p-3 grid grid-cols-1 gap-1.5">
              {TYPES_BAIL.map(bt => (
                <button key={bt.id}
                  onClick={() => { setSelectedType(bt); setMode('standard'); setStep('form') }}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bt.bg }}>
                    <bt.icon className="h-4 w-4" style={{ color: bt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{bt.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{bt.duree} · Préavis {bt.preavis_loc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal import */}
      {showImportForm && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowImportForm(false); setPendingFile(null) }} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-display font-semibold text-lg mb-5" style={{ color: 'var(--text-primary)' }}>
              Importer le modèle
            </h2>

            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pendingFile.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{Math.round(pendingFile.size / 1024)} Ko</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Nom du modèle</label>
                <input type="text" value={importNom} onChange={e => setImportNom(e.target.value)}
                  placeholder="Ex: Mon bail meublé standard"
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Type de bail</label>
                <select value={importType} onChange={e => setImportType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {TYPES_BAIL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl mb-5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#1D4ED8' }}>
                <Info className="h-3.5 w-3.5 inline mr-1" />
                Comment fonctionne le remplacement
              </p>
              <p className="text-xs" style={{ color: '#3B82F6' }}>
                Dans votre fichier, remplacez les zones variables par des balises entre accolades :
              </p>
              <div className="mt-2 font-mono text-xs space-y-0.5" style={{ color: '#1E40AF' }}>
                <p><span className="font-bold">{'{bailleur_nom}'}</span> → Votre nom</p>
                <p><span className="font-bold">{'{locataire_nom}'}</span> → Nom du locataire</p>
                <p><span className="font-bold">{'{loyer_hc}'}</span> → Loyer mensuel HC</p>
                <p><span className="font-bold">{'{date_debut}'}</span> → Date d'entrée</p>
                <p><span className="font-bold">{'{adresse_bien}'}</span> → Adresse du bien</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowImportForm(false); setPendingFile(null) }}
                className="flex-1 h-10 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                Annuler
              </button>
              <button onClick={handleUpload} disabled={uploading || !importNom.trim()}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#1D4ED8' }}>
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Import...</> : <><Upload className="h-4 w-4" /> Importer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire */}
      {step === 'form' && (mode === 'standard' ? selectedType : selectedModele) && (
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1">
              <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                {mode === 'custom' ? selectedModele?.nom : selectedType?.label}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Remplissez les informations — elles remplaceront automatiquement les <span className="font-mono font-semibold">{'{variables}'}</span>
              </p>
            </div>
            <button onClick={() => { setStep('type'); setMode('choose') }} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              ← Changer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {currentFields.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{f.label}</label>
                <input type={f.type ?? 'text'} placeholder={f.placeholder} value={form[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            ))}
          </div>

          <button onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-base font-semibold"
            style={{ background: '#1D4ED8', boxShadow: '0 4px 14px rgba(29,78,216,0.25)' }}>
            <FileText className="h-5 w-5" />
            {mode === 'custom' ? 'Générer avec mon modèle' : 'Générer le bail'}
          </button>
        </div>
      )}

      {/* Résultat */}
      {step === 'result' && generated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              {mode === 'custom' ? selectedModele?.nom : selectedType?.label} — Prêt
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setStep('form')} className="h-9 px-4 rounded-lg text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                ← Modifier
              </button>
              <button onClick={handleDownload} className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold border" style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
                <Download className="h-4 w-4" /> Télécharger
              </button>
              <button onClick={handleCopy} className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white" style={{ background: '#1D4ED8' }}>
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>
          <div className="p-3 rounded-xl text-sm" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
            ⚠️ Document indicatif — faites vérifier par un notaire ou juriste avant signature.
          </div>
          <textarea value={generated} onChange={e => setGenerated(e.target.value)}
            className="w-full font-mono text-sm rounded-2xl p-5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: '600px' }} />
        </div>
      )}
    </div>
  )
}
