import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEMO_EMAIL = 'demo@propilot.app'

/**
 * Accès démo public — aucun identifiant requis.
 *
 * Un magic-link est généré à la volée côté serveur via l'API admin, puis
 * consommé immédiatement pour ouvrir la session. Aucun mot de passe n'est
 * stocké ni exposé au navigateur.
 *
 * Le compte est verrouillé en lecture seule au niveau base (migration 004),
 * ce qui garantit que la démo reste intacte quoi que fasse le visiteur.
 */
// Accès démo désactivé (décision du 2026-08-06) : réactiver nécessite de
// retirer ce court-circuit ET de repasser la migration 004 en vigueur.
const DEMO_DISABLED = true

export async function GET(request: NextRequest) {
  // Redirections relatives à l'origine réelle de la requête (pas d'env à tenir à jour)
  const origin = request.nextUrl.origin

  if (DEMO_DISABLED) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  // 1. Générer un magic-link à usage unique (API admin, jamais exposée au client)
  const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email: DEMO_EMAIL }),
  })

  if (!res.ok) {
    console.error('[demo] generate_link failed:', await res.text())
    return NextResponse.redirect(new URL('/login', origin))
  }

  const link = await res.json()
  const tokenHash = link.hashed_token ?? link.properties?.hashed_token

  if (!tokenHash) {
    console.error('[demo] no hashed_token in response')
    return NextResponse.redirect(new URL('/login', origin))
  }

  // 2. Consommer le lien pour poser les cookies de session sur la réponse
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })

  if (error) {
    console.error('[demo] verifyOtp failed:', error.message)
    return NextResponse.redirect(new URL('/login', origin))
  }

  return NextResponse.redirect(new URL('/dashboard', origin))
}
