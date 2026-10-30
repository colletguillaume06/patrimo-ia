# Compte de démonstration public & assets marketing

Accès à l'application sans identifiants depuis le site vitrine, sur un
portefeuille fictif, pour la campagne d'acquisition.

---

## 1. Fonctionnement

Le bouton « Voir la démo » du site vitrine pointe sur `/api/demo`. La route
génère un magic-link à usage unique via l'API admin Supabase et le consomme
immédiatement côté serveur pour ouvrir la session. **Aucun mot de passe n'est
stocké ni exposé au navigateur.**

Le compte est `demo@propilot.app` (`user_id` : `dded7296-0ff6-4afb-9935-4bd6c8babac9`).

| Fichier | Rôle |
| --- | --- |
| `app/api/demo/route.ts` | Point d'entrée public, ouverture de session |
| `scripts/setup-demo-account.mjs` | Création du compte + jeu de données fictif |
| `components/demo/DemoBanner.tsx` | Bandeau « Mode démonstration » |
| `app/(dashboard)/layout.tsx` | Affiche le bandeau si l'email est celui de la démo |
| `app/(marketing)/page.tsx` | CTA « Voir la démo » (hero + header) |
| `supabase/migrations/004_demo_readonly.sql` | Verrouillage lecture seule + correctif dépenses annexes |

### Jeu de données

6 biens couvrant les 5 régimes (LMNP, foncier nu, SCI à l'IS, Airbnb, commerce),
5 baux, 70 échéances de loyer, amortissements, réservations, associés SCI,
travaux, devis, contacts, documents, déclarations fiscales, déficits fonciers,
transactions bancaires et historique Copilot.

Régénérer / remettre à neuf (idempotent) :

```bash
node scripts/setup-demo-account.mjs
```

---

## 2. ⚠️ Deux actions manuelles requises

### a. Migration SQL — non appliquée à ce jour

À exécuter dans Supabase → SQL Editor : `supabase/migrations/004_demo_readonly.sql`

Elle fait deux choses :

1. **Corrige un bug de production.** L'application enregistre les dépenses
   annexes de gestion dans `incidents` avec `property_id = NULL` et des
   catégories propres (`frais_gestion`, `materiel_informatique`…). Or la table
   impose `NOT NULL` sur `property_id` et une contrainte `CHECK` qui n'autorise
   que les 5 catégories de travaux. **Toute saisie de dépense annexe échoue
   actuellement**, quel que soit le régime.
2. **Verrouille le compte démo en lecture seule** via des triggers sur 21
   tables. C'est la seule garantie fiable, indépendante de l'interface.

Tant qu'elle n'est pas passée : les dépenses annexes restent cassées, et les
visiteurs peuvent modifier les données de la démo.

### b. Protection de déploiement Vercel

La Deployment Protection est active **au niveau de l'équipe** `conciergeo-app` :
toute URL du projet redirige vers `vercel.com/sso-api`. Le lien démo est donc
inaccessible au public, y compris depuis le site vitrine.

À désactiver dans Vercel → projet → Settings → Deployment Protection.
Aucun redéploiement nécessaire ensuite.

Aucun domaine personnalisé n'est rattaché au projet : une URL `*.vercel.app`
convertit mal en campagne et peut déclencher les filtres anti-spam.

---

## 3. Assets marketing

| Dossier | Contenu |
| --- | --- |
| `marketing/captures/` | 20 captures PNG 1440×2200 des écrans clés |
| `marketing/showcase/` | Les mêmes pages en HTML autonome (hors ligne, sans backend) |

Ces fichiers sont destinés à être fournis à un outil de design ou de montage.

### Régénérer après une évolution du produit

Les pages de l'app chargent une grande partie de leurs données **côté client**.
Un simple `curl` de la route renvoie donc une coquille vide : il faut lire le
DOM **après hydratation**, d'où ce pipeline en quatre temps.

```bash
# 0. Servir l'app en production
npm run build && npx next start -p 3022

# 1. Lancer le collecteur (écoute sur 3055)
node scripts/demo-capture/1-collector.mjs

# 2. Dans un navigateur : ouvrir http://localhost:3022/api/demo
#    puis coller scripts/demo-capture/3-capture-snippet.js dans la console.
#    Suivre l'avancement : window.__capture.done

# 3. Rendre les pages autonomes
node scripts/demo-capture/2-finalize.mjs

# 4. Générer les PNG
bash scripts/demo-capture/4-screenshots.sh
```

**Pièges rencontrés, à ne pas réintroduire :**

- Retirer le JavaScript *avant* hydratation vide toutes les pages client
  (amortissement, travaux, loyers, baux…) — elles n'affichent qu'un spinner.
- `timeout` n'existe pas sur macOS : l'ajouter fait échouer la boucle de
  capture en silence.
- Chrome headless ne capture que des URL `file://` ici, et refuse les chemins
  sous `/private/tmp`.

---

## 4. Réserve sur les chiffres affichés

Le dashboard de la démo montre actuellement un **cashflow mensuel de −8 392 €**
en rouge, des **loyers encaissés à 0 €** et deux alertes de retard — les
mensualités d'emprunt du jeu fictif totalisent 6 400 €/mois et les échéances du
mois courant sont en statut `pending`.

C'est le premier écran que verra un prospect. Rééquilibrer le jeu de données
avant de lancer la campagne (baisser les emprunts, marquer le mois courant comme
encaissé, ne conserver qu'un retard léger).

Par ailleurs, le patrimoine affiche 1,3 M€ et non 1,94 M€ : le dashboard
recalcule une estimation basse par grille de prix au m² au lieu d'utiliser les
valeurs `valeur_actuelle` saisies sur chaque bien.

Enfin, tous les montants des visuels marketing proviennent de ce portefeuille
**fictif**. Les présenter comme des résultats clients serait trompeur : ajouter
une mention « exemple illustratif » sur les supports publiés.
