'use client'

import { useRef, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import {
  Upload, Sparkles, CheckCircle, AlertCircle, Loader2,
  FileText, ChevronRight, Edit3, Building2, Banknote, Receipt, X
} from 'lucide-react'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  biens: 'Biens immobiliers',
  loyers: 'Loyers / Revenus',
  depenses: 'Dépenses / Charges',
  mixte: 'Mixte',
  inconnu: 'Non reconnu',
}

const TYPE_ICONS: Record<string, any> = {
  biens: Building2,
  loyers: Banknote,
  depenses: Receipt,
  mixte: FileText,
  inconnu: FileText,
}

const TYPE_COLORS: Record<string, string> = {
  biens: '#1D4ED8',
  loyers: '#059669',
  depenses: '#7C3AED',
  mixte: '#D97706',
  inconnu: '#6B7280',
}

const FIELD_LABELS: Record<string, string> = {
  nom_bien: 'Nom du bien',
  annee: 'Année',
  montant: 'Montant (€)',
  date: 'Date',
  description: 'Description',
  locataire: 'Locataire',
  categorie: 'Catégorie',
  adresse: 'Adresse',
  type_bien: 'Type de bien',
  surface: 'Surface (m²)',
}

const CONFIANCE_COLORS: Record<string, { bg: string, text: string, label: string }> = {
  haute: { bg: '#F0FDF4', text: '#166534', label: '✓ Haute confiance' },
  moyenne: { bg: '#FFFBEB', text: '#92400E', label: '⚠ Confiance moyenne' },
  faible: { bg: '#FEF2F2', text: '#991B1B', label: '⚠ Faible confiance — vérifiez le mapping' },
}

