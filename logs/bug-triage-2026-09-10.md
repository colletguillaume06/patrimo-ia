# Bug triage — session du 2026-09-10

## Contexte de démarrage

- Dossier de travail sur la branche `bug-fixes/2026-08-30` (tête `e49c544`), avec le même très gros volume de changements non commités que les sessions précédentes : 45 fichiers modifiés + 26 fichiers/dossiers non suivis (dashboard, routes API, migrations Supabase, mode démo, marketing, `lib/fiscal/lmnp.ts`, `lib/supabase/middleware.ts`/`server.ts`, `vercel.json`, etc.) — manifestement le travail en cours de Guillaume. Liste complète relevée en tout début de session et re-vérifiée après commit : strictement identique, seuls les 2 fichiers du correctif du jour s'y ajoutent.
- Branche dédiée créée : `bug-fixes/2026-09-10`, à partir de la tête de `bug-fixes/2026-08-30`.
- Nettoyage d'environnement nécessaire avant de pouvoir travailler : une référence git cassée locale (`refs/heads/bug-fixes/_stray_ref_renamed_2026-08-11`, héritée d'un incident d'environnement antérieur à cette session) empêchait `git fetch`. Déplacée hors de `refs/heads` (impossible à supprimer dans cet environnement — restriction sur `unlink`), après quoi le fetch a fonctionné. C'est la première session où le réseau git (fetch) est disponible ; le push reste bloqué (voir plus bas).

## Bug corrigé

### BUG-2026-09-10-01 — Import de travaux (historique + import intelligent) : colonnes et valeurs enum inexistantes sur `incidents`

- **Fichiers** : `app/api/historique/import/route.ts` (onglet "Travaux"), `app/api/import-intelligent/valider/route.ts` (détection "facture_travaux")
- **Constat** : les deux routes inséraient des colonnes inexistantes sur `incidents` (`estimated_cost`, `actual_cost`, `company`, `fiscal_category`, `date_fin` — au lieu de `cout_estime`, `cout_paye`, `nom_entreprise`, `categorie_fiscale`, sans équivalent pour une date de fin) et des valeurs hors des enum/contraintes réels : `status` (enum Postgres `incident_status`) n'accepte que `open`/`in_progress`/`resolved`, pas les libellés `planifie`/`en_cours`/`termine` utilisés ; `categorie_fiscale` (contrainte `CHECK`) n'accepte que `travaux_deductibles`/`travaux_amortissables`/`entretien_reparation`/`amelioration`/`construction_agrandissement`, pas `deductible`/`amortissable`/`non_deductible`. Ces derniers sont les libellés simplifiés volontairement présentés à l'utilisateur dans le modèle Excel (`historique/template`), mais la table de correspondance vers les valeurs réelles n'existait tout simplement pas. Résultat : 100% des lignes "Travaux" d'un import historique, et chaque facture de travaux détectée par l'import intelligent, étaient rejetées par Postgres — l'erreur était bien renvoyée dans `results.errors` (pas un faux succès), mais la fonctionnalité était totalement inopérante.
- **Sévérité** : Bloquant.
- **Correctif** : renommage vers les colonnes réelles + deux tables de correspondance (`planifie→open`, `en_cours→in_progress`, `termine→resolved` ; `deductible→travaux_deductibles`, `amortissable→travaux_amortissables`, `non_deductible→construction_agrandissement`, ce dernier mapping déduit de `isTravauxDeductible` dans `export/dossier-comptable/route.ts` qui traite déjà `construction_agrandissement` comme la seule catégorie ni déductible ni amortissable). Le champ "Date fin (optionnel)" du modèle, sans colonne dédiée, est reporté sur `resolved_at` quand le statut est "resolved" au lieu d'être perdu.
- **Vérification** : `npx tsc --noEmit` sans erreur. `npm run build` toujours inexécutable dans cet environnement (SWC natif linux/arm64 non chargeable — même limitation que les sessions précédentes). Vérification manuelle avec 3 exemples chiffrés (2 tirés du modèle Excel officiel + 1 cas `non_deductible`) confirmant que chaque valeur produite tombe bien dans l'enum/la contrainte réels.
- **Commit** : `c2ef2ba` sur `bug-fixes/2026-09-10`.

## Zones parcourues sans nouveau bug trouvé

