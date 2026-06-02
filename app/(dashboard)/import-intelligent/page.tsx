'use client'

import { useRef, useState, useCallback } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import {
  Upload, Sparkles, CheckCircle, XCircle, Loader2, FileText,
  Building2, Users, Wrench, AlertCircle, ChevronRight, X, Eye, EyeOff, Edit3
} from 'lucide-react'
import Link from 'next/link'

// ── Types de documents reconnus ──
const DOC_TYPES: Record<string, { label: string, color: string, bg: string, icon: any, extensions: string[] }> = {
  bail:           { label: 'Bail / Contrat',      color: '#1D4ED8', bg: '#EFF6FF', icon: FileText,  extensions: ['pdf'] },
  diagnostic:     { label: 'Diagnostic',           color: '#059669', bg: '#F0FDF4', icon: CheckCircle, extensions: ['pdf'] },
  taxe_fonciere:  { label: 'Taxe foncière',        color: '#D97706', bg: '#FFFBEB', icon: FileText,  extensions: ['pdf'] },
  assurance:      { label: 'Assurance',            color: '#7C3AED', bg: '#F5F3FF', icon: FileText,  extensions: ['pdf'] },
  acte_vente:     { label: 'Acte de vente',        color: '#0891B2', bg: '#E0F7FF', icon: Building2, extensions: ['pdf'] },
  facture_travaux:{ label: 'Facture / Devis',      color: '#BE185D', bg: '#FDF2F8', icon: Wrench,    extensions: ['pdf'] },
  releve_bancaire:{ label: 'Relevé bancaire',      color: '#166534', bg: '#F0FDF4', icon: FileText,  extensions: ['pdf','csv'] },
  excel:          { label: 'Tableau Excel',        color: '#1D4ED8', bg: '#EFF6FF', icon: FileText,  extensions: ['xlsx','xls','csv'] },
  ifi:              { label: 'Formulaire IFI',      color: '#7C3AED', bg: '#F5F3FF', icon: Building2, extensions: ['pdf', 'jpg', 'jpeg', 'png'] },
  declaration_impots:{ label: 'Déclaration fiscale', color: '#DC2626', bg: '#FEF2F2', icon: FileText, extensions: ['pdf'] },
  document_general:{ label: 'Autre document',     color: '#6B7280', bg: '#F9FAFB', icon: FileText,  extensions: ['pdf'] },
}

const CONFIANCE_STYLE: Record<string, { bg: string, text: string, label: string }> = {
  haute:   { bg: '#F0FDF4', text: '#166534', label: '✓ Haute' },
  moyenne: { bg: '#FFFBEB', text: '#92400E', label: '⚠ Moyenne' },
  faible:  { bg: '#FEF2F2', text: '#991B1B', label: '⚠ Faible' },
}

