# Backlog

## Bugs

### BUG-2026-08-06-01 — SCI à l'IR : impôt estimé sous-évalué (prélèvements sociaux non comptés)
- **Domaine** : Calcul fiscal — régime SCI à l'IR
- **Fichier** : `lib/fiscal/sci.ts`, fonction `calculateSciSimulation`, branche `regime === 'ir'` (lignes ~24-29)
- **Description** : Pour une SCI à l'IR, `is_du` est calculé comme `resultat_comptable * taux_marginal` — seule la part IR est comptée. Or les revenus fonciers transparents d'une SCI à l'IR sont aussi soumis aux prélèvements sociaux (17,2%), comme le régime foncier nu (`lib/fiscal/foncier.ts` les applique implicitement via le même taux_marginal... à vérifier, mais en tout cas `sci.ts` ne les compte pas du tout). Résultat affiché à l'écran (`ProfileSCI.tsx`, label "Impôt estimé") sous-évalué d'environ 17,2% du résultat imposable. Autre défaut lié : pas de plancher à 0 si `resultat_comptable` est négatif (contrairement à `lmnp.ts` et `foncier.ts` qui font `Math.max(0, ...)` avant d'appliquer le taux), ce qui peut produire un "impôt estimé" négatif affiché à l'utilisateur.
- **Exemple chiffré** : résultat comptable 50 000€, TMI 30% → actuellement affiché 15 000€ d'impôt estimé. Réel : IR 15 000€ + PS (17,2% × 50 000€) 8 600€ = **23 600€**. Écart de 8 600€/an sous-évalué.
- **Sévérité** : Bloquant (montant fiscal affiché faux)
- **Correctif proposé** (non appliqué — voir blocage ci-dessous) :
  ```ts
  // IR : transparence fiscale, imposition sur quote-part (IR + prélèvements sociaux 17,2%)
  const base_imposable = Math.max(0, resultat_comptable)
  const ir_du = base_imposable * taux_marginal
  const ps_du = base_imposable * 0.172
  const is_du = ir_du + ps_du
  return {
    resultat_comptable,
    is_du,
    dividendes_disponibles: Math.max(0, resultat_comptable - is_du),
    regime,
  }
  ```
- **Statut** : corrigé — commit `aef232b` sur branche `bug-fixes/2026-08-06`, en attente de relecture/merge par Guillaume
- **Source** : détecté en lisant le code (session bug-triage automatique)

### BUG-2026-08-06-02 — Rapprochement bancaire : requête paiements non filtrée par utilisateur
- **Domaine** : Import / rapprochement bancaire (Nordigen)
- **Fichier** : `app/api/banking/sync/route.ts`, lignes 33-51
- **Description** : La route récupère `propIds` (les biens de l'utilisateur courant) mais ne les utilise jamais pour filtrer la requête sur `payments`. La requête `service.from('payments').select(...).in('status', [...]).gte('due_date', dateFrom)` porte donc sur **tous les paiements de tous les utilisateurs**, pas seulement ceux de l'utilisateur connecté. Comme la route utilise le client de service (bypass RLS), un rapprochement bancaire peut matcher — et marquer comme "payé" — le loyer d'un autre utilisateur si le nom/montant/date correspondent (via `matchTransaction`, score ≥ 70). Fuite de données (noms de locataires d'autres comptes exposés dans `loyers`) + risque de statut de paiement erroné écrit en base pour un autre compte.
- **Sévérité** : Bloquant (sécurité + intégrité des données financières, cross-tenant)
- **Correctif proposé** (non appliqué — voir blocage ci-dessous) :
  ```ts
  const { data: payments } = await (service as any)
    .from('payments')
    .select('id, amount, due_date, lease:leases(tenant_name, property_id)')
    .in('status', ['pending', 'late'])
    .gte('due_date', dateFrom)

  const loyers: LouerAttendu[] = (payments ?? [])
    .filter((p: any) => propIds.includes(p.lease?.property_id))
    .map((p: any) => ({
      id: p.id,
      amount: p.amount,
      due_date: p.due_date,
      tenant_name: p.lease?.tenant_name ?? '',
      lease_id: p.id,
    }))
  ```
