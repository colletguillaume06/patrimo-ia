import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileLMNP } from '@/components/biens/profiles/ProfileLMNP'
import { ProfileNu } from '@/components/biens/profiles/ProfileNu'
import { ProfileSCI } from '@/components/biens/profiles/ProfileSCI'
import { ProfileAirbnb } from '@/components/biens/profiles/ProfileAirbnb'
import { ProfileCommerce } from '@/components/biens/profiles/ProfileCommerce'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/biens"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0A0908] transition-colors mb-2"
      >
        <ChevronLeft className="h-4 w-4" /> Retour à mes biens
      </Link>

      {property.type === 'lmnp' && <ProfileLMNP property={enriched} />}
      {property.type === 'nu' && <ProfileNu property={enriched} />}
      {property.type === 'sci' && <ProfileSCI property={enriched} />}
      {property.type === 'airbnb' && <ProfileAirbnb property={enriched} />}
      {property.type === 'commerce' && <ProfileCommerce property={enriched} />}
    </div>
  )
}
