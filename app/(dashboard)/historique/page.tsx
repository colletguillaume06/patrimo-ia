'use client'

import { useRef, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { Download, Upload, CheckCircle, FileText, Building2, Banknote, Receipt, Loader2, AlertCircle, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function HistoriquePage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDownload = () => {
    window.open('/api/historique/template', '_blank')
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setResult(null)

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/historique/import', { method: 'POST', body: fd })
    const data = await res.json()
    setImporting(false)

    if (res.ok) {
      setResult(data)
      toast.success(data.message)
    } else {
      toast.error(data.error ?? 'Erreur lors de l\'import')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
          Importer votre historique
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Rattrapez vos données des 2 dernières années en quelques minutes
        </p>
      </div>

      {/* Carte analyse IA */}
      <Link href="/historique/analyse"
        className="flex items-center gap-4 p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', borderColor: '#1D4ED8' }}>
        <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(29,78,216,0.3)' }}>
          <Sparkles className="h-6 w-6 text-blue-300" />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-white">Analyse IA — Mon propre fichier Excel</p>
          <p className="text-sm text-blue-200 mt-0.5">
            Importez n'importe quel tableau Excel — l'IA détecte automatiquement les colonnes
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-blue-300 flex-shrink-0" />
      </Link>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>ou utilisez notre template</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Étapes */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { num: '1', label: 'Téléchargez', desc: 'Le template Excel pré-formaté', icon: Download, color: '#1D4ED8' },
          { num: '2', label: 'Remplissez', desc: 'Vos données en 3 onglets', icon: FileText, color: '#7C3AED' },
          { num: '3', label: 'Importez', desc: 'En un clic, tout est dans Patrimo', icon: Upload, color: '#059669' },
        ].map(({ num, label, desc, icon: Icon, color }) => (
          <GlassCard key={num} className="p-4 text-center">
            <div className="h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: `${color}20`, border: `2px solid ${color}` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Étape {num}</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
          </GlassCard>
        ))}
      </div>

      {/* Contenu du template */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Ce que contient le template Excel
        </h2>
        <div className="space-y-3">
          {[
            {
              icon: Building2, color: '#1D4ED8', bg: '#EFF6FF',
              title: 'Onglet Biens',
              items: ['Nom, adresse, ville du bien', 'Type (LMNP, nu, SCI...)', 'Surface, prix d\'achat, année d\'achat', 'Loyer mensuel et charges actuels'],
            },
            {
              icon: Banknote, color: '#059669', bg: '#F0FDF4',
              title: 'Onglet Loyers',
              items: ['Total loyers encaissés par bien et par année', 'Nombre de mois vacants', 'Nom du locataire'],
            },
            {
              icon: Receipt, color: '#7C3AED', bg: '#F5F3FF',
              title: 'Onglet Dépenses',
              items: ['Charges de copropriété', 'Travaux (déductibles ou amortissables)', 'Assurances, taxe foncière, frais de gestion'],
            },
          ].map(({ icon: Icon, color, bg, title, items }) => (
            <div key={title} className="flex gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <ul className="space-y-0.5">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <ChevronRight className="h-3 w-3 flex-shrink-0" style={{ color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold mt-5 transition-all hover:-translate-y-0.5"
          style={{ background: '#1D4ED8', boxShadow: '0 4px 14px rgba(29,78,216,0.25)' }}>
          <Download className="h-5 w-5" />
          Télécharger le template Excel
        </button>
      </GlassCard>

      {/* Zone d'import */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Importer le fichier rempli
        </h2>

        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
          style={{
            borderColor: file ? '#059669' : 'var(--border)',
            background: file ? '#F0FDF4' : 'var(--bg-secondary)',
          }}>
          {file ? (
            <>
              <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
              <p className="text-sm font-semibold text-green-700">{file.name}</p>
              <p className="text-xs text-green-600 mt-0.5">{Math.round(file.size / 1024)} Ko — Cliquez pour changer</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Cliquez pour choisir le fichier</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Format .xlsx uniquement</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = '' }} />

        {file && (
          <button onClick={handleImport} disabled={importing}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold mt-4 disabled:opacity-50 transition-all"
            style={{ background: '#059669' }}>
            {importing ? <><Loader2 className="h-5 w-5 animate-spin" /> Import en cours...</> : <><Upload className="h-5 w-5" /> Lancer l'import</>}
          </button>
        )}
      </GlassCard>

      {/* Résultat */}
      {result && (
        <GlassCard>
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            ✅ Import terminé
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Biens créés', value: result.results.biens, color: '#1D4ED8' },
              { label: 'Paiements importés', value: result.results.loyers, color: '#059669' },
              { label: 'Dépenses importées', value: result.results.depenses, color: '#7C3AED' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>

          {result.results.errors?.length > 0 && (
            <div className="p-3 rounded-xl mb-4" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
              <p className="text-xs font-semibold mb-1 text-amber-800 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> {result.results.errors.length} avertissement(s)
              </p>
              {result.results.errors.map((e: string, i: number) => (
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