- **Statut** : corrigé — commit `10306a3` sur branche `bug-fixes/2026-08-06`, en attente de relecture/merge par Guillaume
- **Source** : détecté en lisant le code (session bug-triage automatique)

### BUG-2026-08-06-03 — Envoi manuel de quittance sans vérifier que le loyer est payé
- **Domaine** : Paiement / emailing (quittances)
- **Fichier** : `app/api/quittances/send/route.ts`
- **Description** : Cette route envoie un email affirmant "Nous vous confirmons la réception du règlement de votre loyer" sans jamais vérifier `payment.status === 'paid'`. Le cron équivalent (`app/api/cron/quittances-auto/route.ts`) filtre bien `.eq('status', 'paid')` avant d'envoyer — cette route manuelle n'a pas le même garde-fou. Aucun appel front-end trouvé actuellement (`grep quittances/send` ne remonte rien dans `app/`, `components/`), donc pas encore exploitable via l'UI, mais l'API reste appelable directement et enverrait une quittance juridiquement trompeuse pour un loyer impayé.
- **Sévérité** : Majeur (pas encore branché à l'UI, mais document à valeur légale envoyé sans contrôle si l'API est appelée)
- **Correctif proposé** (non appliqué — voir blocage ci-dessous) : ajouter après la récupération de `payment` :
  ```ts
  if (payment.status !== 'paid') {
    return NextResponse.json({ error: 'Ce paiement n\'est pas marqué comme payé' }, { status: 400 })
  }
  ```
- **Statut** : corrigé — commit `e653959` sur branche `bug-fixes/2026-08-06`, en attente de relecture/merge par Guillaume
- **Source** : détecté en lisant le code (session bug-triage automatique)