export default function AnalyseIAPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileBase64, setFileBase64] = useState<string>('')
  const [analysing, setAnalysing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [sheets, setSheets] = useState<any>(null)
  const [mapping, setMapping] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (f: File) => {
    setFile(f)
    setAnalysis(null)
    setResult(null)
    // Convertir en base64 pour l'import ultérieur
    const buf = await f.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    setFileBase64(b64)
  }

  const handleAnalyse = async () => {
    if (!file) return
    setAnalysing(true)

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/historique/analyse', { method: 'POST', body: fd })
    const data = await res.json()
    setAnalysing(false)

    if (!res.ok) { toast.error(data.error ?? 'Erreur d\'analyse'); return }

    setAnalysis(data.analysis)
    setSheets(data.sheets)

    // Initialiser le mapping éditable
    const m: any = {}
    for (const [sheetName, sheetData] of Object.entries(data.analysis.onglets) as [string, any][]) {
      m[sheetName] = {
        actif: sheetData.type !== 'inconnu',
        type: sheetData.type,
        ...sheetData.mapping,
      }
    }
    setMapping(m)
    toast.success('Analyse terminée !')
  }

  const handleImport = async () => {
    if (!fileBase64 || !mapping) return
    setImporting(true)

    const res = await fetch('/api/historique/import-mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64, filename: file?.name, mapping }),
    })
    const data = await res.json()
    setImporting(false)

    if (res.ok) { setResult(data); toast.success(data.message) }
    else toast.error(data.error ?? 'Erreur import')
  }

  const updateMapping = (sheet: string, field: string, value: string) => {
    setMapping((prev: any) => ({ ...prev, [sheet]: { ...prev[sheet], [field]: value || null } }))
  }

  const confiance = analysis ? CONFIANCE_COLORS[analysis.confiance] : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/historique" className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <ChevronRight className="h-4 w-4 rotate-180" /> Retour
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
          Analyse IA de fichier Excel
        </h1>
      </div>

      {/* Description */}
      <GlassCard>
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)' }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Importez n'importe quel Excel
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              L'IA analyse votre fichier, détecte automatiquement les colonnes (nom du bien, loyers, dépenses…)
              et vous propose un mapping à valider avant import. Pas besoin de respecter un format particulier.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Upload */}
      {!analysis && (
        <GlassCard>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
            style={{
              borderColor: file ? '#1D4ED8' : 'var(--border)',
              background: file ? '#EFF6FF' : 'var(--bg-secondary)',
            }}>
            {file ? (
              <>
                <CheckCircle className="h-10 w-10 mb-3 text-blue-500" />
                <p className="font-semibold text-blue-700">{file.name}</p>
                <p className="text-xs text-blue-500 mt-1">{Math.round(file.size / 1024)} Ko — Cliquez pour changer</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Déposez votre fichier Excel ici</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Tableau de bord perso, export comptable, fichier bancaire… tout format accepté
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>.xlsx uniquement</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

          {file && (
            <button onClick={handleAnalyse} disabled={analysing}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold mt-4 disabled:opacity-50 transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)', boxShadow: '0 4px 14px rgba(27,79,216,0.25)' }}>
              {analysing
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Analyse en cours...</>
                : <><Sparkles className="h-5 w-5" /> Analyser avec l'IA</>
              }
            </button>
          )}
        </GlassCard>
      )}

      {/* Résultat analyse */}
      {analysis && mapping && !result && (
        <div className="space-y-4">
          {/* En-tête résultat */}
          <div className="p-4 rounded-xl flex items-center justify-between"
            style={{ background: confiance?.bg, border: `1px solid ${confiance?.text}30` }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: confiance?.text }}>{confiance?.label}</p>
              <p className="text-xs mt-0.5" style={{ color: confiance?.text }}>
                {analysis.type_fichier}
              </p>
            </div>
            <button onClick={() => { setAnalysis(null); setFile(null) }}
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.08)' }}>
              <X className="h-4 w-4" style={{ color: confiance?.text }} />
            </button>
          </div>

          {/* Suggestions IA */}
          {analysis.suggestions?.length > 0 && (
            <div className="p-3 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#1E40AF' }}>
                <Sparkles className="h-3.5 w-3.5 inline mr-1" /> Notes de l'IA
              </p>
              {analysis.suggestions.map((s: string, i: number) => (
                <p key={i} className="text-xs" style={{ color: '#3B82F6' }}>• {s}</p>
              ))}
            </div>
          )}

          {/* Mapping par onglet */}
          {Object.entries(analysis.onglets).map(([sheetName, sheetData]: [string, any]) => {
            const Icon = TYPE_ICONS[sheetData.type] ?? FileText
            const color = TYPE_COLORS[sheetData.type] ?? '#6B7280'
            const sheetInfo = sheets[sheetName]
            const currentMapping = mapping[sheetName]

            return (
              <GlassCard key={sheetName}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Onglet : {sheetName}
                      </p>
                      <p className="text-xs" style={{ color }}>
                        {TYPE_LABELS[sheetData.type] ?? sheetData.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={currentMapping.type}
                      onChange={e => setMapping((prev: any) => ({ ...prev, [sheetName]: { ...prev[sheetName], type: e.target.value } }))}
                      className="h-8 px-2 rounded-lg text-xs focus:outline-none"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <option value="biens">Biens</option>
                      <option value="loyers">Loyers</option>
                      <option value="depenses">Dépenses</option>
                      <option value="inconnu">Ignorer</option>
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={currentMapping.actif}
                        onChange={e => setMapping((prev: any) => ({ ...prev, [sheetName]: { ...prev[sheetName], actif: e.target.checked } }))}
                        className="h-4 w-4 rounded" />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Importer</span>
                    </label>
                  </div>
                </div>

                {currentMapping.actif && (
                  <>
                    {/* Aperçu des données */}
                    {sheetInfo && (
                      <div className="mb-4 overflow-x-auto">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          <Edit3 className="h-3 w-3" /> Aperçu des données
                        </p>
                        <table className="text-xs w-full">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {sheetInfo.headers.map((h: string) => (
                                <th key={h} className="text-left py-1.5 px-2 font-medium whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetInfo.rows.slice(0, 3).map((row: any[], i: number) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                {sheetInfo.headers.map((h: string, j: number) => (
                                  <td key={j} className="py-1.5 px-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                    {String(row[j] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Mapping des colonnes */}
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        Correspondance des colonnes (modifiable)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(FIELD_LABELS).map(([field, label]) => (
                          <div key={field} className="flex items-center gap-2">
                            <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <select
                              value={currentMapping[field] ?? ''}
                              onChange={e => updateMapping(sheetName, field, e.target.value)}
                              className="flex-1 h-7 px-2 rounded-lg text-xs focus:outline-none"
                              style={{ background: 'var(--bg-secondary)', border: `1px solid ${currentMapping[field] ? color : 'var(--border)'}`, color: 'var(--text-primary)' }}>
                              <option value="">— Non mappé</option>
                              {sheetInfo?.headers.map((h: string) => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </GlassCard>
            )
          })}

          <button onClick={handleImport} disabled={importing}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all hover:-translate-y-0.5"
            style={{ background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.25)' }}>
            {importing
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Import en cours...</>
              : <><Upload className="h-5 w-5" /> Valider et importer</>
            }
          </button>
        </div>
      )}

      {/* Résultat final */}
      {result && (
        <GlassCard>
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>✅ Import terminé</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Biens créés', value: result.results.biens, color: '#1D4ED8' },
              { label: 'Paiements importés', value: result.results.loyers, color: '#059669' },
              { label: 'Dépenses importées', value: result.results.depenses, color: '#7C3AED' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-3xl font-bold font-mono" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>
          {result.results.errors?.length > 0 && (
            <div className="p-3 rounded-xl mb-4" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
              <p className="text-xs font-semibold mb-1 text-amber-800 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> {result.results.errors.length} erreur(s)
              </p>
              {result.results.errors.slice(0, 5).map((e: string, i: number) => (
                <p key={i} className="text-xs text-amber-700">• {e}</p>
              ))}
            </div>
          )}
          <Link href="/dashboard"
            className="flex items-center justify-center gap-2 h-10 rounded-xl text-white text-sm font-semibold"
            style={{ background: '#1D4ED8' }}>
            Voir mon tableau de bord →
          </Link>
        </GlassCard>
      )}
    </div>
  )
}
