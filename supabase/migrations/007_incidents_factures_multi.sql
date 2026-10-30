-- ═══════════════════════════════════════════════════════════════════════════
-- 007 — Plusieurs justificatifs par dépense / travaux
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Jusqu'ici un travaux ne pouvait porter qu'un seul fichier (incidents.facture_url).
-- On ajoute une colonne `factures` : un tableau JSON d'entrées
-- { path, name, size } permettant de joindre plusieurs devis/factures.
--
-- `facture_url` est conservée (dépréciée) et rétro-remplie dans `factures` pour
-- ne rien perdre des justificatifs déjà uploadés.

alter table public.incidents
  add column if not exists factures jsonb not null default '[]'::jsonb;

-- Backfill : le justificatif unique existant devient la 1re entrée du tableau.
update public.incidents
set factures = jsonb_build_array(
      jsonb_build_object(
        'path', facture_url,
        'name', regexp_replace(facture_url, '^.*/', ''),
        'size', null
      )
    )
where facture_url is not null
  and (factures is null or factures = '[]'::jsonb);
