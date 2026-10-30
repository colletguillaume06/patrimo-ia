import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { BiensList } from '@/components/dashboard/BiensList'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { DashboardChart } from '@/components/dashboard/DashboardChart'
import { AiCopilotWidget } from '@/components/dashboard/AiCopilotWidget'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DashboardMetrics, PropertyWithMetrics, Alert } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Rediriger vers l'onboarding si pas encore fait
  const { data: profile } = await supabase.from('profiles').select('onboarding_done').eq('id', user.id).single()
  if (profile && !(profile as any).onboarding_done) redirect('/onboarding')

  const [
    { data: properties },
    { data: payments },
    { data: expenses },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('*, leases(*, payments(*)), airbnb_bookings(nights, total_revenue, check_in)')
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

  // Patrimoine total : prix d'achat si renseigné, sinon ESTIMATION BASSE basée sur
  // la localisation (prix/m² prudent) × la surface. Repli sur capitalisation des loyers
  // à 10 % (valeur basse) quand surface/adresse manquent.
  // Prix/m² VOLONTAIREMENT BAS (fourchette basse du marché), par DÉPARTEMENT (2 premiers
  // chiffres du code postal) afin de fonctionner pour n'importe quel bien / compte.
  // Valeurs prudentes : habitation (hab) et commerce (com). Défaut national si dépt inconnu.
  const GRILLE_DEPT: Record<string, { hab: number; com: number }> = {
    '06': { hab: 3200, com: 2300 }, // Alpes-Maritimes
    '13': { hab: 2800, com: 2000 }, // Bouches-du-Rhône
    '69': { hab: 3500, com: 2400 }, // Rhône / Lyon
    '31': { hab: 2800, com: 2000 }, // Haute-Garonne / Toulouse
    '33': { hab: 3200, com: 2200 }, // Gironde / Bordeaux
    '44': { hab: 3000, com: 2100 }, // Loire-Atlantique / Nantes
    '59': { hab: 2400, com: 1800 }, // Nord / Lille
    '34': { hab: 2800, com: 2000 }, // Hérault / Montpellier
    '67': { hab: 2800, com: 2000 }, // Bas-Rhin / Strasbourg
    '83': { hab: 3000, com: 2100 }, // Var
    '75': { hab: 7000, com: 5000 }, // Paris
    '92': { hab: 5000, com: 3500 }, // Hauts-de-Seine
    '93': { hab: 3000, com: 2100 }, // Seine-Saint-Denis
    '94': { hab: 3800, com: 2700 }, // Val-de-Marne
    '77': { hab: 2600, com: 1900 }, // Seine-et-Marne
    '78': { hab: 3500, com: 2400 }, // Yvelines
    '91': { hab: 2800, com: 2000 }, // Essonne
    '95': { hab: 2800, com: 2000 }, // Val-d'Oise
  }
  const DEFAUT_NATIONAL = { hab: 2000, com: 1500 } // défaut prudent (bas) hors zones listées

  const prixM2Bas = (p: any): number => {
    const dept = String(p.postal_code ?? '').trim().slice(0, 2)
    const g = GRILLE_DEPT[dept] ?? DEFAUT_NATIONAL
    return p.type === 'commerce' ? g.com : g.hab
  }

  const annualRentOf = (p: any): number => (p.leases ?? [])
    .filter((l: any) => l.is_active)
    .reduce((s: number, l: any) => s + (l.monthly_rent ?? 0) * 12, 0)

  // Valeur de marché ESTIMÉE (toujours actuelle). On n'utilise PAS le prix d'achat
  // comme base — après plusieurs années il ne reflète plus la valeur réelle ni le
  // rendement. Le prix d'achat ne sert que d'ultime repli si rien d'autre n'est calculable.
  const marketValue = (p: any): number => {
    const annualRent = annualRentOf(p)

    // LOCAL COMMERCIAL : marché évalué par capitalisation du loyer au taux commercial.
    // Rendement commercial élevé (10 %) → valeur volontairement BASSE. Repli surface × prix/m² commerce.
    if (p.type === 'commerce') {
      if (annualRent > 0) return Math.round(annualRent / 0.10)
      if (p.surface_m2 && p.surface_m2 > 0) return Math.round(p.surface_m2 * prixM2Bas(p))
      return p.purchase_price && p.purchase_price > 0 ? p.purchase_price : 0
    }

    // RÉSIDENTIEL (nu / lmnp / airbnb) : surface × prix/m² habitation bas selon la localisation.
    if (p.surface_m2 && p.surface_m2 > 0) {
      return Math.round(p.surface_m2 * prixM2Bas(p))
    }
    // Repli résidentiel : capitalisation du loyer à 7 % (valeur basse mais marché résidentiel)
    if (annualRent > 0) return Math.round(annualRent / 0.07)
    return p.purchase_price && p.purchase_price > 0 ? p.purchase_price : 0
  }

  const total_patrimoine = props.reduce((s, p) => s + marketValue(p), 0)

  // Mois de référence : le mois courant s'il contient des loyers,
  // sinon le dernier mois pour lequel des loyers sont renseignés
  // (ex. on est en 2026 sans données → on affiche déc. 2025).
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const now = new Date()
  const currentKey = monthKey(now)
  const paymentMonths = Array.from(
    new Set((payments ?? []).map(p => monthKey(new Date(p.due_date))))
  ).sort()
  const hasCurrentMonth = paymentMonths.includes(currentKey)
  const refKey = hasCurrentMonth
    ? currentKey
    : (paymentMonths[paymentMonths.length - 1] ?? currentKey)

  const thisMonthPayments = (payments ?? []).filter(
    p => monthKey(new Date(p.due_date)) === refKey
  )

  // Recettes Airbnb du mois de référence (une ligne de synthèse par mois)
  const airbnbThisMonth = props.reduce((s: number, p: any) =>
    s + (p.airbnb_bookings ?? [])
      .filter((b: any) => monthKey(new Date(b.check_in)) === refKey)
      .reduce((a: number, b: any) => a + (b.total_revenue || 0), 0), 0)

  const loyers_encaisses = thisMonthPayments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0) + airbnbThisMonth

  const loyers_total = thisMonthPayments.reduce((s, p) => s + p.amount, 0) + airbnbThisMonth

  const monthly_charges_total = props.reduce((s, p) =>
    s + p.monthly_charges + p.loan_monthly + (p.property_tax / 12) + (p.insurance_annual / 12), 0
  )

  const monthly_cashflow = loyers_encaisses - monthly_charges_total

  // Rendement = loyer annuel / VALEUR DE MARCHÉ estimée (et non le prix d'achat).
  const yields = props
    .map(p => ({ rent: annualRentOf(p), val: marketValue(p) }))
    .filter(x => x.rent > 0 && x.val > 0)
    .map(x => (x.rent / x.val) * 100)

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
      // Plafond à 0 = résidence secondaire : aucune limite, donc aucune alerte.
      const maxN = prop.airbnb_max_nights ?? 0
      if (maxN > 0 && totalNights > maxN * 0.83) {
        alertes.push({
          type: 'airbnb_limit',
          property_id: prop.id,
          property_name: prop.name,
          message: `${totalNights}/${maxN} nuits utilisées cette année. Attention à la limite légale.`,
          severity: totalNights > maxN * 0.92 ? 'high' : 'medium',
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

  // ── Données des 3 vues du widget dashboard (choix mémorisé côté client) ──
  const chartYear = now.getFullYear()

  // 1. Revenus par bien sur l'année (loyers encaissés + recettes Airbnb)
  const revenusParBien = props.map((p: any) => {
    const rentPaid = (p.leases ?? []).flatMap((l: any) => l.payments ?? [])
      .filter((pay: any) => pay.status === 'paid' && new Date(pay.due_date).getFullYear() === chartYear)
      .reduce((s: number, pay: any) => s + pay.amount, 0)
    const airbnb = (p.airbnb_bookings ?? [])
      .filter((b: any) => new Date(b.check_in).getFullYear() === chartYear)
      .reduce((s: number, b: any) => s + (b.total_revenue || 0), 0)
    return { name: p.name, value: Math.round(rentPaid + airbnb) }
  }).filter((x: any) => x.value > 0).sort((a: any, b: any) => b.value - a.value)

  // 2. Santé des encaissements (12 mois glissants) par statut
  const encaissements = [
    { key: 'paid', name: 'Payé' }, { key: 'pending', name: 'En attente' }, { key: 'late', name: 'En retard' },
  ].map(st => ({
    name: st.name, status: st.key,
    value: Math.round((payments ?? []).filter((p: any) => p.status === st.key).reduce((s: number, p: any) => s + p.amount, 0)),
  })).filter(x => x.value > 0)

  // 3. Répartition du patrimoine par bien (valeur de marché estimée)
  const repartition = props.map((p: any) => ({ name: p.name, value: Math.round(marketValue(p) || 0) }))
    .filter((x: any) => x.value > 0).sort((a: any, b: any) => b.value - a.value)

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
    const valMarche = marketValue(p)
    const gross_yield = valMarche && monthlyRent
      ? (monthlyRent * 12 / valMarche) * 100
      : null
    const total_charges_monthly = p.monthly_charges + p.loan_monthly + (p.property_tax / 12) + (p.insurance_annual / 12)
    const monthly_cashflow_bien = monthlyRent - total_charges_monthly
    const net_yield = valMarche && monthlyRent
      ? (monthly_cashflow_bien * 12 / valMarche) * 100
      : null

    const allPayments = p.leases?.flatMap((l: any) => l.payments ?? []) ?? []
    const latest_payment = allPayments.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null

    const refYear = Number(refKey.slice(0, 4))
    const ytdPayments = allPayments.filter((pay: any) =>
      new Date(pay.due_date).getFullYear() === refYear && pay.status === 'paid'
    )
    const ytdExpenses = (expenses ?? []).filter((e: any) =>
      e.property_id === p.id && new Date(e.date).getFullYear() === refYear
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

  // Rappel taxe foncière : de septembre à décembre, si des biens ont une taxe
  // foncière connue non encore enregistrée comme dépense pour l'année en cours.
  const currentYear = now.getFullYear()
  const tfSeason = now.getMonth() >= 8 // septembre (index 8) → décembre
  const tfManquantes = tfSeason
    ? props.filter((p: any) =>
        (p.property_tax ?? 0) > 0 &&
        !(expenses ?? []).some((e: any) =>
          e.property_id === p.id && e.category === 'taxe' && new Date(e.date).getFullYear() === currentYear))
        .length
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Tableau de bord</h1>
        <p className="text-slate-400 text-sm mt-1">Bienvenue sur Patrimo</p>
      </div>

      {tfManquantes > 0 && (
        <a href="/charges-annuelles"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-amber-400/10"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <span className="text-lg">📩</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#B45309' }}>
              Taxe foncière à enregistrer pour {tfManquantes} bien{tfManquantes > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-500">
              Les avis arrivent en septembre. Saisissez-les pour qu'elles comptent dans vos exports →
            </p>
          </div>
        </a>
      )}

      <KpiGrid metrics={metrics} />

      {alertes.length > 0 && <AlertsPanel alerts={alertes} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BiensList biens={biensWithMetrics} />
        </div>
        <AiCopilotWidget />
      </div>

      <DashboardChart revenusParBien={revenusParBien} encaissements={encaissements} repartition={repartition} />
    </div>
  )
}
