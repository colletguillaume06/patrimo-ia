-- ═══════════════════════════════════════════════════════════════════════════
-- 005 — Bucket de stockage des factures de travaux
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Correctif : la route /api/travaux/upload écrit dans un bucket `factures` qui
-- n'avait jamais été créé. Chaque tentative de « Joindre une facture » échouait
-- donc silencieusement (500 côté serveur, toast d'erreur côté client), et
-- `incidents.facture_url` restait NULL sur l'ensemble des comptes.
--
-- Ce bucket a été créé manuellement en production via l'API storage ; cette
-- migration le rend reproductible sur tout autre environnement.
--
-- Bucket PRIVÉ : les factures sont des documents financiers. Elles ne sont
-- jamais servies en URL publique. La route /api/travaux/upload stocke le chemin
-- interne (préfixé par l'id utilisateur) dans incidents.facture_url, et
-- /api/travaux/facture génère une URL signée à durée limitée après contrôle du
-- propriétaire via RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'factures',
  'factures',
  false,
  15728640, -- 15 Mo, aligné sur la limite de la route
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