Uniquement les fichiers non touchés par le WIP de Guillaume, donc explorables en profondeur :

- `app/api/cron/appel-loyers`, `cron/quittances-auto`, `cron/relances-auto` : cron système protégés par `CRON_SECRET`, itèrent volontairement sur tous les comptes (pas un bug).
- `app/api/demo/toggle`, `app/api/demo/reset` : filtres `user_id` corrects.
- `app/api/account/delete` : correctif `BUG-2026-08-24-03` (suppression profil avant FK) toujours en place.
- `app/api/scan/facture` : correctif `BUG-2026-08-23-01` (media_type) toujours en place.
- `app/api/historique/import-mapping` : déjà sur les bons noms de colonnes (`fiscal_deductible`), aucun mapping travaux dans ce fichier.
- `app/api/export/revenus`, `app/api/export/travaux` : un commentaire dans le code signale le même défaut que `BUG-2026-08-06-02` (requête `service` non filtrée par `user_id`), mais un `.filter()` en mémoire sur `propIds` est déjà appliqué avant renvoi au client — pas de fuite actuelle, juste une requête plus large que nécessaire côté base. À noter pour une passe d'optimisation future, pas un bug bloquant.

## Points ouverts non corrigés (inchangés depuis les sessions précédentes)

Les deux points suivants restent d'actualité et touchent des fichiers du WIP en cours de Guillaume, donc non modifiables cette session :

- **SCI à l'IS** : le simulateur de plus-value (`lib/fiscal/plus-value.ts`) applique le régime des particuliers, alors qu'une SCI à l'IS a des règles de plus-value professionnelle entièrement différentes. Décision produit à trancher par Guillaume avant tout correctif.
- **Page "Tableau fiscal"** (`app/(dashboard)/fiscal/page.tsx`) : les charges non déductibles sont comptées dans la base imposable des simulateurs — fichier actuellement modifié par le WIP en cours, correctif proposé en attente d'application par Guillaume (voir entrée BACKLOG dédiée).

## Environnement

- Même blocage `.git/index.lock` / `.git/HEAD.lock` / `.git/objects/*/tmp_obj_*` que toutes les sessions précédentes (restriction sur `unlink`), contourné par renommage du fichier juste avant chaque commande git — les commits aboutissent malgré les avertissements `unable to unlink`.
- `npm run build` reste inexécutable (échec de chargement du binaire SWC natif pour linux/arm64) ; vérification via `npx tsc --noEmit`.
- **Nouveau** : `git fetch origin` fonctionne désormais (après nettoyage de la référence cassée locale, voir plus haut). Le push reste bloqué : `git push -u origin bug-fixes/2026-09-10` échoue toujours avec `fatal: could not read Username for 'https://github.com': No such device or address` — aucun identifiant GitHub (token/SSH) disponible dans cet environnement.

## Branches locales non poussées (à prioriser)

La pile continue de s'allonger : `bug-fixes/2026-08-06`, `2026-08-07`, `2026-08-09`, `2026-08-12`, `2026-08-19`, `2026-08-20`, `2026-08-23`, `2026-08-24`, `2026-08-25`, `2026-08-29`, `2026-08-30`, et désormais `2026-09-10`. Toutes contiennent des correctifs de bugs bloquants (fuites cross-comptes, calculs fiscaux faux, imports cassés) en attente de relecture et de merge. Recommandation inchangée et de plus en plus pressante : Guillaume devrait pousser puis merger ces branches (ou au moins la plus récente, qui contient l'historique cumulé des précédentes) avant que l'écart avec `main`/`origin` ne devienne trop coûteux à relire.

## Résumé

- **1 bug bloquant corrigé** : import de travaux (historique + IA) intégralement cassé par des noms de colonnes et valeurs d'enum inexistants — BUG-2026-09-10-01.
- **Branche prête à relire/merger** : `bug-fixes/2026-09-10` (commit `c2ef2ba`), non poussée faute d'identifiants GitHub dans cet environnement — à pousser par Guillaume.
- **2 points bloquants toujours ouverts, nécessitant une décision de Guillaume** : SCI-IS (plus-value), filtre `fiscal_deductible` manquant sur le Tableau fiscal — tous deux documentés dans BACKLOG.md, non corrigés car les fichiers concernés font partie de son travail en cours non commité.
- **Aucun autre bug trouvé** dans les zones explorables en profondeur cette session.
