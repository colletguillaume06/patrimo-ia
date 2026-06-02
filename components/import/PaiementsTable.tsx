'use client'

import { Plus } from 'lucide-react'

const STATUS_CONFIG = {
  paid: { label: 'Payé', bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
  pending: { label: 'À venir', bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' },
  late: { label: 'Retard', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  partial: { label: 'Partiel', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
}

interface PaiementsTableProps {
  paiements: any[]
  monthlyRent?: number
  startDate?: string
  onChange: (paiements: any[]) => void
}

function formatMonth(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

export function PaiementsTable({ paiements, monthlyRent, startDate, onChange }: PaiementsTableProps) {
  const updateRow = (i: number, key: string, val: any) => {
    const next = paiements.map((p, idx) => idx === i ? { ...p, [key]: val } : p)
    onChange(next)
  }

  const applyRentToAll = () => {
    if (!monthlyRent) return
    onChange(paiements.map(p => ({ ...p, amount: monthlyRent })))
  }

  const generateMissingMonths = () => {
    if (!startDate) return
    const start = new Date(startDate)
    const today = new Date()
    const months: any[] = []

    const existing = new Set(paiements.map(p => p.due_date?.slice(0, 7)))

    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= today) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      if (!existing.has(key)) {
        months.push({
          mois: key,
          amount: monthlyRent || 0,
          due_date: `${key}-01`,
          paid_date: null,
          status: cur < today ? 'pending' : 'pending',
          note: null,
        })
      }
      cur.setMonth(cur.getMonth() + 1)
    }

    onChange([...paiements, ...months].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')))
  }

  const addRow = () => {
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    onChange([...paiements, {
      mois: key,
      amount: monthlyRent || 0,
      due_date: `${key}-01`,
      paid_date: null,
      status: 'pending',
      note: null,
    }])
  }

  const removeRow = (i: number) => {
    onChange(paiements.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyRentToAll}
          disabled={!monthlyRent}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40"
          style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
        >
          Appliquer le loyer à tous
        </button>
        <button
          type="button"
          onClick={generateMissingMonths}
          disabled={!startDate}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40"
          style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC' }}
        >
          Générer les mois manquants
        </button>
      </div>

      {/* Table */}
      {paiements.length > 0 ? (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                {['Mois', 'Montant (€)', 'Échéance', 'Statut', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paiements.map((p, i) => {
                const st = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                return (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-1.5 px-3" style={{ color: 'var(--text-secondary)' }}>
                      {formatMonth(p.due_date) || p.mois || '—'}
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        value={p.amount ?? ''}
                        onChange={e => updateRow(i, 'amount', e.target.value === '' ? null : Number(e.target.value))}
                        className="w-24 h-7 px-2 rounded text-sm outline-none"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="date"
                        value={p.due_date ?? ''}
                        onChange={e => updateRow(i, 'due_date', e.target.value || null)}
                        className="h-7 px-2 rounded text-sm outline-none"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={p.status || 'pending'}
                        onChange={e => updateRow(i, 'status', e.target.value)}
                        className="h-7 px-2 rounded text-xs font-medium outline-none"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                      >
                        {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                          <option key={v} value={v}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="h-7 w-7 rounded flex items-center justify-center text-xs hover:bg-red-100 hover:text-red-600 transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun paiement — utilisez les boutons ci-dessus pour générer</p>
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        <Plus className="h-3.5 w-3.5" /> Ajouter un paiement
      </button>
    </div>
  )
}
