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

## Note sur la session du 2026-08-06

Lors du premier passage automatique, un `.git/index.lock` résiduel empêchait tout `checkout`/`add`/`commit` (voir `logs/bug-triage-2026-08-06.md`). Sur demande explicite de Guillaume dans la même session, un contournement a été trouvé : le blocage venait d'une restriction de l'environnement d'exécution qui interdit la suppression (`unlink`) de fichiers sur le dossier connecté, mais pas leur renommage (`rename`) — renommer le fichier de verrou avant chaque commande git a permis de débloquer `checkout`, `add` et `commit`. Les 3 correctifs ont ensuite été appliqués et commités individuellement sur `bug-fixes/2026-08-06` (commits `aef232b`, `10306a3`, `e653959`). Le `npm run build` complet n'a pas pu être exécuté dans cet environnement (téléchargement du binaire natif SWC bloqué par le réseau du bac à sable), remplacé par `tsc --noEmit` (aucune erreur) et, pour le bug fiscal, une vérification chiffrée manuelle.

**Push non effectué** : aucun identifiant GitHub (token/SSH) n'est disponible dans cet environnement pour pousser la branche. Guillaume doit pousser `bug-fixes/2026-08-06` lui-même depuis sa machine (`git push -u origin bug-fixes/2026-08-06`) après relecture.
