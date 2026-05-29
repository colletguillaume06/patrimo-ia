export type PropertyType = 'airbnb' | 'sci' | 'lmnp' | 'nu' | 'commerce'
export type PaymentStatus = 'paid' | 'late' | 'partial' | 'pending'
export type IncidentStatus = 'open' | 'in_progress' | 'resolved'
export type PlanType = 'starter' | 'pro' | 'premium'

export interface Profile {
  id: string
  full_name: string | null
  plan: PlanType
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  onboarding_done: boolean
  created_at: string
}

export interface Property {
  id: string
  user_id: string
  name: string
  type: PropertyType
  address: string | null
  city: string | null
  postal_code: string | null
  surface_m2: number | null
  purchase_price: number | null
  purchase_year: number | null
  monthly_charges: number
  property_tax: number
  insurance_annual: number
  loan_monthly: number
  loan_rate: number | null
  loan_end_date: string | null
  lmnp_regime: 'micro' | 'reel' | null
  sci_name: string | null
  sci_siren: string | null
  sci_regime: 'ir' | 'is' | null
  airbnb_max_nights: number
  airbnb_platform_fees: number
  bail_type: string | null
  indice_revision: 'irl' | 'ilc' | 'ilat' | null
  created_at: string
  updated_at: string
  leases?: Lease[]
  expenses?: Expense[]
  depreciation_plans?: DepreciationPlan[]
}

export interface Lease {
  id: string
  property_id: string
  tenant_name: string
  tenant_email: string | null
  tenant_phone: string | null
  monthly_rent: number
  charges: number
  deposit: number
  start_date: string
  end_date: string | null
  notice_months: number
  indexation_index: string
  last_revision_date: string | null
  pdf_url: string | null
  parsed_data: ParsedLeaseData | null
  is_active: boolean
  created_at: string
  payments?: Payment[]
}

export interface ParsedLeaseData {
  loyer: number | null
  charges: number | null
  depot_garantie: number | null
  date_debut: string | null
  date_fin: string | null
  duree_mois: number | null
  indice: string | null
  clauses_importantes: string[]
  type_bail: string | null
  raw_text?: string
}

export interface Payment {
  id: string
  lease_id: string
  amount: number
  due_date: string
  paid_date: string | null
  status: PaymentStatus
  note: string | null
  relance_count: number
  last_relance_at: string | null
  created_at: string
}

export interface Expense {
  id: string
  property_id: string
  amount: number
  category: ExpenseCategory
  fiscal_deductible: boolean
  description: string | null
  date: string
  receipt_url: string | null
  created_at: string
}

export type ExpenseCategory =
  | 'travaux'
  | 'gestion'
  | 'assurance'
  | 'taxe'
  | 'interet'
  | 'autre'

export interface DepreciationPlan {
  id: string
  property_id: string
  component: DepreciationComponent
  value: number
  duration_years: number
  start_date: string
  annual_amount: number
  created_at: string
}

export type DepreciationComponent =
  | 'gros_oeuvre'
  | 'toiture'
  | 'agencement'
  | 'mobilier'
  | 'terrain'

export interface SciAssociate {
  id: string
  property_id: string
  name: string
  email: string | null
  share_pct: number
  created_at: string
}

export interface AirbnbBooking {
  id: string
  property_id: string
  check_in: string
  check_out: string
  nights: number
  nightly_rate: number
  platform_fee_pct: number
  total_revenue: number | null
  guest_name: string | null
  created_at: string
}

export interface Incident {
  id: string
  property_id: string
  title: string
  description: string | null
  status: IncidentStatus
  cost: number
  reported_by: 'owner' | 'tenant'
  resolved_at: string | null
  created_at: string
}

export interface AiMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  property_id: string | null
  created_at: string
}

export interface PropertyWithMetrics extends Property {
  gross_yield: number | null
  net_yield: number | null
  monthly_cashflow: number | null
  total_revenue_ytd: number
  total_expenses_ytd: number
  active_lease: Lease | null
  latest_payment: Payment | null
}

export interface DashboardMetrics {
  total_patrimoine: number
  monthly_cashflow: number
  loyers_encaisses: number
  loyers_total: number
  rendement_moyen: number
  biens_count: number
  alertes: Alert[]
}

export interface Alert {
  type: 'bail_expire' | 'loyer_retard' | 'revision_possible' | 'fiscalite' | 'airbnb_limit'
  property_id: string
  property_name: string
  message: string
  severity: 'high' | 'medium' | 'low'
  action_label?: string
  action_href?: string
}

export interface LmnpSimulation {
  recettes: number
  charges_reelles: number
  amortissements: number
  resultat_bic: number
  impot_estime: number
  regime: 'micro' | 'reel'
  micro_bic_base: number
  micro_bic_impot: number
  economie_regime_reel: number
}

export interface FoncierSimulation {
  revenus_bruts: number
  charges_deductibles: number
  revenu_net: number
  deficit_foncier: number | null
  micro_impot: number
  reel_impot: number
  regime_optimal: 'micro' | 'reel'
  economie: number
}

export interface SciSimulation {
  resultat_comptable: number
  is_du: number
  dividendes_disponibles: number
  regime: 'is' | 'ir'
}

export interface StripePrice {
  id: string
  plan: PlanType
  amount: number
  interval: 'month' | 'year'
}
