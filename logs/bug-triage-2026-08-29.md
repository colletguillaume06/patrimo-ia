# Bug triage — 2026-08-29 (session automatique)

## Contexte de démarrage

- Branche de départ : `bug-fixes/2026-08-25` (tête `13702e1`).
- Dossier de travail avec **44 fichiers modifiés + ~22 fichiers/dossiers non suivis** non commités (dashboard, routes API, migrations Supabase, mode démo, marketing, `lib/fiscal/lmnp.ts`/`seuils.ts`, refonte `next-themes`, etc.) — travail en cours de Guillaume, non touché ni inclus dans les commits de cette session. Vérifié en fin de session : liste strictement identique à celle de début de session.
- Nouvelle branche créée : `bug-fixes/2026-08-29`, à partir du même commit `13702e1`.

## Incident évité en cours de session

Une première correction a été appliquée par erreur sur `app/api/baux/upload-doc/route.ts` : ce fichier n'a jamais été commité (le dossier `app/api/baux/` entier est non suivi par git — absent de `main` et de tout l'historique). Dès que cela a été identifié (`git log` ne trouve aucune trace du fichier, `git show <HEAD>:...` échoue), le correctif a été annulé et le fichier restauré à l'identique, sans commit. Le bug lui-même reste réel et non corrigé :

> **Non corrigé (fichier non commité)** — `app/api/baux/upload-doc/route.ts` lit/écrit `leases.parsed_data` via le client `service` (bypass RLS) sans jamais vérifier que le `lease_id` fourni appartient à l'utilisateur connecté. Un utilisateur authentifié peut donc fournir un `lease_id` arbitraire et faire écrire le chemin de son document dans le `parsed_data.docs` d'un bail appartenant à un autre compte. Si Guillaume commite ce fichier tel quel, il faudra ajouter un contrôle d'appartenance via le client `supabase` (RLS) avant tout accès via `service`, sur le modèle de `app/api/travaux/facture/route.ts` ou `app/api/loyers/relance/route.ts`.

## Rattrapage : BUG-2026-08-25-01

Le commit `13702e1` (fuite cross-comptes sur le compteur `loyers_en_retard` du Copilot IA, `app/api/ai/chat/route.ts`) existait déjà en tête de branche au démarrage de cette session, mais sans entrée `BACKLOG.md` ni log de session associés — la session du 25/08 semble avoir été interrompue avant l'étape de documentation. L'entrée a été rédigée rétroactivement dans `BACKLOG.md` (voir `BUG-2026-08-25-01`).

## Bugs corrigés cette session

### BUG-2026-08-29-01 — Import historique : colonne `fiscal_deductible` mal nommée
- **Fichiers** : `app/api/historique/import/route.ts`, `app/api/historique/import-mapping/route.ts`
- Les deux routes insèrent une dépense avec la clé `deductible`, alors que la colonne réelle sur `expenses` est `fiscal_deductible` (`001_schema.sql` ligne 92 ; `types/index.ts`). Postgrest rejette l'insertion pour colonne inconnue : **toutes** les lignes de l'onglet "Dépenses" d'un import historique échouaient (erreur bien remontée dans `results.errors`, mais fonctionnalité intégralement cassée depuis son introduction).
- Correctif : clé renommée `fiscal_deductible` dans les deux routes.
- Commits : `0111ad1`, `350fc5d`.

### BUG-2026-08-29-02 — Import intelligent (IA) : même défaut sur 5 sites, dont 3 avec faux succès
- **Fichier** : `app/api/import-intelligent/valider/route.ts`
- Même défaut sur 5 insertions `expenses` distinctes (tableau de loyers, taxe foncière, assurance, deuxième variante image, dépenses de déclaration fiscale importée). Sur 3 des 5 sites, l'erreur d'insertion n'était même pas vérifiée : `results.depenses` était incrémenté sans condition, donnant un message de succès trompeur à l'utilisateur alors qu'aucune dépense n'était réellement enregistrée.
- Correctif : clé renommée `fiscal_deductible` sur les 5 sites + vérification de l'erreur ajoutée sur les 3 sites qui l'ignoraient.
- Commit : `f725441`.

**Découverte** : en croisant tous les usages du champ `deductible`/`fiscal_deductible` dans le code (déclenché par une incohérence remarquée sur la page "Tableau fiscal", voir point ouvert ci-dessous), il est apparu que `demo/seed`, `demo/toggle`, les 3 routes d'export et `ProfileNu.tsx`/`fiscalite/declaration/page.tsx` utilisent tous correctement `fiscal_deductible`, alors que les 3 routes d'import ci-dessus utilisaient `deductible` — confirmant qu'il s'agit bien d'un nom de colonne incorrect et non d'une variante légitime.

