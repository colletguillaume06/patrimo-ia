#!/usr/bin/env node
// Sauvegarde complète de la base Supabase vers backups/backup_<date>.json
// Usage : node scripts/backup-supabase.mjs
// Lit les clés depuis .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)

import { readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Charge .env.local
const env = {}
try {
  for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {
  console.error('❌ .env.local introuvable')
  process.exit(1)
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('❌ Clés Supabase manquantes dans .env.local')
  process.exit(1)
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const TABLES = [
  'profiles', 'properties', 'leases', 'payments', 'expenses',
  'depreciation_plans', 'sci_associates', 'airbnb_bookings', 'incidents',
  'ai_messages', 'diagnostics', 'declarations_fiscales', 'rapprochement_transactions',
  'documents',
]

const out = {}
for (const t of TABLES) {
  try {
    const r = await fetch(`${URL}/rest/v1/${t}?select=*`, { headers })
    if (!r.ok) { console.log(`  ${t}: (ignorée, ${r.status})`); continue }
    const rows = await r.json()
    out[t] = rows
    console.log(`  ${t}: ${rows.length} lignes`)
  } catch (e) {
    console.log(`  ${t}: (erreur) ${String(e).slice(0, 60)}`)
  }
}
try {
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=500`, { headers })
  const j = await r.json()
  out.auth_users = j.users || []
  console.log(`  auth_users: ${out.auth_users.length} comptes`)
} catch (e) { console.log('  auth_users: (erreur)', e) }

mkdirSync(resolve(root, 'backups'), { recursive: true })
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
const path = resolve(root, 'backups', `backup_${stamp}.json`)
writeFileSync(path, JSON.stringify(out, null, 2))
console.log(`\n✅ Sauvegarde : ${path}`)
console.log(`   Taille : ${(statSync(path).size / 1024).toFixed(1)} Ko`)
