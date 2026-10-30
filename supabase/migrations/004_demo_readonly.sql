-- ═══════════════════════════════════════════════════════════════════════════
-- 004 — Dépenses annexes + compte démo public en lecture seule
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Correctif : dépenses annexes de gestion ─────────────────────────────
-- L'application enregistre les dépenses annexes dans `incidents` avec
-- property_id = NULL (dépense non rattachée à un bien) et une catégorie
-- fiscale propre aux annexes. Les deux contraintes actuelles rejettent ces
-- lignes : la fonctionnalité échoue en production.

alter table public.incidents alter column property_id drop not null;

alter table public.incidents drop constraint if exists incidents_categorie_fiscale_check;
alter table public.incidents add constraint incidents_categorie_fiscale_check
  check (categorie_fiscale in (
    -- travaux rattachés à un bien
    'entretien_reparation',
    'amelioration',
    'travaux_deductibles',
    'travaux_amortissables',
    'construction_agrandissement',
    -- dépenses annexes de gestion (property_id IS NULL)
    'materiel_informatique',
    'frais_gestion',
    'frais_deplacement',
    'abonnements',
    'fournitures',
    'honoraires'
  ));

-- Les policies RLS d'`incidents` passent par `properties`. Une dépense annexe
-- n'ayant pas de bien, on l'attache à l'utilisateur via une colonne dédiée.
alter table public.incidents add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists incidents_user_id_idx on public.incidents(user_id);

drop policy if exists "Users own incidents via properties" on public.incidents;
drop policy if exists "Users own incidents" on public.incidents;
create policy "Users own incidents" on public.incidents
  for all using (
    (property_id is not null and exists (
      select 1 from public.properties p
      where p.id = property_id and p.user_id = auth.uid()
    ))
    or (property_id is null and user_id = auth.uid())
  );

-- ── 2. Compte démo public en lecture seule ─────────────────────────────────
-- Le compte demo@propilot.app est accessible sans identifiants depuis le site
-- vitrine. Toute écriture est refusée au niveau base : c'est la seule garantie
-- réellement fiable, indépendante de l'UI.

create or replace function public.demo_user_id()
returns uuid language sql immutable as $$
  select 'dded7296-0ff6-4afb-9935-4bd6c8babac9'::uuid
$$;

create or replace function public.block_demo_writes()
returns trigger language plpgsql security definer as $$
begin
  if auth.uid() = public.demo_user_id() then
    raise exception 'DEMO_READONLY'
      using hint = 'Le compte de démonstration est en lecture seule.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'properties', 'leases', 'payments', 'expenses', 'incidents',
    'depreciation_plans', 'sci_associates', 'airbnb_bookings', 'diagnostics',
    'documents', 'contacts_bien', 'copro_appels_fonds', 'devis',
    'declarations_fiscales', 'deficits_fonciers', 'comptes_courants_associes',
    'tenants', 'modeles_baux', 'banking_connections', 'banking_transactions',
    'profiles'
  ]
  loop
    execute format('drop trigger if exists block_demo_writes on public.%I', t);
    execute format(
      'create trigger block_demo_writes before insert or update or delete on public.%I
         for each row execute function public.block_demo_writes()', t);
  end loop;
end $$;

-- `ai_messages` reste accessible en écriture : le Copilot IA doit pouvoir
-- répondre pendant la démo (les messages sont purgés à chaque re-seed).
