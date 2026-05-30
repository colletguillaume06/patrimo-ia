'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BienCard } from '@/components/biens/BienCard'
import { AddBienModal } from '@/components/biens/AddBienModal'
import { Plus, Building2 } from 'lucide-react'
import type { PropertyWithMetrics } from '@/types'

export default function BiensPage() {
  const [biens, setBiens] = useState<PropertyWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadBiens = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer propriétés + baux + paiements + réservations Airbnb
      const [propsRes, bookingsRes] = await Promise.all([
        supabase
          .from('properties')
          .select('*, leases(*, payments(*))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('airbnb_bookings')
          .select('property_id, total_revenue, nightly_rate, nights, check_in')
          .gte('check_in', `${new Date().getFullYear()}-01-01`),
      ])

      const bookingsByProp: Record<string, any[]> = {}
      for (const b of bookingsRes.data ?? []) {
        if (!bookingsByProp[b.property_id]) bookingsByProp[b.property_id] = []
        bookingsByProp[b.property_id].push(b)
      }

      const now = new Date()

      const enriched: PropertyWithMetrics[] = (propsRes.data ?? []).map(p => {
        const activeLeases = p.leases?.filter((l: any) => l.is_active) ?? []
        const active_lease = activeLeases[0] ?? null
        const total_charges = p.monthly_charges + p.loan_monthly + (p.property_tax / 12) + (p.insurance_annual / 12)
        const allPayments = p.leases?.flatMap((l: any) => l.payments ?? []) ?? []
        const latest_payment = allPayments.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0] ?? null

        // Revenus YTD des paiements de loyers
        const loyers_ytd = allPayments
          .filter((pay: any) => pay.status === 'paid' && new Date(pay.due_date).getFullYear() === now.getFullYear())
          .reduce((s: number, pay: any) => s + pay.amount, 0)

        // Airbnb : calculer les revenus depuis les réservations
        const airbnbBookings = bookingsByProp[p.id] ?? []
        const airbnb_revenue_ytd = airbnbBookings.reduce((s, b) => s + (b.total_revenue ?? b.nightly_rate * (b.nights ?? 0)), 0)
        const airbnb_nuits_ytd = airbnbBookings.reduce((s, b) => s + (b.nights ?? 0), 0)
        const airbnb_monthly_avg = airbnb_revenue_ytd > 0 && now.getMonth() > 0
          ? airbnb_revenue_ytd / now.getMonth()
          : 0

        // Revenus effectifs selon le type
        const isAirbnb = p.type === 'airbnb'
        const monthlyRent = isAirbnb
          ? airbnb_monthly_avg
          : (active_lease?.monthly_rent ?? 0)

        const total_revenue_ytd = isAirbnb ? airbnb_revenue_ytd : loyers_ytd

        const gross_yield = p.purchase_price && monthlyRent > 0
          ? (monthlyRent * 12 / p.purchase_price) * 100
          : null

        return {
          ...p,
          gross_yield,
          net_yield: p.purchase_price && monthlyRent > 0 ? ((monthlyRent - total_charges) * 12 / p.purchase_price) * 100 : null,
          monthly_cashflow: monthlyRent - total_charges,
          total_revenue_ytd,
          total_expenses_ytd: 0,
          active_lease,
          latest_payment,
          // Extra Airbnb
          airbnb_nuits_ytd: isAirbnb ? airbnb_nuits_ytd : undefined,
          airbnb_monthly_avg: isAirbnb ? airbnb_monthly_avg : undefined,
        }
      })
      setBiens(enriched)
      setLoading(false)
    }
    loadBiens()
  }, [showAdd])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Mes biens</h1>
          <p className="text-slate-400 text-sm mt-1">{biens.length} bien{biens.length > 1 ? 's' : ''} dans votre portefeuille</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all"
        >
          <Plus className="h-4 w-4" /> Ajouter un bien
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : biens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="font-display font-semibold text-xl text-[var(--text-primary)] mb-2">Aucun bien</h2>
          <p className="text-slate-400 text-sm mb-6">Ajoutez votre premier bien pour commencer</p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all"
          >
            <Plus className="h-4 w-4" /> Ajouter un bien
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {biens.map(bien => <BienCard key={bien.id} bien={bien} />)}
        </div>
      )}

      {showAdd && <AddBienModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
