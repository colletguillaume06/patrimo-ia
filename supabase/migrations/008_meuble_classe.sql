-- ═══════════════════════════════════════════════════════════════════════════
-- 008 — Classement « meublé de tourisme »
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le classement (1 à 5 étoiles, délivré par un organisme accrédité) est
-- devenu un paramètre fiscal majeur depuis la loi « Le Meur » :
--
--   • meublé NON classé : plafond micro-BIC 15 000 €, abattement 30 %
--   • meublé CLASSÉ     : plafond micro-BIC 83 600 €, abattement 50 %
--
-- Sans cette information, l'app applique par défaut le régime le plus
-- contraignant (non classé) à tous les meublés de tourisme.

alter table public.properties
  add column if not exists meuble_classe boolean not null default false;

comment on column public.properties.meuble_classe is
  'Meublé de tourisme classé (étoiles Atout France) — détermine le plafond micro-BIC et l''abattement.';
