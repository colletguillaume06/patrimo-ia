-- ═══════════════════════════════════════════════════════════════════════════
-- 006 — Buckets documents & baux en privé
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Les buckets `documents` (avis d'imposition, pièces justificatives) et `baux`
-- (PDF de baux, pièces locataires) étaient publics : n'importe qui connaissant
-- l'URL pouvait accéder à ces documents sensibles.
--
-- Ils passent en privé. Les uploads stockent désormais le chemin interne
-- (préfixé par l'id utilisateur) au lieu d'une URL publique, et la lecture
-- passe par /api/storage/file, qui génère une URL signée à durée limitée après
-- contrôle du propriétaire par préfixe de chemin.
--
-- Le résolveur accepte aussi les anciennes URLs publiques encore stockées en
-- base (17 documents), donc aucune migration de données n'est nécessaire.

update storage.buckets set public = false where id in ('documents', 'baux');
