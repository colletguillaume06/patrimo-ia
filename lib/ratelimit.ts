import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiter : 10 requêtes par minute par utilisateur (sliding window)
// Nécessite UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN dans .env.local
// Créez un compte gratuit sur https://console.upstash.com

let ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Upstash non configuré — rate limiting désactivé
    return null
  }
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'patrimo_rl',
    })
  }
  return ratelimit
}

/**
 * Vérifie le rate limit pour un identifiant (user_id ou IP).
 * Retourne null si OK, ou une Response 429 si limite dépassée.
 */
export async function checkRateLimit(identifier: string): Promise<Response | null> {
  const rl = getRatelimit()
  if (!rl) return null // Upstash non configuré → pas de limite

  const { success, limit, remaining, reset } = await rl.limit(identifier)

  if (!success) {
    return new Response(
      JSON.stringify({ error: 'Trop de requêtes, réessaie dans une minute.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': '60',
        },
      }
    )
  }

  return null
}
