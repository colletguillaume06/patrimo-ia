import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const ACTIVITY_COOKIE = 'patrimo_la' // last activity (timestamp ms)

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isDashboard = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/biens') ||
    pathname.startsWith('/loyers') ||
    pathname.startsWith('/baux') ||
    pathname.startsWith('/fiscalite') ||
    pathname.startsWith('/fiscal') ||
    pathname.startsWith('/travaux') ||
    pathname.startsWith('/copilot') ||
    pathname.startsWith('/exports') ||
    pathname.startsWith('/patrimoine') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/contacts') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/courriers') ||
    pathname.startsWith('/emails') ||
    pathname.startsWith('/parametres')

  // Routes protégées : redirect vers login si non connecté
  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect vers dashboard si connecté et sur /
  if (pathname === '/' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Onboarding : redirect si onboarding_done === false, sauf si déjà sur /onboarding
  if (user && isDashboard && !pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_done) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Contrôle d'inactivité serveur : déconnexion forcée après 30 min sans activité.
  // Le cookie patrimo_la est un cookie de session (supprimé à la fermeture du navigateur).
  if (user && isDashboard) {
    const la = request.cookies.get(ACTIVITY_COOKIE)?.value
    const now = Date.now()
    const isStale = la && (now - Number(la) > INACTIVITY_TIMEOUT)

    if (isStale) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirect = NextResponse.redirect(url)
      // Reporter les suppressions de cookies d'auth sur la réponse de redirection
      supabaseResponse.cookies.getAll().forEach(c =>
        redirect.cookies.set(c.name, c.value, c)
      )
      redirect.cookies.delete(ACTIVITY_COOKIE)
      return redirect
    }

    // Activité fraîche → rafraîchir l'horodatage (cookie de session)
    supabaseResponse.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }

  return supabaseResponse
}
