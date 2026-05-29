'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Download, FileSpreadsheet, FileText, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function ExportsPage() {
  const [loadingExport, setLoadingExport] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  const handleExport = async (year: number) => {
    setLoadingExport(true)
    try {
      const res = await fetch(`/api/export/comptable?year=${year}`)
      if (!res.ok) { toast.error('Erreur lors de l\'export'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `propilot-export-${year}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Export ${year} téléchargé`)
    } finally {
      setLoadingExport(false)
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
        <h1 className="font-display font-bold text-2xl text-white">Exports</h1>
        <p className="text-slate-400 text-sm mt-1">Téléchargez vos données pour votre expert-comptable</p>
      </div>

      {/* Export comptable */}
      <GlassCard>
        <div className="flex items-start gap-4 mb-5">
          <div className="h-10 w-10 rounded-xl bg-green-400/10 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white">Export comptable CSV</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Tous vos revenus et charges par bien, formaté pour Excel et votre expert-comptable.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {years.map(year => (
            <div key={year} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div>
                <p className="text-sm font-medium text-white">Année {year}</p>
                <p className="text-xs text-slate-500">Revenus · Charges · Résultat par bien</p>
              </div>
              <button
                onClick={() => handleExport(year)}
                disabled={loadingExport}
                className="flex items-center gap-2 h-8 px-3 rounded-lg bg-green-400/10 hover:bg-green-400/20 border border-green-400/20 text-green-400 text-xs font-medium transition-all disabled:opacity-50"
              >
                {loadingExport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Télécharger
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-blue-400/5 border border-blue-400/20">
          <p className="text-xs text-blue-400">
            💡 Le fichier CSV s'ouvre directement dans Excel. Encodage UTF-8 avec BOM pour les caractères français.
          </p>
        </div>
      </GlassCard>

      {/* Données de démo */}
      <GlassCard glow="blue">
        <div className="flex items-start gap-4 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white">Données de démonstration</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Chargez 3 biens fictifs avec baux, loyers et dépenses pour explorer toutes les fonctionnalités.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Studio LMNP Paris', sub: 'Meublé régime réel', color: '#10B981' },
            { label: 'T3 Nu Lyon', sub: 'Foncier avec déficit', color: '#1A56DB' },
            { label: 'Studio Airbnb Nice', sub: '65 nuits / 120 max', color: '#F59E0B' },
          ].map(({ label, sub, color }) => (
            <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="h-1.5 w-6 rounded-full mb-2" style={{ backgroundColor: color }} />
              <p className="text-xs font-medium text-white">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-semibold transition-all disabled:opacity-50"
        >
          {loadingDemo ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Chargement des données...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Charger les données de démonstration</>
          )}
        </button>

        <p className="text-xs text-slate-600 text-center mt-2">
          ⚠️ Remplace vos données actuelles
        </p>
      </GlassCard>
    </div>
  )
}
