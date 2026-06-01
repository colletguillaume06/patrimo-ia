'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, FileText, TrendingDown, TrendingUp, Upload } from 'lucide-react'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  avis_imposition: 'Avis d\'imposition',
  '2042': 'Formulaire 2042',
  '2042_c_pro': '2042-C-PRO (LMNP)',
  '2044': 'Formulaire 2044 (Foncier)',
  '2044_spe': '2044-SPE',
  '2072': 'Formulaire 2072 (SCI)',
  autre: 'Autre document fiscal',
}

export default function DeclarationsPage() {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('declarations_fiscales')
      .select('*')
      .order('annee', { ascending: false })
      .then(r => { setDeclarations(r.data ?? []); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/fiscal" className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <ChevronLeft className="h-4 w-4" /> Fiscalité
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            Mes déclarations importées
          </h1>
        </div>
        <Link href="/import-intelligent"
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#DC2626' }}>
          <Upload className="h-4 w-4" /> Importer une déclaration
        </Link>
      </div>

      {declarations.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Aucune déclaration importée</p>
            <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
              Importez votre avis d'imposition ou déclaration 2044/2042 pour voir votre historique fiscal
            </p>
            <Link href="/import-intelligent"
              className="flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#DC2626' }}>
              <Upload className="h-4 w-4" /> Importer ma déclaration
            </Link>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {declarations.map(d => {
            const raw = d.donnees_brutes ?? {}
            return (
              <GlassCard key={d.id}>
                {/* En-tête */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ background: '#FEF2F2' }}>
                      <FileText className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                        Revenus {d.annee}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {TYPE_LABELS[d.type] ?? d.type}
                        {raw.declarant?.nom && ` · ${raw.declarant.prenom} ${raw.declarant.nom}`}
                      </p>
                    </div>
                  </div>
                  {d.tmi && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>TMI</p>
                      <p className="text-xl font-bold" style={{ color: '#DC2626' }}>{d.tmi}%</p>
                    </div>
                  )}
                </div>

                {/* KPIs principaux */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Revenus fonciers bruts', value: d.revenus_fonciers, color: '#059669' },
                    { label: 'Charges déductibles', value: d.charges_deductibles, color: '#D97706' },
                    { label: 'Déficit foncier', value: d.deficit_foncier, color: '#7C3AED' },
                    { label: 'Impôts payés', value: d.impots_payes, color: '#DC2626' },
                  ].filter(k => k.value !== null && k.value !== undefined).map(({ label, value, color }) => (
                    <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                      <p className="text-base font-bold font-mono" style={{ color }}>{formatCurrency(value)}</p>
                    </div>
                  ))}
                </div>

                {/* Données LMNP */}
                {(d.revenu_bic_lmnp || d.amortissements) && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>LMNP / BIC</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Revenus BIC', value: d.revenu_bic_lmnp, color: '#059669' },
                        { label: 'Amortissements', value: d.amortissements, color: '#1D4ED8' },
                        { label: 'Revenu net global', value: d.revenu_net_global, color: 'var(--text-primary)' },
                      ].filter(k => k.value).map(({ label, value, color }) => (
                        <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                          <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                          <p className="text-sm font-bold font-mono" style={{ color }}>{formatCurrency(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Biens déclarés */}
                {raw.biens_declares?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Biens déclarés ({raw.biens_declares.length})
                    </p>
                    <div className="space-y-2">
                      {raw.biens_declares.map((b: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                          style={{ background: 'var(--bg-secondary)' }}>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{b.adresse || 'Bien ' + (i + 1)}</p>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            {b.loyers_bruts && <span style={{ color: '#059669' }}>+{formatCurrency(b.loyers_bruts)}</span>}
                            {b.charges && <span style={{ color: '#D97706' }}>-{formatCurrency(b.charges)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes IA */}
                {raw.notes && (
                  <div className="mt-4 p-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                    <p className="text-xs text-amber-800">💡 {raw.notes}</p>
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
