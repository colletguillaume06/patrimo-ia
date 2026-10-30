'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'

type Slice = { name: string; value: number; status?: string }

interface Props {
  revenusParBien: Slice[]
  encaissements: Slice[]
  repartition: Slice[]
}

const VIEWS = [
  { key: 'revenus', label: 'Revenus par bien' },
  { key: 'encaissements', label: 'Encaissements' },
  { key: 'repartition', label: 'Répartition' },
] as const
type ViewKey = typeof VIEWS[number]['key']

const STORAGE_KEY = 'dashboard_chart_view'
const PALETTE = ['#1D4ED8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E', '#84CC16']
const STATUS_COLOR: Record<string, string> = { paid: '#10B981', pending: '#F59E0B', late: '#EF4444' }

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-2.5 shadow-xl text-xs">
      <p className="text-[var(--text-secondary)] font-medium">{p.payload.name}</p>
      <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(p.value)}</p>
    </div>
  )
}

export function DashboardChart({ revenusParBien, encaissements, repartition }: Props) {
  const [view, setView] = useState<ViewKey>('revenus')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewKey | null
    if (saved && VIEWS.some(v => v.key === saved)) setView(saved)
  }, [])

  const pick = (v: ViewKey) => { setView(v); localStorage.setItem(STORAGE_KEY, v) }

  const dataset = view === 'revenus' ? revenusParBien : view === 'encaissements' ? encaissements : repartition
  const isEmpty = dataset.length === 0

  return (
    <GlassCard>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-display font-semibold text-[var(--text-primary)]">
          {VIEWS.find(v => v.key === view)?.label}
        </h2>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => pick(v.key)}
              className={`px-3 h-7 rounded-md text-xs font-semibold transition-all ${
                view === v.key ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">
          Pas encore de données pour cette vue.
        </div>
      ) : view === 'revenus' ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenusParBien} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(29,78,216,0.05)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {revenusParBien.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={dataset} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {dataset.map((d, i) => (
                <Cell key={i} fill={view === 'encaissements' ? (STATUS_COLOR[d.status ?? ''] ?? PALETTE[i]) : PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      )}

      {/* Légende */}
      {!isEmpty && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {dataset.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: view === 'encaissements' ? (STATUS_COLOR[d.status ?? ''] ?? PALETTE[i]) : PALETTE[i % PALETTE.length] }} />
              <span className="text-slate-500">{d.name}</span>
              <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(d.value)}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