### BUG-2026-08-07-01 — LMNP et foncier (nu) : impôt estimé omettait les prélèvements sociaux
- **Domaine** : Calcul fiscal — régimes LMNP et foncier (location nue)
- **Fichiers** : `lib/fiscal/lmnp.ts`, `lib/fiscal/foncier.ts`
- **Description** : `impot_estime` (LMNP) et `reel_impot`/`micro_impot` (foncier) étaient calculés en appliquant uniquement `taux_marginal` (IR), sans les prélèvements sociaux (17,2% à l'époque). Montant affiché sous-évalué.
- **Sévérité** : Bloquant (montant fiscal affiché faux)
- **Statut** : corrigé — commit `a073e19` sur branche `bug-fixes/2026-08-07` (identique à `bug-fixes/2026-08-09`), toujours en attente de relecture/merge par Guillaume. Cette entrée avait été omise du backlog lors de la session du 07/08 ; ajoutée rétroactivement le 19/08.
- **Source** : détecté en lisant le code (session bug-triage automatique du 2026-08-07)
- **Note** : `lib/fiscal/lmnp.ts` fait l'objet, au 19/08, de modifications non commitées (probablement en cours par Guillaume) qui semblent porter le taux de prélèvements sociaux LMNP à 18,6% suite à la LFSS 2026 (hausse CSG 9,2%→10,6%). Non touché par cette session — à relire par Guillaume avant merge.

### BUG-2026-08-19-01 — Plus-value immobilière : barème d'abattement PS avec bornes d'années fausses (exonération à 22 ans au lieu de 30)
- **Domaine** : Calcul fiscal — simulateur de plus-value (`nu`, `lmnp`, `sci`, `airbnb`, `commerce`)
- **Fichier** : `lib/fiscal/plus-value.ts`, fonction `abattementPS` (lignes ~43-49) et table `PALIERS_ABATTEMENT`
- **Description** : Le barème officiel de l'abattement pour durée de détention sur les prélèvements sociaux (PV immobilières) est : 1,65%/an de la 6ᵉ à la 21ᵉ année, +1,60% la 22ᵉ année, puis +9%/an de la 23ᵉ à la 30ᵉ année (exonération totale à 30 ans). Le code utilisait les bornes 11/12 au lieu de 21/22 pour découper les tranches, ce qui faisait grimper l'abattement à 101,5% (clampé à 100%, donc exonération totale) dès 22 ans de détention au lieu de 30. Entre 22 et 29 ans de détention, l'app affichait "Exonéré PS" alors que l'utilisateur doit encore 28% à 91% de la base sur les prélèvements sociaux (17,2%). La table d'affichage `PALIERS_ABATTEMENT` avait aussi des valeurs fausses aux paliers 20 ans (27% au lieu de 24,75%) et 22 ans (41,8% au lieu de 28%).
- **Exemple chiffré vérifié** : bien détenu 25 ans, PV brute 158 750€. Abattement PS réel à 25 ans = 55% → base imposable PS 71 437,50€ → PS dû 12 287€. Avant correctif : abattement PS calculé à 100% → PS dû affiché 0€. Écart de 12 287€ sous-évalué pour ce cas.
- **Sévérité** : Bloquant (montant fiscal affiché faux, exonération à tort)
- **Correctif appliqué** : correction des bornes de `abattementPS` (21/22 au lieu de 11/12, calcul à partir de la 22ᵉ année pour la tranche à 9%/an) + correction des valeurs 20 ans et 22 ans dans `PALIERS_ABATTEMENT`. Vérifié via `npx tsc --noEmit` (aucune erreur) et un calcul chiffré manuel (voir ci-dessus). `npm run build` non exécutable dans cet environnement (téléchargement du binaire SWC bloqué par le réseau du bac à sable).
- **Statut** : corrigé — commit `de402bc` sur branche `bug-fixes/2026-08-19`, en attente de relecture/merge par Guillaume (push non effectué, voir note de session)
- **Source** : détecté en lisant le code (session bug-triage automatique)

### BUG-2026-08-19-02 — Plus-value LMNP : amortissements non réintégrés au prix d'acquisition (réforme LF 2025)
- **Domaine** : Calcul fiscal — simulateur de plus-value, régime LMNP
- **Fichier** : `lib/fiscal/plus-value.ts`, fonction `calculatePlusValue`
- **Description** : Depuis le 15/02/2025 (art. 84 LF 2025, nouvel art. 150 VB III du CGI), le prix d'acquisition retenu pour le calcul de la plus-value immobilière en LMNP non professionnel doit être diminué du montant des amortissements déduits — y compris les amortissements pratiqués avant 2025 (confirmé par réponse ministérielle du 24/03/2026). Le code faisait l'inverse : il calculait `reprise_amortissements` mais ne l'utilisait jamais dans `prix_revient`/`pv_brute`, et la note affichée à l'utilisateur affirmait explicitement que « les amortissements n'augmentent pas la PV imposable » — l'ancienne règle, abrogée depuis 18 mois. Toute simulation de vente d'un bien LMNP avec amortissements pratiqués sous-évaluait la plus-value imposable et donc l'impôt dû.
- **Exemple chiffré vérifié** : prix d'achat 150 000€ + frais 11 250€, amortissements pris 40 000€, vente 280 000€ après 16 ans. Avant correctif : prix de revient 161 250€ → PV brute 118 750€ → impôt total 24 389€. Après correctif : prix de revient 121 250€ → PV brute 158 750€ → impôt total 32 600€. Écart de 8 211€ sous-évalué pour ce cas.
- **Sévérité** : Bloquant (montant fiscal affiché faux, règle abrogée depuis 15/02/2025)
- **Correctif appliqué** : `prix_revient` diminué de `reprise_amortissements` avant calcul de `pv_brute` ; note utilisateur mise à jour pour refléter la règle en vigueur. Vérifié via `npx tsc --noEmit` (aucune erreur) et le calcul chiffré ci-dessus.
- **Statut** : corrigé — commit `de402bc` sur branche `bug-fixes/2026-08-19`, en attente de relecture/merge par Guillaume (push non effectué, voir note de session)
- **Source** : détecté en lisant le code (session bug-triage automatique)

### Point ouvert (non corrigé) — SCI à l'IS : le simulateur de plus-value applique le régime des particuliers
- **Domaine** : Calcul fiscal — simulateur de plus-value, régime SCI à l'IS
- **Fichier** : `lib/fiscal/plus-value.ts`
- **Description** : `calculatePlusValue` applique le même barème d'abattement pour durée de détention et les mêmes taux (IR 19% / PS 17,2%) à `type_bien: 'sci'`, quel que soit le régime (IR ou IS) choisi dans `sci.ts`. Or une SCI à l'IS calcule sa plus-value sur cession d'immeuble selon les règles des plus-values professionnelles (différence entre prix de cession et valeur nette comptable après amortissements, imposée à l'IS), sans abattement pour durée de détention — un régime entièrement différent de celui des particuliers. Le simulateur ne distingue pas SCI-IR (pour laquelle le régime des particuliers s'applique bien) de SCI-IS.
- **Sévérité** : à qualifier — impact potentiellement important pour les utilisateurs en SCI à l'IS, mais la correction implique une décision produit (faut-il un mode de calcul séparé pour SCI-IS ? le simulateur est-il censé s'appliquer uniquement aux biens détenus en direct/SCI-IR ?) plutôt qu'un simple correctif.
- **Correctif proposé** : non appliqué — nécessite validation de Guillaume sur le comportement attendu pour SCI-IS avant toute modification.
- **Statut** : ouvert, signalé
- **Source** : détecté en lisant le code (session bug-triage automatique du 2026-08-19)

