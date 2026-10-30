import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Cookies de SESSION : on retire maxAge/expires pour que la session
              // soit effacée à la fermeture du navigateur (déconnexion auto).
              const opts = { ...options }
              delete (opts as any).maxAge
              delete (opts as any).expires
              cookieStore.set(name, value, opts)
            })
          } catch {}
        },
      },
    }
  )
}

/**
 * Client à privilèges service_role : contourne RLS.
 *
 * ⚠️ Ne JAMAIS lui passer les cookies de la requête. `createServerClient`
 * (@supabase/ssr) lit la session utilisateur dans les cookies et s'en sert
 * comme header Authorization, ce qui écrase la clé service_role : le client
 * retombe alors sur les droits de l'utilisateur et RLS s'applique — les
 * écritures Storage échouent en « new row violates row-level security policy ».
 *
 * On utilise donc le client standard, sans persistance de session.
 * À réserver aux routes serveur qui ont déjà vérifié l'utilisateur.
 */
export async function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
