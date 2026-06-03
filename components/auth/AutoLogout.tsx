'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000 // 2 heures d'inactivité

export function AutoLogout() {
  const supabase = createClient()
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await signOut()
      router.push('/login')
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    // ── Déconnexion à la fermeture de l'onglet/navigateur ──
    const handleBeforeUnload = () => {
      // Utilise sendBeacon pour garantir l'envoi avant fermeture
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && anonKey) {
        navigator.sendBeacon(
          `${supabaseUrl}/auth/v1/logout`,
          JSON.stringify({})
        )
      }
      // Nettoyage local du storage Supabase
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
    }

    // ── Déconnexion quand l'onglet est masqué (changement d'app) ──
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Marquer le temps de sortie
        localStorage.setItem('patrimo_hidden_at', Date.now().toString())
      } else if (document.visibilityState === 'visible') {
        // Vérifier si l'utilisateur est parti longtemps
        const hiddenAt = localStorage.getItem('patrimo_hidden_at')
        if (hiddenAt) {
          const elapsed = Date.now() - parseInt(hiddenAt)
          if (elapsed > INACTIVITY_TIMEOUT) {
            signOut().then(() => router.push('/login'))
          }
          localStorage.removeItem('patrimo_hidden_at')
        }
      }
    }

    // ── Timer d'inactivité (reset sur chaque action) ──
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Démarrer le timer
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
