'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, AlertCircle, CheckCircle, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BienEditor } from './BienEditor'
import { BailEditor } from './BailEditor'
import { PaiementsTable } from './PaiementsTable'
import { validateImportData, hasErrors, countProblems } from '@/lib/import/validate'

interface PreviewEditorProps {
  data: any
  onConfirm: (data: any) => void
  onCancel: () => void
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        {title}
        {open ? <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />}
      </button>
      {open && <div className="p-4" style={{ background: 'var(--bg-card)' }}>{children}</div>}
    </div>
  )
}

export function PreviewEditor({ data, onConfirm, onCancel }: PreviewEditorProps) {
  const [editedData, setEditedData] = useState<any>(() => ({
    ...data,
    biens: (data.biens || []).map((b: any) => ({ ...b, existing_property_id: null })),
  }))
  const [activeTab, setActiveTab] = useState(0)
  const [existingBiens, setExistingBiens] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('properties').select('id, name, type, city').order('name')
      .then(r => setExistingBiens(r.data ?? []))
  }, [])

  const biens = editedData.biens || []

  const allErrors = biens.map((b: any) => validateImportData(b))
  const totalProblems = allErrors.reduce((sum: number, e: any) => sum + countProblems(e), 0)
  const completCount = allErrors.filter((e: any) => !hasErrors(e)).length
  const incompletCount = biens.length - completCount

  const updateBien = (i: number, key: string, val: any) => {
    const next = biens.map((b: any, idx: number) => idx === i ? { ...b, [key]: val } : b)
    setEditedData({ ...editedData, biens: next })
  }

  const addBien = () => {
    const newBien = {
      bien: { name: '', type: 'nu', address: null, city: null, postal_code: null, surface_m2: null, purchase_price: null, monthly_charges: 0, property_tax: null, numero_fiscal: null, purchase_year: null },
      bail: { tenant_name: null, tenant_email: null, tenant_phone: null, monthly_rent: 0, monthly_charges: 0, deposit: null, start_date: null, end_date: null, irl_index: null },
      paiements: [],
    }
    setEditedData({ ...editedData, biens: [...biens, newBien] })
    setActiveTab(biens.length)
  }

  const deleteBien = (i: number) => {
    if (!confirm(`Supprimer "${biens[i]?.bien?.name || 'ce bien'}" ?`)) return
    const next = biens.filter((_: any, idx: number) => idx !== i)
    setEditedData({ ...editedData, biens: next })
    setActiveTab(Math.min(activeTab, next.length - 1))
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
          style={{ background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D' }}>
          <CheckCircle className="h-4 w-4" />
          {completCount} complet{completCount > 1 ? 's' : ''}
        </div>
        {incompletCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
            style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
            <AlertCircle className="h-4 w-4" />
            {incompletCount} incomplet{incompletCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {biens.map((b: any, i: number) => {
          const errs = allErrors[i]
          const ok = !hasErrors(errs)
          return (
            <div key={i} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setActiveTab(i)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === i ? 'var(--bg-secondary)' : 'transparent',
                  border: activeTab === i ? '1px solid var(--border)' : '1px solid transparent',
                  color: activeTab === i ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {b.bien?.name || `Bien ${i + 1}`}
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: ok ? '#DCF7E7' : '#FEF3C7', color: ok ? '#15803D' : '#92400E' }}>
                  {ok ? '✓' : '!'}
                </span>
              </button>
              {activeTab === i && biens.length > 1 && (
                <button
                  type="button"
                  onClick={() => deleteBien(i)}
                  className="ml-1 h-5 w-5 rounded flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
        <button
          type="button"
          onClick={addBien}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)', color: 'var(--text-tertiary)' }}
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </div>

      {/* Active bien content */}
      {biens[activeTab] && (
        <div className="space-y-3">

          {/* Lier à un bien existant */}
          {existingBiens.length > 0 && (
            <div className="p-3 rounded-xl flex items-center gap-3"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <Link2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-800 mb-1">
                  Lier à un bien existant (optionnel)
                </p>
                <select
                  value={biens[activeTab].existing_property_id || ''}
                  onChange={e => {
                    const selected = existingBiens.find(b => b.id === e.target.value)
                    const next = biens.map((b: any, idx: number) => idx === activeTab
                      ? {
                          ...b,
                          existing_property_id: e.target.value || null,
                          bien: selected ? { ...b.bien, name: selected.name, type: selected.type, city: selected.city } : b.bien,
                        }
                      : b)
                    setEditedData({ ...editedData, biens: next })
                  }}
                  className="w-full h-8 px-2 rounded-lg text-xs focus:outline-none"
                  style={{ background: 'white', border: '1px solid #93C5FD', color: '#1E40AF' }}>
                  <option value="">— Créer un nouveau bien</option>
                  {existingBiens.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))}
                </select>
                {biens[activeTab].existing_property_id && (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Les données seront ajoutées à ce bien existant — aucun doublon créé
                  </p>
                )}
              </div>
            </div>
          )}

          <Section title="🏠 Informations du bien">
            <BienEditor
              bien={biens[activeTab].bien}
              errors={allErrors[activeTab]?.bien}
              onChange={val => updateBien(activeTab, 'bien', val)}
            />
          </Section>

          <Section title="📋 Bail & locataire">
            <BailEditor
              bail={biens[activeTab].bail}
              errors={allErrors[activeTab]?.bail}
              onChange={val => updateBien(activeTab, 'bail', val)}
            />
          </Section>

          <Section title="💶 Paiements" defaultOpen={false}>
            <PaiementsTable
              paiements={biens[activeTab].paiements || []}
              monthlyRent={biens[activeTab].bail?.monthly_rent}
              startDate={biens[activeTab].bail?.start_date}
              onChange={val => updateBien(activeTab, 'paiements', val)}
            />
          </Section>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-4 rounded-xl text-sm border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => onConfirm(editedData)}
          disabled={totalProblems > 0}
          className="flex items-center gap-2 h-10 px-5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)' }}
        >
          {totalProblems > 0
            ? `${totalProblems} problème${totalProblems > 1 ? 's' : ''} à corriger`
            : 'Valider et importer'
          }
        </button>
      </div>
    </div>
  )
}
