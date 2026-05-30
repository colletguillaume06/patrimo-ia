'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, FileText, Copy, CheckCircle, Download, Home, Building2, Briefcase, Calendar, Moon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { generateBail } from '@/lib/baux/templates'

interface BailType {
  id: string
  label: string
  sous_label: string
  icon: any
  color: string
  bg: string
  duree: string
  preavis_loc: string
  description: string
  loi: string
  profils: string[]
}

const TYPES_BAIL: BailType[] = [
  { id: 'meuble', label: 'Bail meuble', sous_label: 'Location meublee classique (LMNP)', icon: Home, color: '#166534', bg: '#F0FDF4', duree: '1 an renouvelable', preavis_loc: '1 mois', description: 'Pour logements meubles LMNP. Regime BIC.', loi: 'Loi du 6 juillet 1989 - art. 25-3', profils: ['lmnp'] },
  { id: 'nu', label: 'Bail nu (vide)', sous_label: 'Location nue classique', icon: Building2, color: '#1E40AF', bg: '#EFF6FF', duree: '3 ans renouvelable', preavis_loc: '3 mois (1 mois zone tendue)', description: 'Pour logements vides. Revenus fonciers.', loi: 'Loi du 6 juillet 1989 - art. 10', profils: ['nu'] },
  { id: 'mobilite', label: 'Bail mobilite', sous_label: 'Courte duree 1 a 10 mois', icon: Calendar, color: '#5B21B6', bg: '#F5F3FF', duree: '1 a 10 mois - non renouvelable', preavis_loc: '1 mois', description: 'Etudiants, stages, missions pro. Sans depot de garantie.', loi: 'Loi ELAN 2018 - art. 107 a 123', profils: ['lmnp'] },
  { id: 'airbnb', label: 'Location saisonniere', sous_label: 'Courte duree Airbnb etc.', icon: Moon, color: '#C2410C', bg: '#FFF7ED', duree: 'Max 90 nuits consecutives', preavis_loc: 'Selon contrat', description: 'Locations saisonnieres. Max 120 nuits/an residence principale.', loi: 'Art. L631-7 CCH (loi ELAN)', profils: ['airbnb'] },
  { id: 'commercial', label: 'Bail commercial 3-6-9', sous_label: 'Local commercial ou artisanal', icon: Briefcase, color: '#5B21B6', bg: '#F5F3FF', duree: '9 ans minimum', preavis_loc: '6 mois avant periode triennale', description: 'Locaux commerciaux. Revision ILC/ILAT. Droit au renouvellement.', loi: 'Art. L145-1 et suivants Code de commerce', profils: ['commerce'] },
  { id: 'professionnel', label: 'Bail professionnel', sous_label: 'Profession liberale', icon: Briefcase, color: '#0C4A6E', bg: '#E0F2FE', duree: '6 ans minimum', preavis_loc: '6 mois', description: 'Pour professions liberales. Activite non commerciale.', loi: 'Loi du 6 juillet 1989 - art. 57 A', profils: ['commerce', 'nu'] },
]

