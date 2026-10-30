import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Buckets privés servis par ce résolveur. Tout chemin y est préfixé par l'id
// de l'utilisateur qui a uploadé le fichier, ce qui isole les fichiers par
// compte et permet un contrôle d'accès par simple préfixe.
const ALLOWED = new Set(['documents', 'baux', 'modeles-baux', 'factures'])

/**
 * Lecture sécurisée d'un fichier de bucket privé, via URL signée temporaire.
 *
 *   GET /api/storage/file?bucket=documents&src=<chemin ou URL héritée>
 *
 * `src` accepte aussi bien un chemin nu (`<user_id>/…`) que les anciennes URLs
 * publiques (`…/object/public/<bucket>/<user_id>/…`) encore stockées en base :
 * le chemin réel en est extrait. L'accès n'est accordé que si ce chemin
 * commence par l'id de l'utilisateur connecté — un fichier d'un autre compte
 * est donc refusé.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bucket = req.nextUrl.searchParams.get('bucket') ?? ''
  const src = req.nextUrl.searchParams.get('src') ?? ''
  if (!ALLOWED.has(bucket) || !src) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  // Extraire le chemin interne, que `src` soit un chemin nu ou une URL héritée.
  let path = src
  const marker = `/object/public/${bucket}/`
  const i = src.indexOf(marker)
  if (i !== -1) path = src.slice(i + marker.length)
  path = decodeURIComponent(path.replace(/^\/+/, ''))

  // Contrôle du propriétaire par préfixe de chemin.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const service = await createServiceClient()
  const { data, error } = await service.storage
    .from(bucket)
    .createSignedUrl(path, 300) // 5 minutes

  if (error || !data) {
    return NextResponse.json({ error: 'Lien indisponible' }, { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl)
}
