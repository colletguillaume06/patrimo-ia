-- Bien vendu : date et prix de cession (null = bien toujours détenu)
alter table public.properties
  add column if not exists sold_at date,
  add column if not exists sale_price numeric;
