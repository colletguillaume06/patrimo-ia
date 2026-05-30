'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'

interface CashflowChartProps {
  data: Array<{ month: string; revenus: number; charges: number }>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E5E2DB] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-[#3D3A36] mb-2 font-medium">{label}</p>
      <p className="text-green-400">Revenus : {formatCurrency(payload[0]?.value ?? 0)}</p>
      <p className="text-red-400">Charges : {formatCurrency(payload[1]?.value ?? 0)}</p>
    </div>
  )
}

export function CashflowChart({ data }: CashflowChartProps) {
  return (
    <GlassCard>
      <h2 className="font-display font-semibold text-[#0A0908] mb-4">Revenus & Charges — 12 mois</h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCharges" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#3D3A36', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#3D3A36', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenus"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#gradRevenus)"
          />
          <Area
            type="monotone"
            dataKey="charges"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#gradCharges)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>
  )
}
