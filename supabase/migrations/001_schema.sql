-- Extensions
create extension if not exists "uuid-ossp";

-- Enum types
create type property_type as enum ('airbnb', 'sci', 'lmnp', 'nu', 'commerce');
create type payment_status as enum ('paid', 'late', 'partial', 'pending');
create type incident_status as enum ('open', 'in_progress', 'resolved');
create type plan_type as enum ('starter', 'pro', 'premium');

-- Profiles (extension de auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  plan plan_type default 'starter',
  stripe_customer_id text,
  stripe_subscription_id text,
  onboarding_done boolean default false,
  created_at timestamptz default now()
);

-- Biens immobiliers
create table public.properties (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  name text not null,
  type property_type not null,
  address text,
  city text,
  postal_code text,
  surface_m2 numeric,
  purchase_price numeric,
  purchase_year int,
  monthly_charges numeric default 0,
  property_tax numeric default 0,
  insurance_annual numeric default 0,
  loan_monthly numeric default 0,
  loan_rate numeric,
  loan_end_date date,
  lmnp_regime text check (lmnp_regime in ('micro', 'reel')),
  sci_name text,
  sci_siren text,
  sci_regime text check (sci_regime in ('ir', 'is')),
  airbnb_max_nights int default 120,
  airbnb_platform_fees numeric default 3,
  bail_type text,
  indice_revision text check (indice_revision in ('irl', 'ilc', 'ilat')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Baux
create table public.leases (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties on delete cascade not null,
  tenant_name text not null,
  tenant_email text,
  tenant_phone text,
  monthly_rent numeric not null,
  charges numeric default 0,
  deposit numeric default 0,
  start_date date not null,
  end_date date,
  notice_months int default 1,
  indexation_index text default 'irl',
  last_revision_date date,
  pdf_url text,
  parsed_data jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Paiements loyers
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  lease_id uuid references public.leases on delete cascade not null,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status payment_status default 'pending',
  note text,
  relance_count int default 0,
  last_relance_at timestamptz,
  created_at timestamptz default now()
);

-- Dépenses
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties on delete cascade not null,
  amount numeric not null,
  category text not null,
  fiscal_deductible boolean default true,
  description text,
  date date not null,
  receipt_url text,
  created_at timestamptz default now()
);

-- Plan d'amortissement LMNP
create table public.depreciation_plans (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties on delete cascade not null,
  component text not null,
  value numeric not null,
  duration_years int not null,
  start_date date not null,
  annual_amount numeric generated always as (value / duration_years) stored,
  created_at timestamptz default now()
);

-- Associés SCI
create table public.sci_associates (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties on delete cascade not null,
  name text not null,
  email text,
  share_pct numeric not null check (share_pct > 0 and share_pct <= 100),
  created_at timestamptz default now()
);

-- Réservations Airbnb
create table public.airbnb_bookings (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties on delete cascade not null,
  check_in date not null,
  check_out date not null,
  nights int generated always as (check_out - check_in) stored,
  nightly_rate numeric not null,
  platform_fee_pct numeric default 3,
  total_revenue numeric,
  guest_name text,
  created_at timestamptz default now()
);

-- Tickets travaux / incidents
create table public.incidents (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties on delete cascade not null,
  title text not null,
  description text,
  status incident_status default 'open',
  cost numeric default 0,
  reported_by text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Messages IA Copilot
create table public.ai_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  property_id uuid references public.properties,
  created_at timestamptz default now()
);

-- Indexes
create index on public.properties(user_id);
create index on public.leases(property_id);
create index on public.payments(lease_id, status);
create index on public.expenses(property_id, date);
create index on public.incidents(property_id, status);
create index on public.ai_messages(user_id, created_at);