## Note sur la session du 2026-08-06

Lors du premier passage automatique, un `.git/index.lock` résiduel empêchait tout `checkout`/`add`/`commit` (voir `logs/bug-triage-2026-08-06.md`). Sur demande explicite de Guillaume dans la même session, un contournement a été trouvé : le blocage venait d'une restriction de l'environnement d'exécution qui interdit la suppression (`unlink`) de fichiers sur le dossier connecté, mais pas leur renommage (`rename`) — renommer le fichier de verrou avant chaque commande git a permis de débloquer `checkout`, `add` et `commit`. Les 3 correctifs ont ensuite été appliqués et commités individuellement sur `bug-fixes/2026-08-06` (commits `aef232b`, `10306a3`, `e653959`). Le `npm run build` complet n'a pas pu être exécuté dans cet environnement (téléchargement du binaire natif SWC bloqué par le réseau du bac à sable), remplacé par `tsc --noEmit` (aucune erreur) et, pour le bug fiscal, une vérification chiffrée manuelle.

**Push non effectué** : aucun identifiant GitHub (token/SSH) n'est disponible dans cet environnement pour pousser la branche. Guillaume doit pousser `bug-fixes/2026-08-06` lui-même depuis sa machine (`git push -u origin bug-fixes/2026-08-06`) après relecture.

## Note sur la session du 2026-08-19

- Le dossier de travail était sur la branche `bug-fixes/2026-08-12` avec un **très gros volume de changements non commités** (71 fichiers modifiés/ajoutés — pages du dashboard, routes API, nouvelles migrations Supabase, mode démo, etc.), manifestement le travail en cours de Guillaume. Conformément à la consigne, ces fichiers n'ont pas été touchés ni inclus dans les commits de cette session. Une nouvelle branche `bug-fixes/2026-08-19` a été créée à partir du même commit (`a073e19`) pour ne pas perturber ce travail.
- Les branches locales `bug-fixes/2026-08-07`, `bug-fixes/2026-08-09` et `bug-fixes/2026-08-12` pointent toutes sur le même commit `a073e19` — aucun nouveau correctif n'y a été ajouté depuis le 07/08. **Aucune de ces branches n'a encore été poussée sur GitHub** (seule `main` existe côté `origin`) : `bug-fixes/2026-08-06` (3 correctifs) et le correctif du 07/08 (1 correctif, inclus dans la même lignée) attendent toujours d'être poussés et mergés par Guillaume, en plus des 2 correctifs de ce jour.
- Même blocage `.git/index.lock` que le 06/08 (restriction d'environnement sur `unlink`, contournée par renommage du fichier de verrou avant chaque commande git). `npm run build` reste inexécutable dans cet environnement (résolution DNS bloquée pour télécharger le binaire SWC) ; vérification faite via `npx tsc --noEmit` (aucune erreur) et un calcul chiffré manuel pour chaque correctif fiscal.
- **Push non effectué** : mêmes raisons que le 06/08. Guillaume doit pousser lui-même : `git push -u origin bug-fixes/2026-08-19` (et, s'il le souhaite, les branches `bug-fixes/2026-08-06`/`2026-08-07` restées locales, ou les merger directement).
