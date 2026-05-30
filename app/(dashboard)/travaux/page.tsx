'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Wrench, Plus, X, Paperclip, CheckCircle2, Clock, AlertCircle, BarChart2,
  Info, Upload, Loader2, Euro, FileText, AlertTriangle, ToggleLeft, ToggleRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

type IncidentStatus = 'open' | 'in_progress' | 'resolved'
type CategorieFiscale =
  | 'entretien_reparation'
  | 'amelioration'
  | 'travaux_deductibles'
  | 'travaux_amortissables'
  | 'construction_agrandissement'

interface CategorieConfig {
  label: string
  color: string
  bg: string
  border: string
  tooltip: string
  deductible: 'oui' | 'partiel' | 'non'
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
      <div className="absolute bottom-5 left-0 w-72 px-3 py-2.5 bg-[var(--bg)] border border-white/[0.10] rounded-xl text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl">
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

// ─── Page principale ─────────────────────────────────────────────────────

export default function TravauxPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(FORM_INITIAL)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const load = async () => {
    const [incRes, propRes] = await Promise.all([
      supabase.from('incidents')
        .select('*, property:properties(name, city, type)')
        .order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name, type').order('name'),
    ])
    setIncidents(incRes.data ?? [])
    setProperties(propRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

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

    // 2. Upload facture si fichier sélectionné
    if (pendingFile && incident) {
      const fd = new FormData()
      fd.append('file', pendingFile)
      fd.append('incident_id', incident.id)
      const res = await fetch('/api/travaux/upload', { method: 'POST', body: fd })
      if (!res.ok) toast.error('Ticket créé mais erreur upload facture')
    }

    setSaving(false)
    toast.success('Ticket créé avec succès')
    setShowAdd(false)
    setForm(FORM_INITIAL)
    setPendingFile(null)
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

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  const thisYear = incidents.filter(i => i.created_at >= yearStart)

  const stats = {
    deductibles: thisYear
      .filter(i => ['entretien_reparation', 'travaux_deductibles'].includes(i.categorie_fiscale) && i.est_paye)
      .reduce((s, i) => s + (i.cout_paye || 0), 0),
    amortissables: thisYear
      .filter(i => ['travaux_amortissables', 'amelioration'].includes(i.categorie_fiscale) && i.est_paye)
      .reduce((s, i) => s + (i.cout_paye || 0), 0),
    nonPaye: incidents
      .filter(i => !i.est_paye)
      .reduce((s, i) => s + Math.max(0, (i.cout_estime || 0) - (i.cout_paye || 0)), 0),
    facturesManquantes: incidents.filter(i => i.est_paye && !i.facture_url).length,
  }

  // Grouper par bien
  const byProperty: Record<string, { name: string; items: any[] }> = {}
  for (const inc of incidents) {
    const pid = inc.property_id
    if (!byProperty[pid]) byProperty[pid] = { name: inc.property?.name ?? 'Bien inconnu', items: [] }
    byProperty[pid].items.push(inc)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Travaux & Incidents</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {incidents.filter(i => i.status !== 'resolved').length} en cours · {incidents.length} au total
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
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold transition-all shadow-sm"
            style={{ background: '#1D4ED8' }}>
            <Plus className="h-4 w-4" /> Nouveau ticket
          </button>
        </div>
      </div>

      {/* ── SECTION 3 — Résumé fiscal ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard glow="green" className="p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
            Déductibles {now.getFullYear()}
          </p>
          <p className="text-xl font-bold font-mono text-[var(--success)]">{formatCurrency(stats.deductibles)}</p>
          <p className="text-xs text-slate-600 mt-0.5">entretien + charges BIC payés</p>
        </GlassCard>
        <GlassCard glow="cyan" className="p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
            Amortissables {now.getFullYear()}
          </p>
          <p className="text-xl font-bold font-mono text-cyan-400">{formatCurrency(stats.amortissables)}</p>
          <p className="text-xs text-slate-600 mt-0.5">à intégrer plan amortissement</p>
        </GlassCard>
        <GlassCard glow="amber" className="p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
            Non encore payés
          </p>
          <p className="text-xl font-bold font-mono text-amber-400">{formatCurrency(stats.nonPaye)}</p>
          <p className="text-xs text-slate-600 mt-0.5">estimé - payé</p>
        </GlassCard>
        <GlassCard glow="red" className="p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
            Factures manquantes
          </p>
          <p className="text-xl font-bold font-mono text-red-400">{stats.facturesManquantes}</p>
          <p className="text-xs text-slate-600 mt-0.5">payé sans justificatif</p>
        </GlassCard>
      </div>

      {/* ── SECTION 2 — Liste par bien ── */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : incidents.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <Wrench className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">Aucun ticket enregistré</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 text-sm text-blue-400 hover:text-blue-300">
            + Créer le premier ticket
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
                      {['Date', 'Entreprise', 'Travaux', 'Estimé', 'Payé', 'Statut', 'Catégorie fiscale', '📎'].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(inc => {
                      const cat = (inc.categorie_fiscale ?? 'entretien_reparation') as CategorieFiscale
                      const catCfg = CATEGORIES[cat]
                      return (
                        <tr key={inc.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
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
                          <td className="py-3 px-3 whitespace-nowrap">
                            {inc.est_paye ? (
                              <button
                                onClick={() => handleTogglePaye(inc.id, inc.est_paye, inc.cout_paye)}
                                className="flex items-center gap-1 text-[var(--success)] hover:text-green-300 transition-colors"
                              >
                                <ToggleRight className="h-4 w-4" />
                                <span className="font-semibold">{formatCurrency(inc.cout_paye || 0)}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePaye(inc.id, inc.est_paye, inc.cout_paye)}
                                className="flex items-center gap-1 text-slate-600 hover:text-slate-400 transition-colors"
                              >
                                <ToggleLeft className="h-4 w-4" />
                                <span className="text-xs">Estimé: {inc.cout_estime ? formatCurrency(inc.cout_estime) : '—'}</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3">
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
                            {inc.facture_url ? (
                              <a
                                href={inc.facture_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 transition-colors"
                                title="Voir la facture"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-blue-400" />
                              </a>
                            ) : inc.est_paye ? (
                              <span className="text-xs text-red-400" title="Facture manquante">⚠</span>
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── MODAL AJOUT ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAdd(false); setForm(FORM_INITIAL); setPendingFile(null) }} />
          <div className="relative w-full max-w-2xl bg-[var(--surface)] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-[var(--surface)] border-b border-white/[0.06] z-10">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-400" />
                <h2 className="font-display font-semibold text-[var(--text-primary)]">Nouveau ticket travaux</h2>
              </div>
              <button onClick={() => { setShowAdd(false); setForm(FORM_INITIAL); setPendingFile(null) }}
                className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10]">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Bien + Statut */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bien concerné *</label>
                  <select value={form.property_id} onChange={e => set('property_id', e.target.value)} required
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50">
                    <option value="" className="bg-[var(--surface)]">Sélectionner un bien</option>
                    {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Statut</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
                    <option value="open" className="bg-[var(--surface)]">Planifié</option>
                    <option value="in_progress" className="bg-[var(--surface)]">En cours</option>
                    <option value="resolved" className="bg-[var(--surface)]">Terminé</option>
                  </select>
                </div>
              </div>

              {/* Titre + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Titre des travaux *</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required
                    placeholder="Ex : Remplacement chaudière" className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date des travaux</label>
                  <input type="date" value={form.date_travaux} onChange={e => set('date_travaux', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Entreprise / Artisan</label>
                  <input type="text" value={form.nom_entreprise} onChange={e => set('nom_entreprise', e.target.value)}
                    placeholder="Ex : Plomberie Dupont" className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                  placeholder="Détails des travaux, problème constaté..." className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none resize-none focus:border-blue-500/50" />
              </div>

              {/* Montants */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Coût estimé (€)</label>
                  <input type="number" step="0.01" value={form.cout_estime} onChange={e => set('cout_estime', e.target.value)}
                    placeholder="0" className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Coût payé (€)</label>
                  <input type="number" step="0.01" value={form.cout_paye} onChange={e => set('cout_paye', e.target.value)}
                    placeholder="0" className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">N° facture</label>
                  <input type="text" value={form.numero_facture} onChange={e => set('numero_facture', e.target.value)}
                    placeholder="FAC-2026-001" className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>

              {/* Toggle payé */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('est_paye', !form.est_paye)}
                  className={cn('h-6 w-11 rounded-full transition-colors relative flex-shrink-0', form.est_paye ? 'bg-green-500' : 'bg-white/[0.10]')}>
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

              {/* Upload facture */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Facture (PDF ou image, max 15 MB)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border border-dashed cursor-pointer transition-all',
                    pendingFile ? 'border-green-400/30 bg-green-400/5' : 'border-white/[0.10] hover:border-blue-400/30 hover:bg-blue-400/5'
                  )}
                >
                  {pendingFile ? (
                    <>
                      <FileText className="h-5 w-5 text-[var(--success)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--success)] font-medium truncate">{pendingFile.name}</p>
                        <p className="text-xs text-slate-500">{(pendingFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); setPendingFile(null) }}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/[0.10]">
                        <X className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-500 flex-shrink-0" />
                      <p className="text-sm text-slate-500">Cliquez pour choisir un fichier</p>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setPendingFile(f) }} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={() => { setShowAdd(false); setForm(FORM_INITIAL); setPendingFile(null) }}
                  className="flex-1 h-10 rounded-lg border border-white/[0.10] text-slate-400 hover:text-[var(--text-primary)] text-sm transition-all">
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
    </div>
  )
}