const FORM_FIELDS: Record<string, { key: string; label: string; placeholder: string; type?: string }[]> = {
  meuble: [
    { key: 'bailleur_nom', label: 'Votre nom complet', placeholder: 'Jean Dupont' },
    { key: 'bailleur_adresse', label: 'Votre adresse', placeholder: '12 rue de la Paix, 75001 Paris' },
    { key: 'locataire_nom', label: 'Nom du locataire', placeholder: 'Marie Martin' },
    { key: 'locataire_adresse', label: 'Adresse actuelle locataire', placeholder: '5 avenue Victor Hugo, 75016 Paris' },
    { key: 'date_debut', label: "Date d'entree", placeholder: '1er septembre 2026' },
    { key: 'loyer_hc', label: 'Loyer mensuel HC (EUR)', placeholder: '950', type: 'number' },
    { key: 'charges', label: 'Provisions sur charges (EUR)', placeholder: '80', type: 'number' },
    { key: 'depot', label: 'Depot de garantie (EUR)', placeholder: '1900', type: 'number' },
    { key: 'indice_irl', label: 'Indice IRL a la signature', placeholder: '147.88 (T2 2026)' },
    { key: 'jour_paiement', label: 'Jour de paiement', placeholder: '5' },
    { key: 'nb_pieces', label: 'Nombre de pieces', placeholder: 'T2 (2 pieces)' },
    { key: 'etage', label: 'Etage', placeholder: '3eme' },
    { key: 'ville_signature', label: 'Ville de signature', placeholder: 'Paris' },
  ],
  nu: [
    { key: 'bailleur_nom', label: 'Votre nom complet', placeholder: 'Jean Dupont' },
    { key: 'bailleur_adresse', label: 'Votre adresse', placeholder: '12 rue de la Paix, 75001 Paris' },
    { key: 'locataire_nom', label: 'Nom du locataire', placeholder: 'Marie Martin' },
    { key: 'locataire_adresse', label: 'Adresse actuelle locataire', placeholder: 'Adresse' },
    { key: 'date_debut', label: 'Date de prise effet', placeholder: '1er septembre 2026' },
    { key: 'loyer_hc', label: 'Loyer mensuel HC (EUR)', placeholder: '1200', type: 'number' },
    { key: 'charges', label: 'Provisions charges (EUR)', placeholder: '150', type: 'number' },
    { key: 'depot', label: 'Depot de garantie (EUR)', placeholder: '1200', type: 'number' },
    { key: 'indice_irl', label: 'Indice IRL signature', placeholder: '147.88 (T2 2026)' },
    { key: 'jour_paiement', label: 'Jour paiement', placeholder: '5' },
    { key: 'nb_pieces', label: 'Nb pieces', placeholder: 'T3 (3 pieces)' },
    { key: 'ville_signature', label: 'Ville signature', placeholder: 'Lyon' },
  ],
  mobilite: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Jean Dupont' },
    { key: 'locataire_nom', label: 'Nom locataire', placeholder: 'Marie Martin' },
    { key: 'locataire_adresse', label: 'Adresse actuelle', placeholder: 'Adresse' },
    { key: 'date_debut', label: 'Date debut', placeholder: '1er septembre 2026' },
    { key: 'date_fin', label: 'Date fin', placeholder: '31 janvier 2027' },
    { key: 'duree', label: 'Duree (mois)', placeholder: '5', type: 'number' },
    { key: 'loyer_hc', label: 'Loyer mensuel (EUR)', placeholder: '850', type: 'number' },
    { key: 'charges', label: 'Charges (EUR)', placeholder: '60', type: 'number' },
  ],
  airbnb: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Jean Dupont' },
    { key: 'locataire_nom', label: 'Nom voyageur', placeholder: 'Emma L.' },
    { key: 'date_debut', label: "Date d'arrivee", placeholder: '10 juillet 2026' },
    { key: 'date_fin', label: 'Date de depart', placeholder: '17 juillet 2026' },
    { key: 'nb_nuits', label: 'Nombre de nuits', placeholder: '7', type: 'number' },
    { key: 'loyer_hc', label: 'Prix par nuit (EUR)', placeholder: '95', type: 'number' },
    { key: 'depot', label: 'Caution (EUR)', placeholder: '500', type: 'number' },
    { key: 'frais_menage', label: 'Frais menage (EUR)', placeholder: '80', type: 'number' },
    { key: 'capacite', label: 'Capacite max', placeholder: '2 personnes' },
  ],
  commercial: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Jean Dupont' },
    { key: 'bailleur_adresse', label: 'Votre adresse', placeholder: 'Adresse bailleur' },
    { key: 'locataire_nom', label: 'Nom / Raison sociale', placeholder: 'SARL Martin Commerce' },
    { key: 'locataire_adresse', label: 'Siege social', placeholder: 'Adresse siege' },
    { key: 'date_debut', label: 'Date de prise effet', placeholder: '1er juillet 2026' },
    { key: 'usage', label: 'Activite autorisee', placeholder: 'Commerce de detail alimentaire' },
    { key: 'loyer_hc', label: 'Loyer mensuel HT (EUR)', placeholder: '2500', type: 'number' },
    { key: 'depot', label: 'Depot de garantie (EUR)', placeholder: '7500', type: 'number' },
    { key: 'indice', label: 'Indice de revision', placeholder: 'ILC ou ILAT' },
    { key: 'indice_ref', label: 'Valeur indice signature', placeholder: '138.44 (T1 2026)' },
    { key: 'tva', label: 'TVA applicable ? (oui/non)', placeholder: 'non' },
  ],
  professionnel: [
    { key: 'bailleur_nom', label: 'Votre nom', placeholder: 'Jean Dupont' },
    { key: 'locataire_nom', label: 'Nom locataire pro', placeholder: 'Dr. Martin' },
    { key: 'date_debut', label: 'Date debut', placeholder: '1er septembre 2026' },
    { key: 'loyer_hc', label: 'Loyer mensuel HT (EUR)', placeholder: '1800', type: 'number' },
    { key: 'charges', label: 'Charges (EUR)', placeholder: '200', type: 'number' },
    { key: 'depot', label: 'Depot garantie (EUR)', placeholder: '3600', type: 'number' },
    { key: 'usage', label: 'Activite autorisee', placeholder: 'Cabinet medical' },
  ],
}

