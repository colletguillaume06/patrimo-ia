'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Download, FileSpreadsheet, Sparkles, Loader2, Package, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const YEARS = [2026, 2025, 2024, 2023, 2022]

const EXPORTS = [
  {
    id: 'revenus',
    label: 'Revenus locatifs',
    filename: (y: number) => `revenus_${y}.csv`,
    endpoint: (y: number) => `/api/export/revenus?year=${y}`,
    description: 'Loyers, charges, statuts, dates d\'encaissement',
    color: 'text-success-text',
    bg: 'bg-success-bg',
    border: 'border-[var(--success)/20]',
    cols: 'Mois · Bien · N° fiscal · Locataire · Loyer HC · Charges · Statut · Date encaissement',
  },
  {
    id: 'depenses',
    label: 'Autres dépenses',
    filename: (y: number) => `depenses_${y}.csv`,
    endpoint: (y: number) => `/api/export/depenses?year=${y}`,
    description: 'Intérêts, assurances, taxe foncière, frais de gestion...',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    cols: 'Date · Bien · N° fiscal · Catégorie · Fournisseur · Montant · Déductible',
  },
  {
    id: 'travaux',
    label: 'Travaux & Incidents',
    filename: (y: number) => `travaux_${y}.csv`,
    endpoint: (y: number) => `/api/export/travaux?year=${y}`,
    description: 'Factures travaux, catégorie fiscale, amortissables',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    cols: 'Date · Bien · Entreprise · N° facture · Coût estimé · Payé · Catégorie fiscale',
  },
]

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erreur ${res.status}`)
  return res.blob()
}

export default function ExportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [loadingZip, setLoadingZip] = useState(false)

  const setL = (key: string, val: boolean) => setLoading(prev => ({ ...prev, [key]: val }))

  const downloadFile = async (exp: typeof EXPORTS[0]) => {
    setL(exp.id, true)
    try {
      const blob = await fetchBlob(exp.endpoint(year))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = exp.filename(year); a.click()
      URL.revokeObjectURL(url)
      toast.success(`${exp.filename(year)} téléchargé`)
    } catch (e: any) {
      toast.error('Erreur : ' + e.message)
    } finally {
      setL(exp.id, false)
    }
  }

  const downloadAll = async () => {
    setLoadingZip(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const folder = zip.folder(`propilot-export-${year}`)!

      await Promise.all(EXPORTS.map(async exp => {
        const blob = await fetchBlob(exp.endpoint(year))
        folder.file(exp.filename(year), blob)
      }))

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a'); a.href = url; a.download = `propilot-export-${year}.zip`; a.click()
      URL.revokeObjectURL(url)
      toast.success(`Archive ZIP ${year} téléchargée (3 fichiers)`)
    } catch (e: any) {
      toast.error('Erreur ZIP : ' + e.message)
    } finally {
      setLoadingZip(false)
    }
  }

  const handleLoadDemo = async () => {
    setLoadingDemo(true)
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setTimeout(() => window.location.href = '/dashboard', 1500)
      } else {
        toast.error(data.error)
      }
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-text-primary">Exports comptables</h1>
        <p className="text-text-tertiary text-sm mt-1">Données prêtes pour votre expert-comptable, encodage UTF-8</p>
      </div>

      {/* Sélecteur d'année + tout exporter */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">Année fiscale</p>
            <div className="flex gap-2">
              {YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`h-9 px-4 rounded-lg text-sm font-medium transition-all ${
                    year === y
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/[0.05] border border-border text-text-tertiary hover:text-text-primary hover:bg-white/[0.08]'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={downloadAll}
            disabled={loadingZip}
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-text-primary text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 flex-shrink-0"
          >
            {loadingZip
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération ZIP...</>
              : <><Package className="h-4 w-4" /> Tout exporter ({year})</>
            }
          </button>
        </div>
      </GlassCard>

      {/* 3 exports individuels */}
      <div className="space-y-3">
        {EXPORTS.map(exp => (
          <GlassCard key={exp.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${exp.bg} border ${exp.border}`}>
                <FileSpreadsheet className={`h-5 w-5 ${exp.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{exp.label}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{exp.description}</p>
                  </div>
                  <button
                    onClick={() => downloadFile(exp)}
                    disabled={loading[exp.id]}
                    className={`flex items-center gap-2 h-8 px-4 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${exp.bg} ${exp.border} border ${exp.color} hover:opacity-80 disabled:opacity-40`}
                  >
                    {loading[exp.id]
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Download className="h-3.5 w-3.5" />
                    }
                    {exp.filename(year)}
                  </button>
                </div>
                <div className={`mt-2 px-3 py-1.5 rounded-lg ${exp.bg} border ${exp.border}`}>
                  <p className={`text-xs font-mono ${exp.color} opacity-80`}>{exp.cols}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Note expert-comptable */}
      <GlassCard className="p-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          📋 <strong className="text-text-tertiary">Format Excel :</strong> Ouvrez les .csv dans Excel → Données → À partir du texte/CSV → Délimiteur point-virgule → Encodage UTF-8.<br />
          Le fichier ZIP contient les 3 exports prêts à transmettre à votre expert-comptable ou à importer dans votre logiciel comptable.
        </p>
      </GlassCard>

      {/* Données de démo */}
      <GlassCard glow="blue" className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Données de démonstration</p>
            <p className="text-xs text-text-tertiary mt-0.5">3 biens fictifs avec loyers, travaux et dépenses pour explorer l'app</p>
          </div>
        </div>
        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-semibold transition-all disabled:opacity-50"
        >
          {loadingDemo
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Chargement...</>
            : <><Sparkles className="h-4 w-4" /> Charger les données de démonstration</>
          }
        </button>
        <p className="text-xs text-text-secondary text-center mt-2">⚠️ Remplace vos données actuelles</p>
      </GlassCard>
    </div>
  )
}
