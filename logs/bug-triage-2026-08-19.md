# Bug triage — 2026-08-19 (session automatique)

## État du dépôt au démarrage

- Dossier connecté : `Desktop--patrimo-ia`, seul dossier des deux montés à être un dépôt git (`patrimo-ia` à la racine n'est pas un repo git).
- Sur branche `bug-fixes/2026-08-12`, avec **71 fichiers modifiés/ajoutés non commités** — travail en cours manifeste de Guillaume (dashboard, routes API, migrations Supabase, mode démo…). Non touchés, conformément à la consigne.
- Branches locales `bug-fixes/2026-08-07`, `2026-08-09`, `2026-08-12` : toutes identiques, pointent sur `a073e19`. Aucune poussée sur `origin` (seul `main` y existe).
- `BACKLOG.md` documentait 3 bugs du 06/08 (corrigés, non mergés) mais pas le bug du 07/08 (`a073e19`, committé mais jamais consigné) — entrée ajoutée rétroactivement cette session.
- Nouvelle branche créée : `bug-fixes/2026-08-19`, à partir de `a073e19`, sans perturber les changements non commités présents dans l'arbre de travail.

## Exploration

Zones parcourues : moteurs de calcul fiscal (`lib/fiscal/lmnp.ts`, `sci.ts`, `foncier.ts`, `plus-value.ts`, `seuils.ts`, `indices.ts`), tunnel de paiement (`app/api/stripe/checkout`, `app/api/stripe/webhook`), authentification (`lib/supabase/middleware.ts` — non modifiable, dans les fichiers non commités). Le simulateur de plus-value immobilière (`lib/fiscal/plus-value.ts`) contenait deux bugs bloquants, vérifiés par calcul chiffré et par recherche des textes officiels en vigueur.

`lib/fiscal/lmnp.ts` fait partie des fichiers non commités (modification en cours, probablement liée à la hausse de CSG LFSS 2026) — non exploré en détail au-delà de sa version déjà committée, pour ne pas empiéter sur ce travail.

## Bugs corrigés

### BUG-2026-08-19-01 — Barème d'abattement PS (plus-value) : exonération à tort dès 22 ans au lieu de 30 ans
- **Fichier** : `lib/fiscal/plus-value.ts`, fonction `abattementPS`
- **Cause** : bornes d'années fausses (11/12 au lieu de 21/22) dans le découpage des tranches du barème officiel (1,65%/an de la 6ᵉ à la 21ᵉ année, +1,60% à la 22ᵉ, +9%/an de la 23ᵉ à la 30ᵉ). Le calcul dépassait 100% dès 22 ans, provoquant une exonération totale des prélèvements sociaux 8 ans trop tôt.
- **Vérifié auprès de** : La Finance Pour Tous, Cardif (barème officiel confirmé par recherche web, cf. sources).
- **Correction** : bornes remises à 21/22 ; table d'affichage `PALIERS_ABATTEMENT` corrigée aux paliers 20 ans (24,75% au lieu de 27%) et 22 ans (28% au lieu de 41,8%).
- **Vérification chiffrée** : bien détenu 25 ans, PV brute 158 750€. Avant : PS exonéré à tort (0€ dû). Après : abattement PS réel 55% → PS dû 12 287€.

### BUG-2026-08-19-02 — Amortissements LMNP non réintégrés au prix d'acquisition (réforme LF 2025, en vigueur depuis 18 mois)
- **Fichier** : `lib/fiscal/plus-value.ts`, fonction `calculatePlusValue`
- **Cause** : le code calculait `reprise_amortissements` mais ne l'appliquait jamais à `prix_revient`/`pv_brute`, et affichait une note affirmant l'ancienne règle (« les amortissements n'augmentent pas la PV imposable »). Or depuis le 15/02/2025 (art. 84 LF 2025, art. 150 VB III CGI), le prix d'acquisition doit être diminué des amortissements déduits, y compris ceux antérieurs à 2025.
- **Vérifié auprès de** : LégiFiscal (article dédié confirmant la portée rétroactive via réponse ministérielle du 24/03/2026, cf. sources).
- **Correction** : `prix_revient` diminué de `reprise_amortissements` ; note utilisateur mise à jour.
- **Vérification chiffrée** : achat 150 000€ + frais 11 250€, amortissements pris 40 000€, vente 280 000€ après 16 ans. Avant : impôt total 24 389€. Après : 32 600€ (+8 211€).

Les deux correctifs sont dans le même commit `de402bc` (même fichier, même bug source touché à deux endroits) sur la branche `bug-fixes/2026-08-19`.

Vérification : `npx tsc --noEmit` sans erreur. `npm run build` inexécutable dans cet environnement (réseau du bac à sable bloque le téléchargement du binaire SWC — même limitation que le 06/08).

## Bug signalé, non corrigé

**SCI à l'IS — le simulateur de plus-value applique le régime des particuliers** : `calculatePlusValue` utilise le même barème d'abattement pour durée de détention et les mêmes taux (IR 19%/PS 17,2%) pour `type_bien: 'sci'`, sans distinguer SCI-IR (régime particulier, correct) de SCI-IS (régime professionnel — PV = prix de cession − valeur nette comptable, imposée à l'IS, sans abattement durée de détention). Correction non appliquée : implique une décision produit sur le périmètre du simulateur. Détail dans `BACKLOG.md`.

## Rappel — bugs déjà corrigés en attente de merge (sessions précédentes)

- `bug-fixes/2026-08-06` : 3 correctifs (SCI-IR sans PS, fuite cross-comptes rapprochement bancaire, envoi quittance sans vérif paiement) — commits `aef232b`, `10306a3`, `e653959`.
- Suite (même lignée) : LMNP/foncier sans PS — commit `a073e19` (BUG-2026-08-07-01, backlog mis à jour rétroactivement cette session).
- **Aucune de ces branches n'a été poussée sur GitHub** — seule `main` existe sur `origin`. Guillaume doit les pousser et/ou les merger.

## Environnement

- Blocage `.git/index.lock` résiduel identique au 06/08, contourné par renommage du fichier avant chaque commande git (l'environnement interdit `unlink` mais pas `rename`).
- Aucun identifiant GitHub disponible → **push non effectué**. Guillaume doit exécuter `git push -u origin bug-fixes/2026-08-19` lui-même après relecture (et pousser/merger les branches précédentes s'il valide leur contenu).

## Synchronisation Notion

Outil Notion non disponible dans cet environnement — non synchronisé. (Les tools `mcp__41166458-...__notion-*` visibles dans l'environnement sont ceux d'un autre compte/connecteur Notion générique, sans confirmation d'accès à la page « Patrimo IA » ; aucune tentative de fetch n'a été faite pour éviter d'écrire sur la mauvaise page. À vérifier avec Guillaume si une synchronisation Notion est souhaitée.)

## Résumé

- **2 bugs bloquants corrigés** (plus-value LMNP/PS), 1 fichier touché, 1 commit, sur la branche **`bug-fixes/2026-08-19`** — prête à être relue et poussée par Guillaume.
- **1 bug signalé non corrigé** (SCI-IS, décision produit nécessaire).
- **Point bloquant pour Guillaume** : plusieurs branches de correctifs fiscaux (06/08, 07/08, 19/08 aujourd'hui) sont prêtes mais aucune n'est encore sur GitHub ni mergée sur `main` — à pousser/merger dès que possible, ces bugs affectent des montants fiscaux affichés en production.

Sources consultées pour vérification légale :
- [Plus-values immobilières : les abattements — La Finance Pour Tous](https://www.lafinancepourtous.com/pratique/impots/fiscalite-de-l-immobilier/plus-values-immobilieres-les-abattements/)
- [Décryptage du tableau d'abattement — Cardif](https://www.cardif.fr/assurance-emprunteur/tableau-abattement-plus-value-immobiliere)
- [Plus-value immobilière et LMNP : amortissements antérieurs à 2025 également à réintégrer — LégiFiscal](https://www.legifiscal.fr/actualites-fiscales/4461--value-immobiliere-lmnp-amortissements-anterieurs-2025-egalement-reintegrer.html)
