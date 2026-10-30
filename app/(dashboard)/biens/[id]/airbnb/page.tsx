'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency, formatPct } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, Save, CalendarDays, AlertTriangle, Info } from 'lucide-react'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const CURRENT_YEAR = new Date().getFullYear()
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

export default function AirbnbSuiviPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [savingMonth, setSavingMonth] = useState<number | null>(null)
  const [property, setProperty] = useState<any>(null)
  const [year, setYear] = useState(CURRENT_YEAR)
  // Une ligne de saisie par mois : { nights, revenue }
  const [rows, setRows] = useState<{ nights: string; revenue: string }[]>(
    Array.from({ length: 12 }, () => ({ nights: '', revenue: '' }))
  )

  const load = async () => {
    setLoading(true)
    const { data: prop } = await supabase
      .from('properties')
      .select('id, name, type, airbnb_max_nights, airbnb_platform_fees')
      .eq('id', id).single()
    setProperty(prop)
    const { data: bookings } = await supabase
      .from('airbnb_bookings')
      .select('check_in, nights, total_revenue')
      .eq('property_id', id)
    // Agrège les réservations existantes par mois de l'année sélectionnée.
    const agg = Array.from({ length: 12 }, () => ({ nights: 0, revenue: 0 }))
    for (const b of (bookings ?? [])) {
      const d = new Date(b.check_in)
      if (d.getFullYear() !== year) continue
      agg[d.getMonth()].nights += b.nights ?? 0
      agg[d.getMonth()].revenue += b.total_revenue ?? 0
    }
    setRows(agg.map(a => ({
      nights: a.nights ? String(a.nights) : '',
      revenue: a.revenue ? String(Math.round(a.revenue)) : '',
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [id, year])

  const saveMonth = async (m: number) => {
    setSavingMonth(m)
    const nights = Number(rows[m].nights) || 0
    const revenue = Number(rows[m].revenue) || 0
    const mm = String(m + 1).padStart(2, '0')
    const monthStart = `${year}-${mm}-01`

    // `nights` est une colonne GÉNÉRÉE (check_out − check_in) : on ne peut pas
    // l'écrire. On positionne donc check_out pour que l'écart corresponde au
    // nombre de nuits saisi, sans jamais sortir du mois.
    const nightsInMonth = Math.min(Math.max(nights, 0), lastDay(year, m) - 1)
    const endDay = 1 + nightsInMonth
    const monthEnd = `${year}-${mm}-${String(endDay).padStart(2, '0')}`

    // Normalise ce mois en une seule ligne de synthèse : on remplace l'existant.
    const { data: existing } = await supabase
      .from('airbnb_bookings')
      .select('id, check_in')
      .eq('property_id', id)
    const toDelete = (existing ?? []).filter((b: any) => {
      const d = new Date(b.check_in)
      return d.getFullYear() === year && d.getMonth() === m
    }).map((b: any) => b.id)
    if (toDelete.length) await supabase.from('airbnb_bookings').delete().in('id', toDelete)

    if (nights > 0 || revenue > 0) {
      const { error } = await supabase.from('airbnb_bookings').insert({
        property_id: id,
        check_in: monthStart,
        check_out: monthEnd,
        // `nights` est calculé par la base, ne pas l'envoyer.
        nightly_rate: nightsInMonth > 0 ? revenue / nightsInMonth : 0,
        total_revenue: revenue,
        guest_name: `Synthèse ${MOIS[m]} ${year}`,
      })
      if (error) { toast.error(error.message); setSavingMonth(null); return }
    }
    setSavingMonth(null)
    toast.success(`${MOIS[m]} ${year} enregistré`)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
  )

  const totalNights = rows.reduce((s, r) => s + (Number(r.nights) || 0), 0)
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0)
  // Plafond à 0 = résidence secondaire : pas de limite ELAN.
  const maxNights = property?.airbnb_max_nights ?? 0
  const hasLimit = maxNights > 0
  const occupancy = (totalNights / 365) * 100
  const nearLimit = hasLimit && totalNights > maxNights * 0.83

  // Commission de plateforme : charge déductible, retenue sur les versements.
  // Les recettes saisies sont BRUTES (ce que paie le voyageur), la commission
  // est donc calculée par-dessus pour retrouver le net réellement viré.
  const feePct = Number(property?.airbnb_platform_fees) || 0
  const commission = totalRevenue * (feePct / 100)
  const netVerse = totalRevenue - commission

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-400" /> Suivi mensuel Airbnb
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{property?.name} · nuits louées et recettes par mois</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {[CURRENT_YEAR, CURRENT_YEAR - 1].map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-4 h-9 rounded-lg text-sm font-semibold transition-all ${
                y === year ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Synthèse annuelle */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Nuits louées', value: `${totalNights}`, color: hasLimit && totalNights > maxNights ? 'text-red-400' : 'text-[var(--text-primary)]' },
          { label: 'Recettes', value: formatCurrency(totalRevenue), color: 'text-[var(--success)]' },
          { label: "Taux d'occupation", value: formatPct(occupancy), color: 'text-amber-400' },
          hasLimit
            ? { label: `Plafond ${maxNights} nuits`, value: `${Math.max(0, maxNights - totalNights)} restantes`, color: nearLimit ? 'text-red-400' : 'text-slate-400' }
            : { label: 'Plafond de nuits', value: 'Aucun', color: 'text-slate-400' },
        ].map(k => (
          <GlassCard key={k.label} className="p-3">
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</p>
          </GlassCard>
        ))}
      </div>

      {nearLimit && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Vous approchez du plafond de {maxNights} nuits (loi ELAN pour une résidence principale).
          </p>
        </div>
      )}

      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-400/5 border border-blue-400/20">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Saisissez les <strong className="text-blue-400">nuits louées</strong> et les <strong className="text-blue-400">recettes brutes</strong> (le montant payé par le voyageur, avant commission — hors taxe de séjour).
          C'est cette base qui est imposable ; la commission est déduite comme charge.
        </p>
      </div>

      {/* Décomposition financière : ce qui est imposable vs ce qui est viré */}
      {totalRevenue > 0 && (
        <GlassCard className="p-4">
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-3">
            Décomposition {year}
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Recettes brutes <span className="text-xs">(base imposable)</span></span>
              <span className="font-mono font-semibold text-[var(--success)]">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                Commission plateforme <span className="text-xs">({feePct}% — charge déductible)</span>
              </span>
              <span className="font-mono font-semibold text-red-400">− {formatCurrency(commission)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span className="font-medium text-[var(--text-primary)]">Net perçu <span className="text-xs text-slate-500">(à rapprocher de vos virements)</span></span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{formatCurrency(netVerse)}</span>
            </div>
          </div>
          {feePct === 0 && (
            <p className="text-xs text-amber-400 mt-3">
              Aucune commission renseignée. Indiquez-la dans « Modifier le bien » → Location saisonnière pour la déduire.
            </p>
          )}
        </GlassCard>
      )}

      {/* Tableau mensuel */}
      <GlassCard className="p-5">
        <div className="space-y-1.5">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide px-2">
            <div className="col-span-4">Mois</div>
            <div className="col-span-3 text-center">Nuits louées</div>
            <div className="col-span-3 text-center">Recettes brutes (€)</div>
            <div className="col-span-2" />
          </div>
          {MOIS.map((mois, m) => (
            <div key={m} className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
              <div className="col-span-4 text-sm text-[var(--text-primary)]">{mois}</div>
              <div className="col-span-3">
                <input type="number" min="0" value={rows[m].nights}
                  onChange={e => setRows(rs => rs.map((r, i) => i === m ? { ...r, nights: e.target.value } : r))}
                  placeholder="0"
                  className="w-full h-9 px-2 rounded-lg bg-white border border-slate-200 text-[#0F172A] text-sm text-center focus:outline-none" />
              </div>
              <div className="col-span-3">
                <input type="number" min="0" value={rows[m].revenue}
                  onChange={e => setRows(rs => rs.map((r, i) => i === m ? { ...r, revenue: e.target.value } : r))}
                  placeholder="0"
                  className="w-full h-9 px-2 rounded-lg bg-white border border-slate-200 text-[#0F172A] text-sm text-right focus:outline-none" />
              </div>
              <div className="col-span-2 flex justify-end">
                <button onClick={() => saveMonth(m)} disabled={savingMonth === m}
                  className="h-8 px-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1">
                  {savingMonth === m ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2 items-center px-2 py-2 mt-1 rounded-lg border-t border-white/[0.08]">
            <div className="col-span-4 text-sm font-bold text-[var(--text-primary)]">Total {year}</div>
            <div className="col-span-3 text-center text-sm font-bold font-mono text-[var(--text-primary)]">{totalNights}</div>
            <div className="col-span-3 text-right text-sm font-bold font-mono text-[var(--success)]">{formatCurrency(totalRevenue)}</div>
            <div className="col-span-2" />
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
