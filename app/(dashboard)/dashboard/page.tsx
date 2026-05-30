import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { BiensList } from '@/components/dashboard/BiensList'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { CashflowChart } from '@/components/dashboard/CashflowChart'
import { AiCopilotWidget } from '@/components/dashboard/AiCopilotWidget'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DashboardMetrics, PropertyWithMetrics, Alert } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: properties },
    { data: payments },
    { data: expenses },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('*, leases(*, payments(*))')
      .eq('user_id', user.id),
    supabase
      .from('payments')
      .select('*, lease:leases(property_id)')
      .gte('due_date', format(subMonths(new Date(), 12), 'yyyy-MM-dd')),
    supabase
      .from('expenses')
      .select('*')
      .gte('date', format(subMonths(new Date(), 12), 'yyyy-MM-dd')),
  ])

  const props = properties ?? []

  const total_patrimoine = props.reduce((s, p) => s + (p.purchase_price ?? 0), 0)

  const thisMonthPayments = (payments ?? []).filter(p => {
    const d = new Date(p.due_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const loyers_encaisses = thisMonthPayments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0)

  const loyers_total = thisMonthPayments.reduce((s, p) => s + p.amount, 0)

  const monthly_charges_total = props.reduce((s, p) =>
    s + p.monthly_charges + p.loan_monthly + (p.property_tax / 12) + (p.insurance_annual / 12), 0
  )

  const monthly_cashflow = loyers_encaisses - monthly_charges_total

  const yields = props
    .filter(p => p.purchase_price && p.leases?.[0]?.monthly_rent)
    .map(p => ((p.leases![0].monthly_rent * 12) / p.purchase_price!) * 100)

  const rendement_moyen = yields.length > 0
    ? yields.reduce((s, y) => s + y, 0) / yields.length
    : 0

  // Alertes
  const alertes: Alert[] = []

  const latePayments = (payments ?? []).filter(p => p.status === 'late')
  for (const pay of latePayments) {
    const prop = props.find(p => p.leases?.some((l: any) => l.id === pay.lease_id))
    if (prop) {
      alertes.push({
        type: 'loyer_retard',
        property_id: prop.id,
        property_name: prop.name,
        message: `Loyer de ${pay.amount}€ en retard depuis le ${format(new Date(pay.due_date), 'dd MMMM', { locale: fr })}`,
        severity: 'high',
        action_label: 'Envoyer relance',
        action_href: '/loyers',
      })
    }
  }

  for (const prop of props) {
    if (prop.type === 'airbnb') {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
      const bookings = await supabase
        .from('airbnb_bookings')
        .select('nights')
        .eq('property_id', prop.id)
        .gte('check_in', yearStart)
      const totalNights = (bookings.data ?? []).reduce((s: number, b: any) => s + (b.nights ?? 0), 0)
      if (totalNights > 100) {
        alertes.push({
          type: 'airbnb_limit',
          property_id: prop.id,
          property_name: prop.name,
          message: `${totalNights}/120 nuits utilisées cette année. Attention à la limite légale.`,
          severity: totalNights > 110 ? 'high' : 'medium',
          action_href: `/biens/${prop.id}`,
          action_label: 'Voir le détail',
        })
      }
    }

    const activeLeases = prop.leases?.filter((l: any) => l.is_active) ?? []
    for (const lease of activeLeases) {
      if (lease.end_date) {
        const months = Math.ceil((new Date(lease.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
        if (months <= 3 && months >= 0) {
          alertes.push({
            type: 'bail_expire',
            property_id: prop.id,
            property_name: prop.name,
            message: `Bail avec ${lease.tenant_name} expire dans ${months} mois`,
            severity: months <= 1 ? 'high' : 'medium',
            action_href: '/baux',
            action_label: 'Gérer le bail',
          })
        }
      }
    }
  }

  // Cashflow chart data
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i)
    const monthStart = startOfMonth(date).toISOString()
    const monthEnd = endOfMonth(date).toISOString()

    const monthPayments = (payments ?? []).filter(p =>
      p.due_date >= monthStart && p.due_date <= monthEnd && p.status === 'paid'
    )
    const monthExpenses = (expenses ?? []).filter((e: any) =>
      e.date >= monthStart && e.date <= monthEnd
    )

    return {
      month: format(date, 'MMM', { locale: fr }),
      revenus: monthPayments.reduce((s, p) => s + p.amount, 0),
      charges: monthExpenses.reduce((s: number, e: any) => s + e.amount, 0) + monthly_charges_total,
    }
  })

  const metrics: DashboardMetrics = {
    total_patrimoine,
    monthly_cashflow,
    loyers_encaisses,
    loyers_total,
    rendement_moyen,
    biens_count: props.length,
    alertes,
  }

  const biensWithMetrics: PropertyWithMetrics[] = props.map(p => {
    const activeLeases = p.leases?.filter((l: any) => l.is_active) ?? []
    const active_lease = activeLeases[0] ?? null
    const monthlyRent = active_lease?.monthly_rent ?? 0
    const gross_yield = p.purchase_price && monthlyRent
      ? (monthlyRent * 12 / p.purchase_price) * 100
      : null
    const total_charges_monthly = p.monthly_charges + p.loan_monthly + (p.property_tax / 12) + (p.insurance_annual / 12)
    const monthly_cashflow_bien = monthlyRent - total_charges_monthly
    const net_yield = p.purchase_price && monthlyRent
      ? (monthly_cashflow_bien * 12 / p.purchase_price) * 100
      : null

    const allPayments = p.leases?.flatMap((l: any) => l.payments ?? []) ?? []
    const latest_payment = allPayments.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null

    const now = new Date()
    const ytdPayments = allPayments.filter((pay: any) =>
      new Date(pay.due_date).getFullYear() === now.getFullYear() && pay.status === 'paid'
    )
    const ytdExpenses = (expenses ?? []).filter((e: any) =>
      e.property_id === p.id && new Date(e.date).getFullYear() === now.getFullYear()
    )

    return {
      ...p,
      gross_yield,
      net_yield,
      monthly_cashflow: monthly_cashflow_bien,
      total_revenue_ytd: ytdPayments.reduce((s: number, pay: any) => s + pay.amount, 0),
      total_expenses_ytd: ytdExpenses.reduce((s: number, e: any) => s + e.amount, 0),
      active_lease,
      latest_payment,
    }
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Tableau de bord</h1>
        <p className="text-slate-400 text-sm mt-1">Bienvenue sur Propilot AI</p>
      </div>

      <KpiGrid metrics={metrics} />

      {alertes.length > 0 && <AlertsPanel alerts={alertes} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BiensList biens={biensWithMetrics} />
        </div>
        <AiCopilotWidget />
      </div>

      <CashflowChart data={chartData} />
    </div>
  )
}