export default function GenererBailPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProp, setSelectedProp] = useState('')
  const [selectedType, setSelectedType] = useState<BailType | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [generated, setGenerated] = useState('')
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'type' | 'form' | 'result'>('type')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('properties').select('id, name, type, address, city, postal_code, surface_m2, monthly_charges, indice_revision').order('name').then(r => setProperties(r.data ?? []))
    supabase.from('profiles').select('full_name').single().then(r => { if (r.data?.full_name) setForm(f => ({ ...f, bailleur_nom: r.data.full_name })) })
  }, [])

  const prop = properties.find(p => p.id === selectedProp)

  const suggestedIds = (type: string) => {
    if (type === 'lmnp') return ['meuble', 'mobilite']
    if (type === 'nu') return ['nu', 'professionnel']
    if (type === 'airbnb') return ['airbnb', 'mobilite']
    if (type === 'commerce') return ['commercial', 'professionnel']
    return []
  }
  const suggested = prop ? suggestedIds(prop.type) : []

  const handleSelectType = (bt: BailType) => {
    setSelectedType(bt)
    if (prop) setForm(f => ({ ...f, surface: String(prop.surface_m2 ?? ''), charges: String(prop.monthly_charges ?? '0') }))
    setStep('form')
  }

  const handleGenerate = () => {
    if (!selectedType) return
    setGenerated(generateBail(selectedType.id, form, prop))
    setStep('result')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generated)
    setCopied(true)
    toast.success('Bail copie dans le presse-papiers')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generated], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = ('bail-' + (selectedType?.id ?? 'document') + '.txt').replace(/\s+/g, '-')
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Fichier telecharge')
  }

  const fields = selectedType ? (FORM_FIELDS[selectedType.id] ?? FORM_FIELDS.meuble) : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/baux" className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <ChevronLeft className="h-4 w-4" /> Baux
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Generer un bail</h1>
      </div>

      <div className="p-4 rounded-xl border" style={{ background: '#ffffff', borderColor: 'var(--border)' }}>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Bien concerne (pré-remplit les données)
        </label>
        <select value={selectedProp} onChange={e => setSelectedProp(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', minWidth: 200 }}>
          <option value="">— Selectionner un bien</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
        </select>
      </div>

      {step === 'type' && (
        <div>
          <h2 className="font-display font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
            Quel type de bail ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TYPES_BAIL.map(bt => {
              const isSuggested = suggested.includes(bt.id)
              return (
                <button key={bt.id} onClick={() => handleSelectType(bt)}
                  className="relative text-left p-5 rounded-2xl transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                  style={{ background: '#ffffff', borderColor: isSuggested ? bt.color : 'var(--border)', borderWidth: isSuggested ? '2px' : '1px' }}>
                  {isSuggested && (
                    <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: bt.color }}>Recommande</span>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: bt.bg }}>
                      <bt.icon className="h-5 w-5" style={{ color: bt.color }} />
                    </div>
                    <div>
                      <p className="font-display font-bold text-lg" style={{ color: '#0F172A' }}>{bt.label}</p>
                      <p className="text-sm font-medium" style={{ color: '#64748B' }}>{bt.sous_label}</p>
                    </div>
                  </div>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: '#475569' }}>{bt.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="px-2.5 py-1.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Duree : </span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{bt.duree.split(' ')[0]}</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Preavis : </span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{bt.preavis_loc}</span>
                    </div>
                  </div>
                  <p className="text-xs mt-2 font-mono" style={{ color: bt.color, fontStyle: 'italic' }}>{bt.loi}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 'form' && selectedType && (
        <div className="p-6 rounded-2xl border" style={{ background: '#ffffff', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: selectedType.bg }}>
              <selectedType.icon className="h-5 w-5" style={{ color: selectedType.color }} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{selectedType.label}</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Remplissez les informations</p>
            </div>
            <button onClick={() => setStep('type')} className="ml-auto text-sm" style={{ color: 'var(--text-tertiary)' }}>Changer de type</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{f.label}</label>
                <input type={f.type ?? 'text'} placeholder={f.placeholder} value={form[f.key] ?? ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            ))}
          </div>
          <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-base font-semibold" style={{ background: '#1D4ED8', boxShadow: '0 4px 14px rgba(29,78,216,0.25)' }}>
            <FileText className="h-5 w-5" /> Generer le bail
          </button>
        </div>
      )}

      {step === 'result' && generated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{selectedType?.label}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: selectedType?.color }}>Genere</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('form')} className="h-9 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                Modifier
              </button>
              <button onClick={handleDownload} className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold border" style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
                <Download className="h-4 w-4" /> Telecharger
              </button>
              <button onClick={handleCopy} className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white" style={{ background: '#1D4ED8' }}>
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copie !' : 'Copier'}
              </button>
            </div>
          </div>
          <div className="p-3 rounded-xl text-sm" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
            Ce document est un modele indicatif. Faites-le verifier par un notaire ou juriste avant signature.
          </div>
          <textarea value={generated} onChange={e => setGenerated(e.target.value)}
            className="w-full font-mono text-sm rounded-2xl p-5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: '600px' }} />
        </div>
      )}
    </div>
  )
}
