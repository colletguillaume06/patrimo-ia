-- Activer RLS
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.leases enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.depreciation_plans enable row level security;
alter table public.sci_associates enable row level security;
alter table public.airbnb_bookings enable row level security;
alter table public.incidents enable row level security;
alter table public.ai_messages enable row level security;

-- Policies
create policy "Users own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users own properties" on public.properties
  for all using (auth.uid() = user_id);

create policy "Users own leases via properties" on public.leases
  for all using (
    exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid())
  );

create policy "Users own payments via leases" on public.payments
  for all using (
    exists (
      select 1 from public.leases l
      join public.properties p on p.id = l.property_id
      where l.id = lease_id and p.user_id = auth.uid()
    )
  );

create policy "Users own expenses" on public.expenses
  for all using (
    exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid())
  );

create policy "Users own depreciation" on public.depreciation_plans
  for all using (
    exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid())
  );

create policy "Users own sci associates" on public.sci_associates
  for all using (
    exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid())
  );

create policy "Users own bookings" on public.airbnb_bookings
  for all using (
    exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid())
  );

create policy "Users own incidents" on public.incidents
  for all using (
    exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid())
  );

create policy "Users own ai messages" on public.ai_messages
  for all using (auth.uid() = user_id);

-- Trigger: créer profile automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
