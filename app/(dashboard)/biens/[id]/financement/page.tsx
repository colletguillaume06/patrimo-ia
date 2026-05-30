'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChevronLeft, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import {
  generateTableauAmortissement, getPretKpis, getInteretsAnnee,
  type PretParams
} from '@/lib/financement/amortissement-pret'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

const FORM_INIT = {
  pret_banque: '', pret_numero: '',
  pret_capital: '', pret_taux_annuel: '', pret_duree_mois: '',
  pret_date_debut: '', pret_assurance_mensuelle: '0',
}

export default function FinancementPage() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<any>(null)
  const [form, setForm] = useState(FORM_INIT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const PER_PAGE = 12
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase.from('properties').select('id, name, pret_capital, pret_taux_annuel, pret_duree_mois, pret_date_debut, pret_assurance_mensuelle, pret_banque, pret_numero').eq('id', id).single()
    setProperty(data)
    if (data?.pret_capital) {
      setForm({
        pret_banque: data.pret_banque ?? '',
        pret_numero: data.pret_numero ?? '',
        pret_capital: String(data.pret_capital),
        pret_taux_annuel: String(data.pret_taux_annuel),
        pret_duree_mois: String(data.pret_duree_mois),
        pret_date_debut: data.pret_date_debut ?? '',
        pret_assurance_mensuelle: String(data.pret_assurance_mensuelle ?? 0),
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('properties').update({
      pret_banque: form.pret_banque || null,
      pret_numero: form.pret_numero || null,
      pret_capital: Number(form.pret_capital),
      pret_taux_annuel: Number(form.pret_taux_annuel),
      pret_duree_mois: Number(form.pret_duree_mois),
      pret_date_debut: form.pret_date_debut || null,
      pret_assurance_mensuelle: Number(form.pret_assurance_mensuelle) || 0,
    }).eq('id', id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Prêt enregistré')
    load()
  }

  const hasPret = property?.pret_capital && property?.pret_taux_annuel && property?.pret_duree_mois && property?.pret_date_debut

  const echeances = hasPret ? generateTableauAmortissement({
    capital: property.pret_capital,
    taux_annuel: property.pret_taux_annuel,
    duree_mois: property.pret_duree_mois,
    date_debut: new Date(property.pret_date_debut),
    assurance_mensuelle: property.pret_assurance_mensuelle ?? 0,
  }) : []

  const kpis = hasPret ? getPretKpis(echeances) : null
  const interetsAnnee = hasPret ? getInteretsAnnee(echeances, new Date().getFullYear()) : 0
  const totalPages = Math.ceil(echeances.length / PER_PAGE)
  const pageData = echeances.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const chartData = echeances.filter((_, i) => i % 3 === 0).map(e => ({
    mois: format(e.date, 'MM/yy'),
    capital: Math.round(e.capital_restant),
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/biens/${id}`} className="text-slate-400 hover:text-[var(--text-primary)] text-sm flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> {property?.name}
        </Link>
        <span className="text-slate-600">/</span>
        <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">Financement</h1>
      </div>

      {/* Formulaire prêt */}
      <GlassCard>
        <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4">Paramètres du prêt</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'pret_banque', label: 'Banque', placeholder: 'BNP Paribas' },
              { key: 'pret_numero', label: 'N° de prêt', placeholder: '12345678' },
              { key: 'pret_capital', label: 'Capital emprunté (€) *', placeholder: '200000', type: 'number', required: true },
              { key: 'pret_taux_annuel', label: 'Taux annuel (%) *', placeholder: '3.5', type: 'number', step: '0.01', required: true },
              { key: 'pret_duree_mois', label: 'Durée (mois) *', placeholder: '240', type: 'number', required: true },
              { key: 'pret_date_debut', label: 'Date 1ère échéance *', type: 'date', required: true },
              { key: 'pret_assurance_mensuelle', label: 'Assurance mensuelle (€)', placeholder: '50', type: 'number' },
            ].map(({ key, label, placeholder, type = 'text', required, step }: any) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type={type} step={step} placeholder={placeholder} value={(form as any)[key]} required={required}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} className="h-9 px-6 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold disabled:opacity-50 transition-all">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </GlassCard>

      {hasPret && kpis && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Mensualité totale', value: formatCurrency(kpis.mensualite_avec_assurance), sub: `dont ${formatCurrency(kpis.mensualite)} hors assurance`, color: 'text-[var(--text-primary)]' },
              { label: 'Capital restant dû', value: formatCurrency(kpis.capital_restant), sub: 'au jour d\'aujourd\'hui', color: 'text-amber-400' },
              { label: 'Intérêts ce mois', value: formatCurrency(kpis.part_interets_ce_mois), sub: `Capital : ${formatCurrency(kpis.part_capital_ce_mois)}`, color: 'text-red-400' },
              { label: `Intérêts déductibles ${new Date().getFullYear()}`, value: formatCurrency(interetsAnnee), sub: 'à reporter en charges', color: 'text-[var(--success)]' },
            ].map(({ label, value, sub, color }) => (
              <GlassCard key={label} className="p-4">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
              </GlassCard>
            ))}
          </div>

          {/* Graphique capital restant */}
          <GlassCard>
            <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">Évolution du capital restant dû</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradCapital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1A56DB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mois" tick={{ fill: '#8B9AB3', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 6)} />
                <YAxis tick={{ fill: '#8B9AB3', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: '#111E35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#F1F5F9' }} />
                <Area type="monotone" dataKey="capital" stroke="#1A56DB" strokeWidth={2} fill="url(#gradCapital)" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Tableau d'amortissement */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-[var(--text-primary)]">Tableau d'amortissement</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center disabled:opacity-30 hover:bg-white/[0.10]"><ChevronLeft className="h-4 w-4" /></button>
                <span>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center disabled:opacity-30 hover:bg-white/[0.10]"><ChevronDown className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-white/[0.06]">
                    {['N°','Date','Mensualité','Intérêts','Capital amorti','Assurance','Capital restant'].map(h =>
                      <th key={h} className="text-right py-2 px-3 font-medium first:text-left">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map(e => {
                    const isCurrentMonth = format(e.date, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
                    return (
                      <tr key={e.numero} className={`border-b border-white/[0.04] text-right ${isCurrentMonth ? 'bg-blue-500/10' : 'hover:bg-white/[0.02]'}`}>
                        <td className="py-2.5 px-3 text-left text-slate-500">{e.numero}</td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{format(e.date, 'MM/yyyy')}</td>
                        <td className="py-2.5 px-3 text-[var(--text-primary)] font-medium">{formatCurrency(e.mensualite)}</td>
                        <td className="py-2.5 px-3 text-red-400">{formatCurrency(e.interets)}</td>
                        <td className="py-2.5 px-3 text-[var(--success)]">{formatCurrency(e.capital_amorti)}</td>
                        <td className="py-2.5 px-3 text-slate-500">{formatCurrency(e.assurance)}</td>
                        <td className="py-2.5 px-3 text-amber-400 font-mono">{formatCurrency(e.capital_restant)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-green-400/5 border border-[var(--success)/20]">
              <p className="text-xs text-[var(--success)]">
                💡 Intérêts {new Date().getFullYear()} déductibles : <strong>{formatCurrency(interetsAnnee)}</strong> — à reporter ligne 250 du formulaire 2044 (foncier nu) ou en charges BIC (LMNP)
              </p>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
