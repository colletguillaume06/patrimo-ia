'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white">
            Propilot <span className="text-blue-400">AI</span>
          </span>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
          <h1 className="font-display font-semibold text-xl text-white text-center mb-1">
            Connexion
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Accédez à votre tableau de bord immobilier
          </p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="votre@email.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-bg-secondary border border-border text-white placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-bg-secondary border border-border text-white placeholder:text-text-tertiary text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
            />
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
            <p className="text-xs text-slate-400">Compte de test :</p>
            <p className="text-xs text-blue-400 font-mono mt-0.5">admin@propilot.ai / propilot2025</p>
          </div>

          <p className="text-center text-xs text-slate-600 mt-4">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
