import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileLMNP } from '@/components/biens/profiles/ProfileLMNP'
import { ProfileNu } from '@/components/biens/profiles/ProfileNu'
import { ProfileSCI } from '@/components/biens/profiles/ProfileSCI'
import { ProfileAirbnb } from '@/components/biens/profiles/ProfileAirbnb'
import { ProfileCommerce } from '@/components/biens/profiles/ProfileCommerce'
import Link from 'next/link'
import { ChevronLeft, Stethoscope, CreditCard, Building, Users, Wrench } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BienDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: property } = await supabase
    .from('properties')
    .select(`
      *,
      leases(*, payments(*)),
      expenses(*),
      depreciation_plans(*),
      sci_associates(*),
      airbnb_bookings(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!property) notFound()

  const activeLeases = property.leases?.filter((l: any) => l.is_active) ?? []
  const active_lease = activeLeases[0] ?? null
  const monthlyRent = active_lease?.monthly_rent ?? 0
  const gross_yield = property.purchase_price && monthlyRent
    ? (monthlyRent * 12 / property.purchase_price) * 100 : null
  const total_charges = property.monthly_charges + property.loan_monthly + (property.property_tax / 12) + (property.insurance_annual / 12)
  const monthly_cashflow = monthlyRent - total_charges

  const now = new Date()
  const expenses_ytd = (property.expenses ?? []).filter((e: any) =>
    new Date(e.date).getFullYear() === now.getFullYear()
  )
  const bookings_ytd = (property.airbnb_bookings ?? []).filter((b: any) =>
    new Date(b.check_in).getFullYear() === now.getFullYear()
  )

  const enriched = {
    ...property,
    active_lease,
    gross_yield,
    monthly_cashflow,
    expenses_ytd,
    bookings_ytd,
    associates: property.sci_associates ?? [],
    depreciation_plans: property.depreciation_plans ?? [],
  }

  // Onglets disponibles selon le type
  const tabs = [
    { href: `/biens/${id}`, label: 'Vue d\'ensemble', icon: null, always: true },
    { href: `/biens/${id}/diagnostics`, label: 'Diagnostics', icon: Stethoscope, always: true },
    { href: `/biens/${id}/financement`, label: 'Financement', icon: CreditCard, always: !!property.loan_monthly },
    { href: `/biens/${id}/copropriete`, label: 'Copropriété', icon: Building, always: false },
    { href: `/biens/${id}/sci-cca`, label: 'Comptes courants', icon: Users, always: property.type === 'sci' },
  ].filter(t => t.always !== false || t.always)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link href="/biens"
        className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: 'var(--text-tertiary)' }}>
        <ChevronLeft className="h-4 w-4" /> Retour à mes biens
      </Link>

      {/* Onglets de navigation */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <Link key={tab.href} href={tab.href}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}>
            {tab.icon && <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />}
            {tab.label}
          </Link>
        ))}
        {/* Lien travaux pour ce bien */}
        <Link href={`/travaux`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
          style={{ color: 'var(--text-secondary)' }}>
          <Wrench className="h-3.5 w-3.5" /> Travaux
        </Link>
      </div>

      {property.type === 'lmnp' && <ProfileLMNP property={enriched} />}
      {property.type === 'nu' && <ProfileNu property={enriched} />}
      {property.type === 'sci' && <ProfileSCI property={enriched} />}
      {property.type === 'airbnb' && <ProfileAirbnb property={enriched} />}
      {property.type === 'commerce' && <ProfileCommerce property={enriched} />}
    </div>
  )
}