function renderValue(val: any, depth = 0): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'object' && !Array.isArray(val)) {
    return Object.entries(val).filter(([,v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`).join(' · ')
  }
  if (Array.isArray(val)) return val.map(v => renderValue(v)).join(', ')
  return String(val)
}

function flattenAnalyse(analyse: any): { key: string, value: string }[] {
  const entries: { key: string, value: string }[] = []
  const skip = ['type_document', 'confiance', 'erreur']

  const flatten = (obj: any, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      if (skip.includes(k)) continue
      if (v === null || v === undefined) continue
      if (typeof v === 'object' && !Array.isArray(v)) {
        flatten(v, prefix ? `${prefix} · ${k}` : k)
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === 'object') flatten(item, `${k} ${i + 1}`)
          else entries.push({ key: `${k} ${i + 1}`, value: String(item) })
        })
      } else {
        entries.push({ key: prefix ? `${prefix} · ${k}` : k, value: String(v) })
      }
    }
  }
  flatten(analyse)
  return entries
}

export default function ImportIntelligentPage() {
  const [files, setFiles] = useState<File[]>([])
  const [analysing, setAnalysing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [imported, setImported] = useState<any>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const ACCEPTED_EXTS = ['pdf', 'xlsx', 'xls', 'csv', 'txt', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'ofx', 'qfx', 'xml']

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ACCEPTED_EXTS.includes(ext ?? '')
    })
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...arr.filter(f => !names.has(f.name))]
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const handleAnalyse = async () => {
    if (!files.length) return
    setAnalysing(true); setResults([])

    const fd = new FormData()
    files.forEach(f => fd.append('files', f))

    const res = await fetch('/api/import-intelligent', { method: 'POST', body: fd })
    const data = await res.json()
    setAnalysing(false)

    if (!res.ok) { toast.error(data.error); return }

    // Ajouter nom_bien éditable + actif par défaut
    const enriched = data.results.map((r: any) => ({
      ...r,
      actif: !r.erreur,
      nom_bien: r.analyse?.bien?.adresse || '',
    }))
    setResults(enriched)
    toast.success(`${enriched.length} fichier(s) analysés`)
  }

  const handleImport = async () => {
    setImporting(true)
    const res = await fetch('/api/import-intelligent/valider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents: results.filter(r => r.actif) }),
    })
    const data = await res.json()
    setImporting(false)
    if (res.ok) { setImported(data); toast.success(data.message) }
    else toast.error(data.error)
  }

  const updateResult = (idx: number, key: string, val: any) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/historique" className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <ChevronRight className="h-4 w-4 rotate-180" /> Retour
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
          Import intelligent — Tous mes fichiers
        </h1>
      </div>

      {/* Intro */}
      <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', border: '1px solid #1D4ED8' }}>
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(29,78,216,0.3)' }}>
            <Sparkles className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <p className="font-display font-bold text-white mb-1">Déposez tous vos documents existants</p>
            <p className="text-sm text-blue-200">
              L'IA analyse chaque fichier et pré-remplit automatiquement votre espace :
              baux, diagnostics, taxe foncière, assurances, actes de vente, factures de travaux, relevés bancaires…
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(DOC_TYPES).filter(([k]) => k !== 'document_general').map(([key, dt]) => (
                <span key={key} className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#93C5FD' }}>
                  {dt.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Zone de dépôt */}
      {!results.length && (
        <GlassCard>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-14 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
            style={{
              borderColor: dragging ? '#1D4ED8' : 'var(--border)',
              background: dragging ? '#EFF6FF' : 'var(--bg-secondary)',
            }}>
            <Upload className="h-12 w-12 mb-3" style={{ color: dragging ? '#1D4ED8' : 'var(--text-tertiary)' }} />
            <p className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              ou cliquez pour sélectionner — PDF, Excel, CSV
            </p>
            <p className="text-xs mt-3 px-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
              PDF · Excel · CSV · Word · Images (JPG/PNG) · OFX · TXT · XML
            </p>
            <p className="text-xs mt-1 px-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
              Baux · Diagnostics · Taxe foncière · Assurances · Actes de vente · Factures · Relevés bancaires
            </p>
          </div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.txt,.doc,.docx,.jpg,.jpeg,.png,.ofx,.qfx,.xml" className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {files.length} fichier(s) sélectionné(s)
              </p>
              {files.map((f, i) => {
                const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
                const detectedType = Object.entries(DOC_TYPES).find(([, dt]) => dt.extensions.includes(ext))
                return (
                  <div key={f.name} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <FileText className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{Math.round(f.size / 1024)} Ko</span>
                    <button onClick={e => { e.stopPropagation(); removeFile(i) }}
                      className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-50">
                      <X className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                )
              })}

              <button onClick={handleAnalyse} disabled={analysing}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold disabled:opacity-50 mt-2"
                style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)' }}>
                {analysing
                  ? <><Loader2 className="h-5 w-5 animate-spin" /> Analyse en cours ({files.length} fichiers)...</>
                  : <><Sparkles className="h-5 w-5" /> Analyser avec l'IA</>
                }
              </button>
            </div>
          )}
        </GlassCard>
      )}

      {/* Résultats analyse */}
      {results.length > 0 && !imported && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Résultats de l'analyse — {results.filter(r => r.actif).length} document(s) à importer
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Vérifiez les données extraites, associez chaque document à un bien, puis validez
              </p>
            </div>
            <button onClick={() => { setResults([]); setFiles([]) }}
              className="text-sm px-3 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
              Recommencer
            </button>
          </div>

          {results.map((r, idx) => {
            const dt = DOC_TYPES[r.fileType] ?? DOC_TYPES.document_general
            const Icon = dt.icon
            const confiance = r.analyse?.confiance ? CONFIANCE_STYLE[r.analyse.confiance] : null
            const expanded = expandedIdx === idx
            const entries = r.analyse ? flattenAnalyse(r.analyse) : []
            const isTabular = r.needsMapping && r.excelData
            const isMultiBiens = r.isImage && r.analyse?.biens?.length > 0
            const isImageFailed = r.isImage && (!r.analyse?.biens || r.analyse?.biens?.length === 0)

            return (
              <GlassCard key={r.filename}>
                {/* En-tête */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: dt.bg }}>
                    <Icon className="h-4 w-4" style={{ color: dt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: dt.bg, color: dt.color }}>{dt.label}</span>
                      {confiance && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: confiance.bg, color: confiance.text }}>{confiance.label}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setExpandedIdx(expanded ? null : idx)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'var(--bg-secondary)' }}
                      title={expanded ? 'Réduire' : 'Voir les données'}>
                      {expanded ? <EyeOff className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                        : <Eye className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />}
                    </button>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={r.actif}
                        onChange={e => updateResult(idx, 'actif', e.target.checked)}
                        className="h-4 w-4 rounded" />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Importer</span>
                    </label>
                  </div>
                </div>

                {/* Erreur */}
                {r.erreur && (
                  <div className="flex items-center gap-2 p-2 rounded-lg mb-2"
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700">{r.erreur}</p>
                  </div>
                )}

                {/* Fichier tabular : explication IA + mapping colonnes */}
                {isTabular && r.actif && (
                  <div className="mt-3 space-y-3">
                    {/* Explication IA */}
                    {r.analyse?.explication && (
                      <div className="p-3 rounded-xl flex items-start gap-2"
                        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                        <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-800">
                            Type détecté : {r.analyse.type_detecte || 'inconnu'}
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5">{r.analyse.explication}</p>
                        </div>
                      </div>
                    )}

                    {/* Aperçu des données */}
                    {Object.entries(r.excelData.sheets ?? {}).map(([sheetName, sheet]: [string, any]) => (
                      <div key={sheetName}>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Aperçu — {sheetName}
                        </p>
                        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                          <table className="text-xs w-full">
                            <thead style={{ background: 'var(--bg-secondary)' }}>
                              <tr>
                                {sheet.headers.map((h: string) => (
                                  <th key={h} className="text-left py-1.5 px-2 font-medium whitespace-nowrap"
                                    style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sheet.rows.slice(0, 4).map((row: any[], i: number) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                  {sheet.headers.map((_: string, j: number) => (
                                    <td key={j} className="py-1.5 px-2 whitespace-nowrap"
                                      style={{ color: 'var(--text-secondary)' }}>{String(row[j] ?? '')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mapping colonnes */}
                        <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Correspondance des colonnes
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'nom_bien', label: 'Nom du bien' },
                              { key: 'annee', label: 'Année' },
                              { key: 'montant', label: 'Montant (€)' },
                              { key: 'date', label: 'Date' },
                              { key: 'description', label: 'Description' },
                              { key: 'locataire', label: 'Locataire' },
                              { key: 'categorie', label: 'Catégorie' },
                            ].map(({ key, label }) => {
                              const suggested = r.analyse?.mapping_suggere?.[key]
                              const currentVal = r[`col_${key}`] ?? suggested ?? ''
                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-[10px] w-24 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                                  <select value={currentVal}
                                    onChange={e => updateResult(idx, `col_${key}`, e.target.value)}
                                    className="flex-1 h-7 px-2 rounded text-xs focus:outline-none"
                                    style={{
                                      background: 'var(--bg-card)',
                                      border: `1px solid ${currentVal ? '#1D4ED8' : 'var(--border)'}`,
                                      color: 'var(--text-primary)'
                                    }}>
                                    <option value="">— Non mappé</option>
                                    {sheet.headers.map((h: string) => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                </div>
                              )
                            })}
                          </div>
                          {/* Type de données */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] w-24 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Type données</span>
                            <select value={r.col_type ?? r.analyse?.type_detecte ?? 'loyers'}
                              onChange={e => updateResult(idx, 'col_type', e.target.value)}
                              className="flex-1 h-7 px-2 rounded text-xs focus:outline-none"
                              style={{ background: 'var(--bg-card)', border: '1px solid #1D4ED8', color: 'var(--text-primary)' }}>
                              <option value="loyers">Loyers / Revenus</option>
                              <option value="depenses">Dépenses / Charges</option>
                              <option value="travaux">Travaux</option>
                              <option value="transactions_bancaires">Transactions bancaires</option>
                              <option value="biens">Biens immobiliers</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image multi-biens : liste des biens détectés */}
                {isMultiBiens && r.actif && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {r.analyse.biens.length} bien(s) détecté(s) — seront créés automatiquement
                    </p>
                    <div className="space-y-1">
                      {r.analyse.biens.map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#1E40AF' }}>
                          <span className="font-semibold">•</span>
                          <span className="font-semibold">{b.nom || b.adresse || `Bien ${i+1}`}</span>
                          {b.locataire && <span className="text-blue-500">— {b.locataire}</span>}
                          {b.loyer_mensuel && <span className="text-blue-500">— {b.loyer_mensuel}€/mois</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image échouée : message d'erreur détaillé */}
                {isImageFailed && r.erreur && (
                  <div className="mt-2 p-3 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <p className="text-xs font-semibold text-red-700 mb-1">Analyse image échouée</p>
                    <p className="text-xs text-red-600">{r.analyse?.erreur_detail || r.erreur}</p>
                    <p className="text-xs text-red-500 mt-1">Conseil : réduisez la taille de l'image ou convertissez en PDF</p>
                  </div>
                )}

                {/* Champ : Nom du bien (pour PDFs simples uniquement) */}
                {!isTabular && !isMultiBiens && !isImageFailed && !r.isImage && r.actif && (
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <label className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      Nom du bien :
                    </label>
                    <input
                      type="text"
                      value={r.nom_bien}
                      onChange={e => updateResult(idx, 'nom_bien', e.target.value)}
                      placeholder="Ex: Appartement Lyon 3"
                      className="flex-1 h-8 px-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                )}

                {/* Données extraites (PDFs) */}
                {!isTabular && expanded && entries.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"
                      style={{ color: 'var(--text-tertiary)' }}>
                      <Edit3 className="h-3 w-3" /> Données extraites par l'IA
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {entries.map(({ key, value }) => (
                        <div key={key} className="flex items-start gap-2 py-1.5 px-2 rounded-lg"
                          style={{ background: 'var(--bg-secondary)' }}>
                          <span className="text-[10px] font-medium flex-shrink-0 mt-0.5 capitalize"
                            style={{ color: 'var(--text-tertiary)', minWidth: '120px' }}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-semibold break-words" style={{ color: 'var(--text-primary)' }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            )
          })}

          <button onClick={handleImport} disabled={importing || !results.some(r => r.actif)}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all hover:-translate-y-0.5"
            style={{ background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.25)' }}>
            {importing
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Import en cours...</>
              : <><CheckCircle className="h-5 w-5" /> Valider et importer ({results.filter(r => r.actif).length} documents)</>
            }
          </button>
        </div>
      )}

      {/* Résultat final */}
      {imported && (
        <GlassCard>
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: '#F0FDF4' }}>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <p className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
              Votre espace est pré-rempli !
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Il ne vous reste qu'à compléter les informations manquantes
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Biens', value: imported.results.biens, color: '#1D4ED8' },
              { label: 'Baux', value: imported.results.baux, color: '#0891B2' },
              { label: 'Diagnostics', value: imported.results.diagnostics, color: '#059669' },
              { label: 'Travaux', value: imported.results.travaux, color: '#D97706' },
              { label: 'Dépenses', value: imported.results.depenses, color: '#7C3AED' },
              { label: 'Transactions', value: imported.results.transactions, color: '#166534' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>

          {imported.results.errors?.length > 0 && (
            <div className="p-3 rounded-xl mb-4" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
              <p className="text-xs font-semibold mb-1 text-amber-800">
                {imported.results.errors.length} erreur(s) à corriger manuellement
              </p>
              {imported.results.errors.slice(0, 5).map((e: string, i: number) => (
                <p key={i} className="text-xs text-amber-700">• {e}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/biens', label: 'Voir mes biens', color: '#1D4ED8' },
              { href: '/dashboard', label: 'Tableau de bord', color: '#059669' },
            ].map(({ href, label, color }) => (
              <Link key={href} href={href}
                className="flex items-center justify-center h-10 rounded-xl text-white text-sm font-semibold"
                style={{ background: color }}>
                {label}
              </Link>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
