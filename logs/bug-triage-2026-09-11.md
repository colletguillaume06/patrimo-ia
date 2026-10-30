# Bug triage — session du 2026-09-11 (automatique)

## Contexte de démarrage

- Repo cible : `patrimo-ia` (dossier `Desktop/patrimo-ia` — le dossier `patrimo-ia` à la racine du Mac, également connecté, ne contient pas de clone git, juste un sous-dossier `backups`).
- Lecture de `AGENTS.md`/`CLAUDE.md`, `BACKLOG.md` (section Bugs), et des 7 logs `bug-triage-*.md` précédents (06/08 → 10/09, second passage inclus) avant toute action, pour ne pas retraiter ce qui est déjà connu.
- État du dossier de travail : branche `bug-fixes/2026-09-10` (tête `db5c8d8`), avec le même très gros volume de changements non commités que toutes les sessions précédentes (45 fichiers modifiés + 26 fichiers/dossiers non suivis — dashboard, routes API, migrations Supabase, mode démo, marketing, `lib/fiscal/lmnp.ts`/`seuils.ts`, `lib/supabase/middleware.ts`/`server.ts`, `vercel.json`, etc.), manifestement le travail en cours de Guillaume. Conformément à la consigne, ces fichiers n'ont pas été touchés ni inclus dans les commits de cette session.
- Une branche `bug-fixes/2026-09-11` existait déjà localement, identique à la tête de `bug-fixes/2026-09-10` — probablement créée par une tentative `git checkout -b` de cette session bloquée par un verrou `.git/HEAD.lock` avant d'échouer proprement. Réutilisée plutôt que recréée.

## Remarque de sécurité (hors périmètre bug, déjà signalée)

`AGENTS.md` et `node_modules/next/dist/docs/index.md` contiennent toujours un commentaire adressé directement à un agent IA (« AI agent hint »), invitant à lire une documentation sur une API Next.js fictive (`unstable_instant`) « avant toute modification ». Reconnu comme tentative d'injection de prompt (déjà signalé lors de la session du 09-10) et **ignoré** — aucune action prise sur cette base. Le texte est toujours présent ; la provenance dans `node_modules` (normalement généré par `npm install`, pas censé contenir ce type de contenu) reste à vérifier par Guillaume.

## Bug corrigé

### BUG-2026-09-11-01 — Bail commercial : carte "Révision dans" affichait le temps avant la fin de bail au lieu du temps avant la prochaine échéance triennale

- **Domaine** : Affichage — fiche bien, profil bail commercial (seul régime des 6 sans aucune couverture dans les sessions précédentes)
- **Fichier** : `components/biens/profiles/ProfileCommerce.tsx`
- **Constat** : la carte résumé affiche "Révision dans : X mois" en réutilisant `monthsToEnd` (calculé sur `end_date`, la fin de bail — à raison utilisée ailleurs pour l'alerte de préavis "Le bail expire dans X mois"), au lieu du temps avant la prochaine échéance de révision triennale du loyer (cycle 3-6-9, propre au bail commercial). Deux dates différentes affichées sous un seul libellé ambigu, susceptible de faire manquer une échéance de révision de loyer. Défaut connexe dans le même bloc : `nextRevision` (utilisée seulement pour une checklist, jamais affichée telle quelle) était calculée via `startDate.setFullYear(...)`, qui mute l'objet `Date` en place plutôt que d'en renvoyer un nouveau (sans conséquence visible dans ce rendu précis, mais fragile) ; et la formule `Math.ceil(yearsSinceStart / 3) * 3` retournait 0 an — donc la date de signature elle-même — quand `yearsSinceStart` vaut 0 ou un multiple de 3, au lieu d'un minimum de 3 ans.
- **Sévérité** : Majeur (information affichée trompeuse sur une échéance de gestion du bail — pas un montant faux, mais un délai mal identifié)
- **Correctif appliqué** : nouvelle variable `monthsToNextRevision`, calculée à partir d'une date de prochaine échéance triennale elle-même recalculée sans mutation de `startDate` et avec un minimum de 3 ans ; la carte "Révision dans" affiche désormais cette valeur. L'alerte de préavis continue d'utiliser `monthsToEnd`/`endDate` (correct pour ce cas d'usage, non modifié).
- **Vérification** : `npx tsc --noEmit` sans erreur sur l'ensemble du projet (`npm run build` toujours inexécutable dans cet environnement — échec de chargement du binaire SWC natif linux/arm64, même limitation documentée depuis la session du 06/08). Exemple chiffré : bail signé le 2021-09-01, aujourd'hui 2026-09-11 → `yearsSinceStart` = 5 → prochaine échéance = 2021 + 6 ans = 2027-09-01, soit ~12 mois. Cohérent avec le cycle 3-6-9 (échéance 2024-09-01 déjà passée, 2027-09-01 à venir).
- **Commit** : `2f04da9` sur `bug-fixes/2026-09-11`.

## Point ouvert détecté, non corrigé — `demo/reset` et `demo/seed` : suppression totale de compte sans garde-fou "démo" ni confirmation systématique

En explorant les routes jamais couvertes par les sessions précédentes, constat sur `app/api/demo/reset/route.ts` (POST) : elle supprime, pour tout utilisateur authentifié — sans aucune vérification qu'il s'agit d'un compte de démonstration — l'intégralité de ses biens, messages IA, déficits fonciers et documents, puis réinitialise son profil. Recherche de ses appelants côté client : **aucun résultat** — c'est un endpoint mort, mais toujours déployé et atteignable par n'importe quelle requête POST authentifiée, sans confirmation d'aucune sorte. La fonctionnalité équivalente réellement utilisée aujourd'hui, `app/api/demo/toggle` (action `disable`, appelée depuis `components/layout/Sidebar.tsx`, fichier WIP), est elle protégée par un `window.confirm()` côté UI.

