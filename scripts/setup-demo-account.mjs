// Crée (ou réinitialise) le compte démo public utilisé par la campagne marketing.
//
//   node scripts/setup-demo-account.mjs
//
// Le compte est accessible sans identifiants via /api/demo (magic-link admin).
// Aucun mot de passe n'est stocké : la route génère un lien à la volée.
// Les données sont 100% fictives.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_EMAIL = 'demo@propilot.app'

if (!URL || !KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants')

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// PostgREST refuse un insert groupé dont les objets n'ont pas les mêmes clés :
// on complète chaque ligne avec les clés manquantes à null.
function align(body) {
  if (!Array.isArray(body) || body.length < 2) return body
  const keys = [...new Set(body.flatMap(Object.keys))]
  return body.map(o => Object.fromEntries(keys.map(k => [k, o[k] ?? null])))
}

async function rest(table, { method = 'GET', body, q = '' } = {}) {
  const r = await fetch(`${URL}/rest/v1/${table}${q}`, {
    method,
    headers: { ...H, Prefer: 'return=representation' },
    body: body ? JSON.stringify(align(body)) : undefined,
  })
  if (!r.ok) throw new Error(`${method} ${table} -> ${r.status}: ${await r.text()}`)
  return r.status === 204 ? null : r.json()
}

async function admin(path, { method = 'GET', body } = {}) {
  const r = await fetch(`${URL}/auth/v1/${path}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${await r.text()}`)
  return r.json()
}

// ── 1. Utilisateur démo ────────────────────────────────────────────────────────
const list = await admin(`admin/users?filter=${encodeURIComponent(DEMO_EMAIL)}`)
let user = (list.users ?? []).find(u => u.email === DEMO_EMAIL)

if (!user) {
  // Mot de passe aléatoire jamais conservé : la connexion se fait par magic-link.
  const throwaway = [...crypto.getRandomValues(new Uint8Array(24))]
    .map(b => b.toString(16).padStart(2, '0')).join('')
  user = await admin('admin/users', {
    method: 'POST',
    body: { email: DEMO_EMAIL, password: throwaway, email_confirm: true },
  })
  console.log('✅ Utilisateur démo créé')
} else {
  console.log('ℹ️  Utilisateur démo existant, réinitialisation des données')
}

const USER = user.id

// ── 2. Purge des données existantes ───────────────────────────────────────────
// Les tables référençant `properties` doivent être purgées en premier.
for (const t of ['deficits_fonciers', 'documents', 'ai_messages', 'tenants',
                 'declarations_fiscales', 'modeles_baux', 'banking_transactions',
                 'banking_connections']) {
  await rest(t, { method: 'DELETE', q: `?user_id=eq.${USER}` }).catch(() => {})
}

const old = await rest('properties', { q: `?user_id=eq.${USER}&select=id` })
if (old.length) {
  await rest('properties', { method: 'DELETE', q: `?user_id=eq.${USER}` })
  console.log(`🧹 ${old.length} biens précédents supprimés`)
}

await rest('profiles', {
  method: 'PATCH',
  q: `?id=eq.${USER}`,
  body: {
    full_name: 'Compte de démonstration', plan: 'pro',
    onboarding_done: true, demo_mode: true,
    subscription_status: 'active', trial_ends_at: null,
  },
})

// ── 3. Portefeuille fictif ────────────────────────────────────────────────────
const today = new Date()
const y = today.getFullYear()
const yPrev = y - 1
const iso = d => d.toISOString().slice(0, 10)
const monthsAgo = n => { const d = new Date(today); d.setMonth(d.getMonth() - n); return d }

const BIENS = [
  {
    name: 'Studio Meublé Montmartre', type: 'lmnp',
    address: '18 rue Lepic', city: 'Paris', postal_code: '75018',
    surface_m2: 28, purchase_price: 195000, purchase_year: 2020,
    monthly_charges: 120, property_tax: 850, insurance_annual: 380,
    loan_monthly: 720, loan_rate: 1.85, lmnp_regime: 'reel',
    valeur_actuelle: 232000, valeur_actuelle_date: `${y}-01-15`,
    valeur_actuelle_source: 'Estimation notaire',
  },
  {
    name: 'Appartement T3 Lyon Bellecour', type: 'nu',
    address: '5 rue de la République', city: 'Lyon', postal_code: '69002',
    surface_m2: 68, purchase_price: 285000, purchase_year: 2018,
    monthly_charges: 220, property_tax: 1650, insurance_annual: 580,
    loan_monthly: 1050, loan_rate: 2.1,
    valeur_actuelle: 331000, valeur_actuelle_date: `${y}-02-01`,
    valeur_actuelle_source: 'Estimation agence',
  },
  {
    name: 'Studio Airbnb Nice Promenade', type: 'airbnb',
    address: '10 Promenade des Anglais', city: 'Nice', postal_code: '06000',
    surface_m2: 32, purchase_price: 215000, purchase_year: 2022,
    monthly_charges: 160, property_tax: 920, insurance_annual: 420,
    loan_monthly: 810, loan_rate: 3.4, airbnb_max_nights: 120,
    valeur_actuelle: 238000, valeur_actuelle_date: `${y}-03-10`,
    valeur_actuelle_source: 'Estimation en ligne',
  },
  {
    name: 'Local commercial Bordeaux Chartrons', type: 'commerce',
    address: '42 rue Notre-Dame', city: 'Bordeaux', postal_code: '33000',
    surface_m2: 95, purchase_price: 340000, purchase_year: 2019,
    monthly_charges: 0, property_tax: 2400, insurance_annual: 640,
    loan_monthly: 1180, loan_rate: 1.95, indice_revision: 'ilc',
    valeur_actuelle: 385000, valeur_actuelle_date: `${y}-01-20`,
    valeur_actuelle_source: 'Expertise',
  },
  {
    name: 'Immeuble SCI Nantes Graslin', type: 'sci',
    address: '7 place Graslin', city: 'Nantes', postal_code: '44000',
    surface_m2: 145, purchase_price: 520000, purchase_year: 2021,
    monthly_charges: 310, property_tax: 3100, insurance_annual: 980,
    loan_monthly: 1950, loan_rate: 1.6,
    sci_name: 'SCI Les Trois Chênes', sci_siren: '901234567', sci_regime: 'is',
    sci_capital_parts: 1000,
    valeur_actuelle: 578000, valeur_actuelle_date: `${y}-02-14`,
    valeur_actuelle_source: 'Estimation notaire',
  },
  {
    name: 'T2 Meublé Toulouse Capitole', type: 'lmnp',
    address: '12 rue Saint-Rome', city: 'Toulouse', postal_code: '31000',
    surface_m2: 42, purchase_price: 168000, purchase_year: 2023,
    monthly_charges: 95, property_tax: 780, insurance_annual: 340,
    loan_monthly: 690, loan_rate: 3.85, lmnp_regime: 'reel',
    valeur_actuelle: 176000, valeur_actuelle_date: `${y}-03-01`,
    valeur_actuelle_source: 'Estimation agence',
  },
]

const props = {}
for (const b of BIENS) {
  const [row] = await rest('properties', { method: 'POST', body: { user_id: USER, ...b } })
  props[b.name] = row
  console.log(`✅ ${b.name}`)
}

const P = n => props[BIENS[n].name].id

// ── 4. Baux ───────────────────────────────────────────────────────────────────
const BAUX = [
  {
    property_id: P(0), tenant_name: 'Sophie Martin', tenant_email: 'sophie.martin@example.fr',
    tenant_phone: '06 12 34 56 78', monthly_rent: 980, charges: 80, deposit: 1960,
    start_date: '2021-09-01', indexation_index: 'irl', irl_reference_indice: 'irl',
    irl_reference_valeur: 131.67, irl_reference_trimestre: 3, irl_reference_annee: 2021,
    is_active: true, appel_loyer_actif: true,
    assurance_locataire_compagnie: 'AXA', assurance_locataire_expiration: `${y + 1}-08-31`,
  },
  {
    property_id: P(1), tenant_name: 'Marc et Julie Durand', tenant_email: 'famille.durand@example.fr',
    tenant_phone: '06 98 76 54 32', monthly_rent: 1350, charges: 150, deposit: 2700,
    start_date: '2019-03-15', indexation_index: 'irl', irl_reference_indice: 'irl',
    irl_reference_valeur: 129.38, irl_reference_trimestre: 1, irl_reference_annee: 2019,
    is_active: true, appel_loyer_actif: true,
    garant_nom: 'Durand', garant_prenom: 'Robert', garant_lien: 'Parent',
    garant_telephone: '06 11 22 33 44', caution_type: 'solidaire',
    assurance_locataire_compagnie: 'MAIF', assurance_locataire_expiration: `${y}-11-30`,
  },
  {
    property_id: P(3), tenant_name: 'SARL Le Comptoir des Chartrons',
    tenant_email: 'contact@example.fr', tenant_phone: '05 56 12 34 56',
    monthly_rent: 2100, charges: 0, deposit: 6300,
    start_date: '2020-01-01', indexation_index: 'ilc', irl_reference_indice: 'ilc',
    irl_reference_valeur: 116.23, irl_reference_trimestre: 4, irl_reference_annee: 2019,
    is_active: true, appel_loyer_actif: true,
  },
  {
    property_id: P(4), tenant_name: 'Camille Rousseau', tenant_email: 'camille.rousseau@example.fr',
    tenant_phone: '06 45 67 89 01', monthly_rent: 1680, charges: 210, deposit: 3360,
    start_date: '2022-06-01', indexation_index: 'irl', irl_reference_indice: 'irl',
    irl_reference_valeur: 135.84, irl_reference_trimestre: 2, irl_reference_annee: 2022,
    is_active: true, appel_loyer_actif: true,
  },
  {
    property_id: P(5), tenant_name: 'Thomas Belkacem', tenant_email: 'thomas.belkacem@example.fr',
    tenant_phone: '07 22 33 44 55', monthly_rent: 720, charges: 60, deposit: 1440,
    start_date: '2023-09-01', indexation_index: 'irl', irl_reference_indice: 'irl',
    irl_reference_valeur: 141.03, irl_reference_trimestre: 3, irl_reference_annee: 2023,
    is_active: true, appel_loyer_actif: true,
  },
]

const baux = []
for (const b of BAUX) {
  const [row] = await rest('leases', { method: 'POST', body: b })
  baux.push(row)
}
console.log(`✅ ${baux.length} baux`)

// ── 5. Loyers sur 14 mois (dont 1 retard + 1 impayé pour animer le dashboard) ──
const payments = []
for (const [idx, l] of baux.entries()) {
  const total = (l.monthly_rent ?? 0) + (l.charges ?? 0)
  for (let i = 13; i >= 0; i--) {
    const due = monthsAgo(i)
    due.setDate(5)
    const isPast = i > 0
    // Le bail #1 accuse un retard le mois dernier, le bail #4 un impayé il y a 2 mois
    const late = (idx === 0 && i === 1) || (idx === 4 && i === 2)
    payments.push({
      lease_id: l.id, amount: total, due_date: iso(due),
      paid_date: isPast && !late ? iso(new Date(due.getTime() - 2 * 864e5)) : null,
      status: late ? 'late' : isPast ? 'paid' : 'pending',
      relance_count: late ? 1 : 0,
    })
  }
}
await rest('payments', { method: 'POST', body: payments })
console.log(`✅ ${payments.length} échéances de loyer`)

// ── 6. Dépenses ───────────────────────────────────────────────────────────────
await rest('expenses', {
  method: 'POST',
  body: [
    { property_id: P(0), amount: 850, category: 'taxe', fiscal_deductible: true, description: `Taxe foncière ${yPrev}`, date: `${yPrev}-10-15` },
    { property_id: P(0), amount: 380, category: 'assurance', fiscal_deductible: true, description: 'Assurance PNO', date: `${y}-01-10` },
    { property_id: P(0), amount: 1200, category: 'travaux', fiscal_deductible: true, description: 'Remplacement chauffe-eau', date: `${y}-03-22` },
    { property_id: P(1), amount: 1650, category: 'taxe', fiscal_deductible: true, description: `Taxe foncière ${yPrev}`, date: `${yPrev}-10-15` },
    { property_id: P(1), amount: 580, category: 'assurance', fiscal_deductible: true, description: 'Assurance PNO', date: `${y}-01-08` },
    { property_id: P(1), amount: 450, category: 'gestion', fiscal_deductible: true, description: 'Frais de gestion T1', date: `${y}-04-01` },
    { property_id: P(2), amount: 920, category: 'taxe', fiscal_deductible: true, description: `Taxe foncière ${yPrev}`, date: `${yPrev}-10-15` },
    { property_id: P(2), amount: 640, category: 'travaux', fiscal_deductible: true, description: 'Rafraîchissement peinture', date: `${y}-02-18` },
    { property_id: P(3), amount: 2400, category: 'taxe', fiscal_deductible: true, description: `Taxe foncière ${yPrev}`, date: `${yPrev}-10-15` },
    { property_id: P(4), amount: 3100, category: 'taxe', fiscal_deductible: true, description: `Taxe foncière ${yPrev}`, date: `${yPrev}-10-15` },
    { property_id: P(4), amount: 980, category: 'assurance', fiscal_deductible: true, description: 'Assurance PNO SCI', date: `${y}-01-12` },
    { property_id: P(5), amount: 780, category: 'taxe', fiscal_deductible: true, description: `Taxe foncière ${yPrev}`, date: `${yPrev}-10-15` },
  ],
})
console.log('✅ Dépenses')

// ── 7. Amortissements LMNP ────────────────────────────────────────────────────
await rest('depreciation_plans', {
  method: 'POST',
  body: [
    { property_id: P(0), component: 'gros_oeuvre', value: 97500, duration_years: 80, start_date: '2020-06-01' },
    { property_id: P(0), component: 'facade', value: 19500, duration_years: 30, start_date: '2020-06-01' },
    { property_id: P(0), component: 'toiture', value: 9750, duration_years: 25, start_date: '2020-06-01' },
    { property_id: P(0), component: 'installations', value: 15600, duration_years: 20, start_date: '2020-06-01' },
    { property_id: P(0), component: 'agencement', value: 23400, duration_years: 12, start_date: '2020-06-01' },
    { property_id: P(0), component: 'mobilier', value: 8500, duration_years: 7, start_date: '2020-06-01' },
    { property_id: P(0), component: 'frais_acq', value: 14600, duration_years: 40, start_date: '2020-06-01' },
    { property_id: P(5), component: 'gros_oeuvre', value: 84000, duration_years: 80, start_date: '2023-07-01' },
    { property_id: P(5), component: 'agencement', value: 20160, duration_years: 12, start_date: '2023-07-01' },
    { property_id: P(5), component: 'mobilier', value: 6500, duration_years: 7, start_date: '2023-07-01' },
    { property_id: P(5), component: 'frais_acq', value: 12600, duration_years: 40, start_date: '2023-07-01' },
  ],
})
console.log('✅ Amortissements LMNP')

// ── 8. Réservations Airbnb ────────────────────────────────────────────────────
const guests = ['Emma L.', 'Thomas B.', 'Claire M.', 'Pierre D.', 'Anna K.', 'Lucas R.', 'Marie P.', 'David C.']
const bookings = []
const moisEcoules = today.getMonth() + 1
for (let m = 1; m <= moisEcoules; m++) {
  const mm = String(m).padStart(2, '0')
  const haute = m >= 6 && m <= 9
  const tarif = haute ? 145 : 95
  bookings.push({
    property_id: P(2), check_in: `${y}-${mm}-05`, check_out: `${y}-${mm}-12`,
    nightly_rate: tarif, platform_fee_pct: 3,
    total_revenue: Math.round(tarif * 7 * 0.97), guest_name: guests[(m - 1) % guests.length],
  })
  if (m % 2 === 0) {
    bookings.push({
      property_id: P(2), check_in: `${y}-${mm}-18`, check_out: `${y}-${mm}-23`,
      nightly_rate: tarif + 15, platform_fee_pct: 3,
      total_revenue: Math.round((tarif + 15) * 5 * 0.97), guest_name: guests[(m + 3) % guests.length],
    })
  }
}
await rest('airbnb_bookings', { method: 'POST', body: bookings })
console.log(`✅ ${bookings.length} réservations Airbnb`)

// ── 9. Associés SCI ───────────────────────────────────────────────────────────
await rest('sci_associates', {
  method: 'POST',
  body: [
    { property_id: P(4), name: 'Compte de démonstration', email: DEMO_EMAIL, share_pct: 60, nombre_parts: 600 },
    { property_id: P(4), name: 'Hélène Fontaine', email: 'helene.fontaine@example.fr', share_pct: 25, nombre_parts: 250 },
    { property_id: P(4), name: 'Antoine Fontaine', email: 'antoine.fontaine@example.fr', share_pct: 15, nombre_parts: 150 },
  ],
})
console.log('✅ Associés SCI')

// ── 10. Travaux & incidents ───────────────────────────────────────────────────
const incidents = await rest('incidents', {
  method: 'POST',
  body: [
    { property_id: P(1), title: 'Fuite robinet salle de bain', description: 'Signalée par le locataire', status: 'open', cout_estime: 150, reported_by: 'tenant', categorie_fiscale: 'entretien_reparation' },
    { property_id: P(0), title: 'Remplacement chauffe-eau', description: 'Ballon 100L thermodynamique', status: 'resolved', cout_paye: 1200, est_paye: true, nom_entreprise: 'Plomberie Dupuis', date_travaux: `${y}-03-22`, numero_facture: 'F2024-0312', categorie_fiscale: 'entretien_reparation', resolved_at: `${y}-03-25` },
    { property_id: P(2), title: 'Rafraîchissement peinture séjour', status: 'resolved', cout_paye: 640, est_paye: true, nom_entreprise: 'Peinture Azur', date_travaux: `${y}-02-18`, categorie_fiscale: 'entretien_reparation', resolved_at: `${y}-02-20` },
    { property_id: P(4), title: 'Ravalement façade — devis en cours', description: 'Copropriété, appel de fonds prévu', status: 'open', cout_estime: 8500, categorie_fiscale: 'amelioration' },
  ],
})
console.log('✅ Travaux & incidents')

// ── 11 bis. Dépenses annexes de gestion (property_id null, régime dans reported_by)
await rest('incidents', {
  method: 'POST',
  body: [
    { property_id: null, user_id: USER, title: 'Abonnement logiciel de gestion locative', status: 'resolved', cost: 180, cout_paye: 180, cout_estime: 180, est_paye: true, reported_by: 'bic_lmnp', categorie_fiscale: 'frais_gestion', date_travaux: `${y}-01-05`, nom_entreprise: 'PropilotSaaS' },
    { property_id: null, user_id: USER, title: 'Ordinateur portable (gestion du parc)', status: 'resolved', cost: 1100, cout_paye: 1100, cout_estime: 1100, est_paye: true, reported_by: 'bic_lmnp', categorie_fiscale: 'materiel_informatique', date_travaux: `${yPrev}-11-20`, nom_entreprise: 'Boulanger' },
    { property_id: null, user_id: USER, title: 'Déplacements visites de biens', status: 'resolved', cost: 340, cout_paye: 340, cout_estime: 340, est_paye: true, reported_by: 'sci_is', categorie_fiscale: 'frais_deplacement', date_travaux: `${y}-04-12`, nom_entreprise: null },
    { property_id: null, user_id: USER, title: 'Frais bancaires compte SCI', status: 'resolved', cost: 96, cout_paye: 96, cout_estime: 96, est_paye: true, reported_by: 'sci_is', categorie_fiscale: 'frais_gestion', date_travaux: `${y}-06-30`, nom_entreprise: 'Crédit Agricole' },
    { property_id: null, user_id: USER, title: 'Abonnement conciergerie saisonnière', status: 'resolved', cost: 420, cout_paye: 420, cout_estime: 420, est_paye: true, reported_by: 'bic_airbnb', categorie_fiscale: 'frais_gestion', date_travaux: `${y}-05-15`, nom_entreprise: 'Azur Conciergerie' },
  ],
}).catch(e => console.log('⚠️  dépenses annexes:', e.message))
console.log('✅ Dépenses annexes')

// ── 11. Diagnostics ───────────────────────────────────────────────────────────
await rest('diagnostics', {
  method: 'POST',
  body: [
    { property_id: P(0), type: 'dpe', resultat: 'D', valeur_dpe: 'D', date_realisation: '2020-05-12', date_expiration: '2030-05-12', cabinet: 'Diag Expert' },
    { property_id: P(1), type: 'dpe', resultat: 'C', valeur_dpe: 'C', date_realisation: '2018-02-20', date_expiration: `${y}-02-20`, cabinet: 'Diag Expert' },
    { property_id: P(2), type: 'dpe', resultat: 'B', valeur_dpe: 'B', date_realisation: '2022-04-08', date_expiration: '2032-04-08', cabinet: 'Sud Diagnostic' },
    { property_id: P(5), type: 'dpe', resultat: 'E', valeur_dpe: 'E', date_realisation: '2023-06-15', date_expiration: '2033-06-15', cabinet: 'Occitanie Diag' },
  ],
}).catch(e => console.log('⚠️  diagnostics ignorés:', e.message))
console.log('✅ Diagnostics')

// ── 12. Devis (module travaux/devis) ──────────────────────────────────────────
const incRavalement = incidents.find(i => i.title.startsWith('Ravalement'))
const incFuite = incidents.find(i => i.title.startsWith('Fuite'))
await rest('devis', {
  method: 'POST',
  body: [
    { incident_id: incRavalement.id, entreprise: 'Façades de l\'Ouest', montant: 8500, date_reception: `${y}-03-04`, delai_execution_jours: 45, validite_jours: 90, statut: 'en_attente', notes: 'Échafaudage inclus' },
    { incident_id: incRavalement.id, entreprise: 'Atlantique Rénovation', montant: 9750, date_reception: `${y}-03-11`, delai_execution_jours: 30, validite_jours: 60, statut: 'refuse', notes: 'Garantie décennale' },
    { incident_id: incRavalement.id, entreprise: 'Bâti Nantes', montant: 7900, date_reception: `${y}-03-18`, delai_execution_jours: 60, validite_jours: 90, statut: 'retenu', notes: 'Meilleur rapport qualité/prix' },
    { incident_id: incFuite.id, entreprise: 'Plomberie Lyonnaise', montant: 150, date_reception: `${y}-05-02`, delai_execution_jours: 7, validite_jours: 30, statut: 'en_attente' },
  ],
}).catch(e => console.log('⚠️  devis:', e.message))
console.log('✅ Devis')

// ── 13. Contacts par bien ─────────────────────────────────────────────────────
await rest('contacts_bien', {
  method: 'POST',
  body: [
    { property_id: P(0), nom: 'Berger', prenom: 'Nicolas', role: 'syndic', entreprise: 'Cabinet Berger Immobilier', telephone: '01 42 55 66 77', email: 'contact@example.fr' },
    { property_id: P(0), nom: 'Dupuis', prenom: 'Alain', role: 'artisan_plombier', entreprise: 'Plomberie Dupuis', telephone: '06 33 44 55 66', email: 'adupuis@example.fr', notes: 'Plombier de confiance, intervient sous 48h' },
    { property_id: P(1), nom: 'Moreau', prenom: 'Sylvie', role: 'syndic', entreprise: 'Foncia Lyon', telephone: '04 72 11 22 33', email: 'syndic@example.fr' },
    { property_id: P(2), nom: 'Roux', prenom: 'Julien', role: 'autre', entreprise: 'Azur Clean', telephone: '06 77 88 99 00', email: 'contact@example.fr', notes: 'Ménage entre deux réservations' },
    { property_id: P(3), nom: 'Lefèvre', prenom: 'Patrick', role: 'expert_comptable', entreprise: 'Cabinet Lefèvre & Associés', telephone: '05 56 44 33 22', email: 'plefevre@example.fr' },
    { property_id: P(4), nom: 'Chartier', prenom: 'Isabelle', role: 'notaire', entreprise: 'Étude Chartier', telephone: '02 40 11 22 33', email: 'etude@example.fr' },
    { property_id: P(4), nom: 'Bâti', prenom: 'Nantes', role: 'artisan_general', entreprise: 'Bâti Nantes', telephone: '02 40 55 66 77', email: 'devis@example.fr' },
  ],
}).catch(e => console.log('⚠️  contacts:', e.message))
console.log('✅ Contacts')

// ── 14. Copropriété — appels de fonds ─────────────────────────────────────────
await rest('copro_appels_fonds', {
  method: 'POST',
  body: [
    { property_id: P(0), date_appel: `${y}-01-15`, montant: 360, type: 'charges_courantes', description: 'Appel T1', paye: true },
    { property_id: P(0), date_appel: `${y}-04-15`, montant: 360, type: 'charges_courantes', description: 'Appel T2', paye: true },
    { property_id: P(0), date_appel: `${y}-07-15`, montant: 360, type: 'charges_courantes', description: 'Appel T3', paye: false },
    { property_id: P(1), date_appel: `${y}-01-10`, montant: 660, type: 'charges_courantes', description: 'Appel T1', paye: true },
    { property_id: P(1), date_appel: `${y}-04-10`, montant: 660, type: 'charges_courantes', description: 'Appel T2', paye: true },
    { property_id: P(4), date_appel: `${y}-02-01`, montant: 930, type: 'charges_courantes', description: 'Appel T1', paye: true },
    { property_id: P(4), date_appel: `${y}-03-20`, montant: 2500, type: 'fonds_travaux', description: 'Fonds travaux ravalement', paye: false },
  ],
}).catch(e => console.log('⚠️  appels de fonds:', e.message))
console.log('✅ Appels de fonds copro')

// ── 15. Comptes courants d'associés (SCI) ─────────────────────────────────────
const associes = await rest('sci_associates', { q: `?property_id=eq.${P(4)}&select=id,name` })
const moi = associes.find(a => a.name.startsWith('Compte'))
const helene = associes.find(a => a.name.startsWith('Hélène'))
await rest('comptes_courants_associes', {
  method: 'POST',
  body: [
    { property_id: P(4), associe_id: moi.id, date_operation: '2021-05-10', type: 'avance', montant: 45000, motif: 'Apport initial acquisition' },
    { property_id: P(4), associe_id: helene.id, date_operation: '2021-05-10', type: 'avance', montant: 18000, motif: 'Apport initial acquisition' },
    { property_id: P(4), associe_id: moi.id, date_operation: `${yPrev}-06-15`, type: 'avance', montant: 6000, motif: 'Avance travaux toiture' },
    { property_id: P(4), associe_id: moi.id, date_operation: `${y}-02-28`, type: 'remboursement', montant: 4000, motif: 'Remboursement partiel' },
  ],
}).catch(e => console.log('⚠️  CCA:', e.message))
console.log('✅ Comptes courants associés')

// ── 16. Locataires (fiches) ───────────────────────────────────────────────────
await rest('tenants', {
  method: 'POST',
  body: [
    { user_id: USER, full_name: 'Sophie Martin', email: 'sophie.martin@example.fr', phone: '06 12 34 56 78', address_before: '3 rue de Clignancourt, 75018 Paris', notes: 'Locataire sérieuse depuis 2021' },
    { user_id: USER, full_name: 'Marc et Julie Durand', email: 'famille.durand@example.fr', phone: '06 98 76 54 32', guarantor_name: 'Robert Durand', guarantor_phone: '06 11 22 33 44', guarantor_email: 'r.durand@example.fr' },
    { user_id: USER, full_name: 'Camille Rousseau', email: 'camille.rousseau@example.fr', phone: '06 45 67 89 01' },
    { user_id: USER, full_name: 'Thomas Belkacem', email: 'thomas.belkacem@example.fr', phone: '07 22 33 44 55', notes: 'Étudiant, garant parental' },
  ],
}).catch(e => console.log('⚠️  tenants:', e.message))
console.log('✅ Fiches locataires')

// ── 17. Déclarations fiscales & déficits ──────────────────────────────────────
await rest('declarations_fiscales', {
  method: 'POST',
  body: [
    { user_id: USER, annee: yPrev - 1, type: 'autre', revenus_fonciers: 32400, charges_deductibles: 11800, deficit_foncier: 0, revenu_net_global: 20600, impots_payes: 6180, tmi: 30, revenu_bic_lmnp: 11760, amortissements: 9200, resultat_sci: 4300 },
    { user_id: USER, annee: yPrev, type: 'autre', revenus_fonciers: 34200, charges_deductibles: 14600, deficit_foncier: 0, revenu_net_global: 19600, impots_payes: 5880, tmi: 30, revenu_bic_lmnp: 12240, amortissements: 9950, resultat_sci: 5100 },
  ],
}).catch(e => console.log('⚠️  déclarations:', e.message))

await rest('deficits_fonciers', {
  method: 'POST',
  body: [
    { user_id: USER, property_id: P(1), annee: yPrev - 2, montant_initial: 8200, montant_impute: 5400, source: 'travaux', notes: 'Rénovation énergétique 2023' },
    { user_id: USER, property_id: P(3), annee: yPrev, montant_initial: 3100, montant_impute: 0, source: 'travaux', notes: 'Mise aux normes local commercial' },
  ],
}).catch(e => console.log('⚠️  déficits:', e.message))
console.log('✅ Déclarations & déficits fonciers')

// ── 18. Documents (GED) ───────────────────────────────────────────────────────
await rest('documents', {
  method: 'POST',
  body: [
    { user_id: USER, property_id: P(0), nom: 'Bail Sophie Martin', categorie: 'bail_avenants', file_name: 'bail-montmartre-2021.pdf', file_type: 'application/pdf', file_size_bytes: 248000, annee_fiscale: 2021, tags: ['bail', 'signé'], file_url: '' },
    { user_id: USER, property_id: P(0), nom: 'Acte de vente', categorie: 'divers', file_name: 'acte-vente-montmartre.pdf', file_type: 'application/pdf', file_size_bytes: 1840000, annee_fiscale: 2020, tags: ['notaire'], file_url: '' },
    { user_id: USER, property_id: P(0), nom: 'Facture chauffe-eau', categorie: 'factures_travaux', file_name: 'facture-F2024-0312.pdf', file_type: 'application/pdf', file_size_bytes: 96000, annee_fiscale: y, tags: ['travaux', 'déductible'], file_url: '' },
    { user_id: USER, property_id: P(1), nom: 'Taxe foncière ' + yPrev, categorie: 'fiscalite', file_name: `tf-lyon-${yPrev}.pdf`, file_type: 'application/pdf', file_size_bytes: 132000, annee_fiscale: yPrev, tags: ['impôts'], file_url: '' },
    { user_id: USER, property_id: P(1), nom: 'DPE Lyon', categorie: 'diagnostics', file_name: 'dpe-lyon.pdf', file_type: 'application/pdf', file_size_bytes: 420000, tags: ['DPE'], file_url: '' },
    { user_id: USER, property_id: P(4), nom: 'Statuts SCI Les Trois Chênes', categorie: 'divers', file_name: 'statuts-sci.pdf', file_type: 'application/pdf', file_size_bytes: 310000, annee_fiscale: 2021, tags: ['SCI', 'statuts'], file_url: '' },
    { user_id: USER, property_id: P(3), nom: 'Bail commercial 3-6-9', categorie: 'bail_avenants', file_name: 'bail-commercial-bordeaux.pdf', file_type: 'application/pdf', file_size_bytes: 380000, annee_fiscale: 2020, tags: ['bail', 'commercial'], file_url: '' },
  ],
}).catch(e => console.log('⚠️  documents:', e.message))
console.log('✅ Documents')

// ── 19. Modèles de baux ───────────────────────────────────────────────────────
await rest('modeles_baux', {
  method: 'POST',
  body: [
    { user_id: USER, nom: 'Bail meublé 1 an', type_bail: 'meuble', contenu: 'Modèle de bail meublé conforme loi ALUR — {{tenant_name}}, {{monthly_rent}}€/mois.' },
    { user_id: USER, nom: 'Bail nu 3 ans', type_bail: 'nu', contenu: 'Modèle de bail nu conforme loi du 6 juillet 1989 — {{tenant_name}}, {{monthly_rent}}€/mois.' },
    { user_id: USER, nom: 'Bail étudiant 9 mois', type_bail: 'etudiant', contenu: 'Modèle de bail étudiant non reconductible — {{tenant_name}}.' },
  ],
}).catch(e => console.log('⚠️  modèles baux:', e.message))
console.log('✅ Modèles de baux')

// ── 20. Copilot IA — historique de conversation ───────────────────────────────
await rest('ai_messages', {
  method: 'POST',
  body: [
    { user_id: USER, role: 'user', content: 'Quel est mon rendement net sur le studio de Montmartre ?' },
    { user_id: USER, role: 'assistant', content: "Sur le Studio Meublé Montmartre : loyer annuel de 12 720 € charges comprises, moins 850 € de taxe foncière, 380 € d'assurance et 1 440 € de charges de copropriété, soit 10 050 € net. Rapporté au prix d'acquisition de 195 000 €, votre rendement net s'établit à 5,15 %. En intégrant l'amortissement LMNP (environ 6 400 €/an), votre résultat BIC imposable tombe à 3 650 €." },
    { user_id: USER, role: 'user', content: 'Dois-je passer ma SCI à l\'IR ?' },
    { user_id: USER, role: 'assistant', content: "Votre SCI Les Trois Chênes est actuellement à l'IS, ce qui vous permet d'amortir l'immeuble et de neutraliser le résultat fiscal. Repasser à l'IR n'est possible que dans les 5 premières années d'option et vous ferait perdre l'amortissement. Compte tenu de votre TMI à 30 % et du résultat SCI de 5 100 €, l'IS reste plus avantageux tant que vous ne distribuez pas de dividendes." },
  ],
}).catch(e => console.log('⚠️  ai_messages:', e.message))
console.log('✅ Historique Copilot IA')

// ── 21. Rapprochement bancaire ────────────────────────────────────────────────
try {
  const [conn] = await rest('banking_connections', {
    method: 'POST',
    body: [{
      user_id: USER, institution_id: 'DEMO_BANK', institution_name: 'Banque de démonstration',
      requisition_id: 'demo-req', account_id: 'demo-acc', iban: 'FR7630001007941234567890185',
      status: 'active', last_sync_at: new Date().toISOString(),
    }],
  })
  const tx = []
  for (const [idx, l] of baux.entries()) {
    const total = (l.monthly_rent ?? 0) + (l.charges ?? 0)
    for (let i = 3; i >= 1; i--) {
      const d = monthsAgo(i); d.setDate(3)
      tx.push({
        connection_id: conn.id, user_id: USER, transaction_id: `demo-${idx}-${i}`,
        amount: total, currency: 'EUR', date: iso(d),
        description: `VIR SEPA LOYER ${l.tenant_name.toUpperCase()}`,
        debtor_name: l.tenant_name, match_status: i === 1 ? 'pending' : 'matched',
      })
    }
  }
  tx.push({
    connection_id: conn.id, user_id: USER, transaction_id: 'demo-charge-1',
    amount: -1200, currency: 'EUR', date: `${y}-03-25`,
    description: 'PRLV PLOMBERIE DUPUIS FACTURE F2024-0312',
    creditor_name: 'Plomberie Dupuis', match_status: 'pending',
  })
  await rest('banking_transactions', { method: 'POST', body: tx })
  console.log(`✅ Rapprochement bancaire (${tx.length} transactions)`)
} catch (e) {
  console.log('⚠️  banking:', e.message)
}

console.log(`\n🎉 Compte démo prêt — ${BIENS.length} biens, ${baux.length} baux, ${payments.length} échéances`)
console.log(`   user_id : ${USER}`)
console.log(`   Accès   : /api/demo  (aucun identifiant requis)`)