## Point ouvert signalé (non corrigé)

**Tableau fiscal (`app/(dashboard)/fiscal/page.tsx`) : les charges non déductibles sont comptées dans la base imposable.** La page somme `expenses_ytd.reduce((s, e) => s + e.amount, 0)` sans filtrer sur `e.fiscal_deductible`, avant de passer ce total aux simulateurs LMNP/foncier/SCI-IR — une dépense explicitement non déductible réduit donc à tort l'impôt estimé affiché. Bug réel et bloquant (confirmé présent aussi bien dans le commit `13702e1` que dans la version actuellement modifiée sur disque), mais le fichier fait partie des 44 fichiers avec changements non commités de Guillaume : non corrigé pour ne pas interférer avec son travail en cours. Correctif proposé documenté dans `BACKLOG.md` (filtrer sur `e.fiscal_deductible !== false` avant sommation, comme le fait déjà `ProfileNu.tsx`).

## Zones parcourues sans nouveau bug trouvé

`lib/fiscal/foncier.ts`, `sci.ts`, `indices.ts` (taux de PS 17,2% cohérents avec la note du 19/08 — seul le LMNP passe à 18,6% suite à la LFSS 2026, changement en cours côté Guillaume) ; `app/api/stripe/checkout` et `webhook` ; `app/api/tenants/link`, `admin/create-access`, `referral` (déjà sécurisée côté WIP) ; `banking/connect`/`callback`/`institutions` ; `app/api/storage/file` (contrôle par préfixe utilisateur correct) ; `app/api/historique/analyse`, `template` ; `app/api/dvf/estimation` (données de marché statiques — le libellé de source "FNAIM · Notaires · MeilleursAgents" est trompeur puisqu'il s'agit d'une table interne codée en dur et non d'un appel à ces organismes ; remarque produit, pas de bug fonctionnel corrigé) ; `app/api/emails/send`, `cron/onboarding-emails` ; `app/api/tenants/seed` (données personnelles réelles codées en dur dans une route utilitaire — remarque d'hygiène, hors périmètre bug) ; `app/api/loyers/relance` (contrôle d'appartenance correct).

## Vérifications

- `npx tsc --noEmit` : aucune erreur sur l'ensemble du projet, avant et après les 3 commits.
- `npm run build` : toujours inexécutable dans cet environnement (échec de téléchargement du binaire SWC natif linux/arm64 — limitation déjà documentée depuis la session du 06/08).
- Correction vérifiée par lecture croisée du schéma (`supabase/migrations/001_schema.sql`) et de `types/index.ts`, et par recherche exhaustive de tous les usages de `deductible`/`fiscal_deductible` dans le code pour confirmer qu'aucun autre site n'a le même défaut dans du code committé.

## Blocages d'environnement (inchangés)

- `.git/index.lock` / `.git/HEAD.lock` / `.git/objects/*/tmp_obj_*` : restriction sur `unlink`, contournée par renommage du fichier de verrou avant chaque commande git (les commits aboutissent malgré les avertissements).
- **Push non effectué** : aucun identifiant GitHub disponible. Testé en HTTPS (`fatal: could not read Username`) et en SSH (`Host key verification failed`). Guillaume doit pousser lui-même : `git push -u origin bug-fixes/2026-08-29` (et les branches précédentes encore locales : `2026-08-06`, `2026-08-19`, `2026-08-23`, `2026-08-24`, `2026-08-25`).

## Résumé

- **3 bugs bloquants corrigés** (BUG-2026-08-29-01 sur 2 fichiers, BUG-2026-08-29-02 sur 1 fichier à 5 sites) : import de dépenses historiques et import intelligent tous deux intégralement cassés par un mauvais nom de colonne, avec en prime un faux signal de succès sur 3 sites.
- **1 rattrapage de documentation** pour un correctif de la session du 25/08 resté non documenté.
- **1 point bloquant ouvert, signalé mais non corrigé** : filtrage `fiscal_deductible` manquant sur la page "Tableau fiscal" — nécessite l'intervention de Guillaume car le fichier est en plein travail en cours de sa part.
- **Branche prête à relire/merger** : `bug-fixes/2026-08-29` (3 commits : `0111ad1`, `350fc5d`, `f725441`), en plus des branches précédentes toujours non poussées.