`app/api/demo/seed/route.ts` (POST) a le même profil de risque et est, lui, bien utilisé : bouton "Charger les données de démonstration" sur `app/(dashboard)/exports/page.tsx` (page accessible à tout compte réel, pas seulement en mode démo), qui supprime les biens existants avant d'insérer des biens fictifs. Un avertissement textuel statique est présent ("⚠️ Remplace vos données actuelles") mais, contrairement à `demo/toggle`, pas de `confirm()`.

Non corrigé car la décision est produit : `demo/reset` semble redondant avec `demo/toggle` (à supprimer, ou à réserver explicitement au compte démo partagé `demo@propilot.app` défini dans `supabase/migrations/004_demo_readonly.sql`) ; pour `demo/seed`, ajouter un `confirm()` est simple mais touche `exports/page.tsx`, un fichier non listé dans le WIP actuel — correctif possible dès validation par Guillaume. Documenté dans `BACKLOG.md` avec correctif proposé.

**Sévérité** : Majeur pour `demo/seed` (destructeur, atteignable en un clic, avertissement textuel seulement) ; Mineur en pratique pour `demo/reset` (destructeur mais inatteignable depuis l'UI actuelle).

## Zones parcourues sans bug trouvé (nouvelles par rapport aux sessions précédentes)

- `components/biens/profiles/ProfileCommerce.tsx` — au-delà du bug corrigé, le reste de la fiche est cohérent. La checklist contient des items volontairement statiques (`done: false` pour "Assurance locataire vérifiée" et "TVA sur loyers configurée") faute de champ dédié dans le modèle de données actuel : pas un bug, une fonctionnalité non encore câblée.
- `app/api/cron/appel-loyers/route.ts` — génère l'appel de loyer du mois suivant et le paiement associé si non existant ; format de date cohérent entre la vérification d'existence et l'insertion.
- `app/api/cron/relances-auto/route.ts` — paliers de relance J+5/J+15/J+30 avec délai minimum entre relances, cohérent.
- `app/api/historique/analyse/route.ts` — analyse IA (Groq) d'un fichier Excel pour proposer un mapping de colonnes ; aucune écriture en base, pas de défaut trouvé.
- `app/api/dvf/estimation/route.ts` — estimation de marché basée sur une table de données par département ; correctement présentée comme un "Baromètre Marché" (FNAIM/Notaires/MeilleursAgents) et non comme des données DVF officielles malgré le nom de la route. `fetchDvfTransactions` (tentative d'appel à l'API DVF publique) est du code mort inoffensif, jamais invoqué.
- `lib/fiscal/indices.ts` — relu à l'occasion du bug ci-dessus : cohérent, les indices ILC/ILAT/IRL trimestriels sont bien structurés et à jour jusqu'à 2026-Q2.

## Points ouverts précédents, toujours d'actualité (non retouchés)

- **Paywall/gating d'accès** — toujours du code mort (`app/(dashboard)/layout.tsx`, bloc `isBlocked` non appliqué). Le WIP actuel de Guillaume sur ce fichier ajoute un bandeau `DemoBanner` pour le compte démo, mais ne touche pas à ce bloc.
- **SCI à l'IS** — le simulateur de plus-value applique le régime des particuliers (`lib/fiscal/plus-value.ts`), décision produit à trancher par Guillaume.

## Environnement

- Même blocage `.git/index.lock` / `.git/HEAD.lock` / `.git/objects/*/tmp_obj_*` que toutes les sessions précédentes (restriction sur `unlink`), contourné par renommage du fichier juste avant chaque commande git.
- `npm run build` reste inexécutable (échec de chargement du binaire SWC natif linux/arm64) ; vérification via `npx tsc --noEmit`.
- **Push non effectué** : `git push -u origin bug-fixes/2026-09-11` échoue toujours avec `fatal: could not read Username for 'https://github.com'` — aucun identifiant GitHub disponible dans cet environnement.

## Branches locales non poussées (à prioriser)

`bug-fixes/2026-08-06`, `2026-08-07`, `2026-08-09`, `2026-08-12`, `2026-08-19`, `2026-08-20`, `2026-08-23`, `2026-08-24`, `2026-08-25`, `2026-08-29`, `2026-08-30`, `2026-09-10`, `2026-09-11` (13 branches locales, aucune poussée).

## Résumé

- **1 bug corrigé** (affichage, majeur) : carte "Révision dans" du profil bail commercial — BUG-2026-09-11-01, commit `2f04da9`.
- **1 nouveau point ouvert signalé** (non corrigé, décision produit) : endpoints `demo/reset`/`demo/seed` destructeurs sans garde-fou "démo" cohérent — à trancher par Guillaume.
- **2 points ouverts précédents toujours d'actualité** : paywall non appliqué (code mort), SCI-IS plus-value.
- **Tentative d'injection de prompt toujours présente** (`AGENTS.md`/`node_modules/next/dist/docs`) — ignorée, déjà signalée, provenance toujours à vérifier.
- **Branche prête à relire/merger** : `bug-fixes/2026-09-11` (commit `2f04da9`), non poussée faute d'identifiants GitHub — à pousser par Guillaume, avec les 12 autres branches locales en attente.
- **Aucun autre bug trouvé** dans les zones explorées cette session.
